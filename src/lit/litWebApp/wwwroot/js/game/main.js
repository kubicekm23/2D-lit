import { initWebGL } from './renderer/webgl.js';
import { initInput, wasPressed, clearFrameInput } from './engine/input.js';
import { initBackground } from './renderer/backgroundRenderer.js';
import { initShip } from './renderer/shipRenderer.js';
import { initStations } from './renderer/stationRenderer.js';
import { initHud } from './renderer/hudRenderer.js';
import { startGameLoop } from './engine/gameLoop.js';
import { worldState, loadWorld } from './world/worldState.js';
import { playerState, loadPlayer, getSpeed } from './world/playerState.js';
import { setWorldBounds, AUTOSAVE_INTERVAL, ATC_RANGE, LANDING_RANGE, LANDING_MAX_SPEED } from './utils/constants.js';
import { distance } from './utils/math.js';
import * as api from './api/client.js';
import { initStationUI, openStation, closeStation, isOpen as isStationOpen } from './ui/stationUI.js';
import { initMap, openMap, closeMap, isMapOpen } from './ui/mapUI.js';
import { initStrandedUI, openStranded, isStrandedOpen } from './ui/strandedUI.js';
import { initDockingMinigame, openDockingMinigame, closeDockingMinigame, isDockingOpen } from './ui/dockingMinigame.js';
import { getNearestStation } from './renderer/hudRenderer.js';

async function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('No canvas found');
        return;
    }

    // Load game data from server
    const [worldData, playerData] = await Promise.all([
        api.getWorld(),
        api.getPlayer(),
    ]);

    loadWorld(worldData);
    loadPlayer(playerData);
    setWorldBounds(worldData.minX, worldData.maxX, worldData.minY, worldData.maxY);

    // Init WebGL
    initWebGL(canvas);
    initBackground();
    initShip();
    initStations();
    initInput();
    initHud();
    initStationUI();
    initMap();
    initStrandedUI();
    initDockingMinigame(handleDockSuccess, handleShipDestroyed);

    // Auto-save timer
    let saveTimer = 0;

    // If player starts docked, open station UI
    if (playerState.isDocked && playerState.dockedStationId) {
        openStation(playerState.dockedStationId);
    }

    // Start game loop
    startGameLoop(canvas, (dt) => {
        // Auto-save
        if (!playerState.isDocked) {
            saveTimer += dt * 1000;
            if (saveTimer > AUTOSAVE_INTERVAL) {
                saveTimer = 0;
                autoSave();
            }
        }

        // Handle docking - press F in ATC range to request permission
        if (!playerState.isDocked && !isDockingOpen() && !isStrandedOpen() && wasPressed('KeyF')) {
            const nearest = getNearestStation();
            if (nearest) {
                const dist = distance(playerState.ship.x, playerState.ship.y, nearest.x, nearest.y);
                if (dist < ATC_RANGE) {
                    // Open docking minigame with permission request flow
                    openDockingMinigame(nearest.id, nearest.name, nearest.hangarLimit);
                }
            }
        }

        // Escape to close overlays / abort docking
        if (wasPressed('Escape')) {
            if (isDockingOpen()) {
                closeDockingMinigame();
            } else if (isMapOpen()) {
                closeMap();
            }
        }

        // Map toggle
        if (wasPressed('KeyM')) {
            if (isMapOpen()) {
                closeMap();
            } else if (!isStationOpen() && !isDockingOpen() && !isStrandedOpen()) {
                openMap();
            }
        }

        // Stranded check - fuel empty while flying
        if (!playerState.isDocked && !isDockingOpen() && !isStrandedOpen() &&
            playerState.ship.fuel <= 0) {
            const speed = getSpeed();
            // Show stranded UI when nearly stopped
            if (speed < 5) {
                openStranded();
            }
        }
    });
}

function handleShipDestroyed() {
    // Ship was destroyed during docking - save hull=0, then open stranded UI
    playerState.ship.hull = 0;
    autoSave();
    openStranded();
}

async function handleDockSuccess(stationId) {
    try {
        await api.dock(stationId);
        await autoSave();
        const pd = await api.getPlayer();
        loadPlayer(pd);
        openStation(stationId);
    } catch (e) {
        console.error('Dock failed:', e);
    }
}

async function autoSave() {
    const ship = playerState.ship;
    try {
        await api.savePosition({
            x: ship.x,
            y: ship.y,
            rotation: ship.rotation,
            vx: ship.vx,
            vy: ship.vy,
            fuel: ship.fuel,
            hull: ship.hull,
        });
    } catch (e) {
        console.error('Auto-save failed:', e);
    }
}

// Save on page unload
window.addEventListener('beforeunload', () => {
    if (!playerState.isDocked) {
        const ship = playerState.ship;
        navigator.sendBeacon('/api/game/save', JSON.stringify({
            x: ship.x, y: ship.y, rotation: ship.rotation,
            vx: ship.vx, vy: ship.vy, fuel: ship.fuel, hull: ship.hull,
        }));
    }
});

// Start
init().catch(e => console.error('Game init failed:', e));
