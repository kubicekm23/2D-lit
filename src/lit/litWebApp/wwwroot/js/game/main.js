import { initWebGL } from './renderer/webgl.js';
import { initInput, wasPressed, clearFrameInput } from './engine/input.js';
import { initBackground } from './renderer/backgroundRenderer.js';
import { initShip } from './renderer/shipRenderer.js';
import { initStations } from './renderer/stationRenderer.js';
import { initPlanets } from './renderer/planetRenderer.js';
import { initHud } from './renderer/hudRenderer.js';
import { startGameLoop, setOverlayActive } from './engine/gameLoop.js';
import { worldState, loadWorld } from './world/worldState.js';
import { playerState, loadPlayer, getSpeed } from './world/playerState.js';
import { setWorldBounds, AUTOSAVE_INTERVAL, ATC_RANGE } from './utils/constants.js';
import { distance } from './utils/math.js';
import * as api from './api/client.js';
import { initStationUI, openStation, closeStation, isOpen as isStationOpen } from './ui/stationUI.js';
import { initMap, openMap, closeMap, isMapOpen } from './ui/mapUI.js';
import { initStrandedUI, openStranded, isStrandedOpen } from './ui/strandedUI.js';
import { initDockingMinigame, openDockingMinigame, closeDockingMinigame, isDockingOpen } from './ui/dockingMinigame.js';
import { initPauseMenu, openPauseMenu, closePauseMenu, isPauseOpen } from './ui/pauseMenu.js';
import { initATC, showATC, hideATC } from './ui/atcUI.js';
import { getNearestStation } from './renderer/hudRenderer.js';

async function init() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('No canvas found');
        return;
    }

    // 1. Init WebGL context first (critical for all other renderers)
    initWebGL(canvas);

    // 2. Load game data from server
    console.log('Loading game data...');
    const [worldData, playerData] = await Promise.all([
        api.getWorld(),
        api.getPlayer(),
    ]);

    if (!worldData || !playerData) {
        throw new Error('Server returned invalid data');
    }
    console.log('Data loaded. World stations:', worldData.stations?.length);

    loadWorld(worldData);
    loadPlayer(playerData);
    setWorldBounds(worldData.minX, worldData.maxX, worldData.minY, worldData.maxY);

    // 3. Init Renderers and UI
    console.log('Initializing renderers...');
    try {
        initBackground();
        initShip();
        initStations();
        initPlanets();
        initInput();
        initHud();
        initStationUI();
        initMap();
        initStrandedUI();
        initDockingMinigame(handleDockSuccess, handleShipDestroyed);
        initPauseMenu();
        initATC();
    } catch (err) {
        console.error('Renderer init failed:', err);
        throw new Error('Graphics initialization failed: ' + err.message);
    }

    // Auto-save timer
    let saveTimer = 0;

    // If player starts docked, snap position to station and open station UI
    if (playerState.isDocked && playerState.dockedStationId) {
        const sid = parseInt(playerState.dockedStationId);
        const dockedStation = worldState.stations.find(s => s.id === sid);
        if (dockedStation) {
            console.log('Player is docked at:', dockedStation.name);
            playerState.ship.x = dockedStation.x;
            playerState.ship.y = dockedStation.y;
            playerState.ship.vx = 0;
            playerState.ship.vy = 0;
        } else {
            console.warn('Docked station not found in world data:', sid);
        }
        await openStation(sid);
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

        // ATC Notification and Docking logic
        if (!playerState.isDocked && !isDockingOpen() && !isStrandedOpen() && !isStationOpen()) {
            const nearest = getNearestStation();
            let inRange = false;
            if (nearest) {
                const dist = distance(playerState.ship.x, playerState.ship.y, nearest.x, nearest.y);
                if (dist < ATC_RANGE) {
                    inRange = true;
                    showATC();
                    
                    if (wasPressed('KeyF')) {
                        hideATC();
                        setOverlayActive(true);
                        openDockingMinigame(nearest.id, nearest.name, nearest.hangarLimit);
                    }
                }
            }
            if (!inRange) {
                hideATC();
            }
        } else {
            hideATC();
        }

        // Escape - close overlays, abort docking, or open pause menu
        if (wasPressed('Escape')) {
            if (isPauseOpen()) {
                closePauseMenu();
            } else if (isDockingOpen()) {
                closeDockingMinigame();
                setOverlayActive(false);
            } else if (isMapOpen()) {
                closeMap();
            } else if (!isStationOpen() && !isStrandedOpen()) {
                autoSave();
                openPauseMenu();
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

        // Stranded or Destroyed check
        if (!playerState.isDocked && !isDockingOpen() && !isStrandedOpen()) {
            if (playerState.ship.hull <= 0) {
                handleShipDestroyed();
            } else if (playerState.ship.fuel <= 0) {
                const speed = getSpeed();
                if (speed < 5) {
                    openStranded();
                }
            }
        }
    });
}

function handleShipDestroyed() {
    setOverlayActive(false);
    playerState.ship.hull = 0;
    autoSave();
    openStranded();
}

async function handleDockSuccess(stationId) {
    setOverlayActive(false);
    const ship = playerState.ship;
    try {
        await api.dock(stationId, {
            x: ship.x, y: ship.y, rotation: ship.rotation,
            vx: ship.vx, vy: ship.vy, fuel: ship.fuel, hull: ship.hull,
        });
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
        const data = JSON.stringify({
            x: ship.x, y: ship.y, rotation: ship.rotation,
            vx: ship.vx, vy: ship.vy, fuel: ship.fuel, hull: ship.hull,
        });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/game/save', blob);
    }
});

// Start
init().catch(e => {
    console.error('Game init failed:', e);
    const msg = String(e.message || e).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Courier New',monospace;">
        <div style="text-align:center;max-width:400px;padding:40px;border:1px solid #ccc;">
            <h2 style="letter-spacing:3px;margin-bottom:16px;">LOAD FAILED</h2>
            <p style="color:#888;font-size:13px;margin-bottom:6px;">${msg}</p>
            <p style="color:#aaa;font-size:11px;margin-bottom:20px;">Check the browser console for details.</p>
            <button onclick="location.reload()" style="padding:10px 28px;border:1px solid #000;background:#fff;font-family:inherit;font-size:13px;cursor:pointer;letter-spacing:1px;margin:4px;">RETRY</button>
            <button onclick="location.href='/Auth/Logout'" style="padding:10px 28px;border:1px solid #c00;color:#c00;background:#fff;font-family:inherit;font-size:13px;cursor:pointer;letter-spacing:1px;margin:4px;">LOGOUT</button>
        </div>
    </div>`;
});
