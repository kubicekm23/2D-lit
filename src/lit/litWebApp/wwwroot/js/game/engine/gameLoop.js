import { resizeCanvas, getGL } from '../renderer/webgl.js';
import { updatePhysics } from './physics.js';
import { updateCamera, camera } from './camera.js';
import { clearFrameInput } from './input.js';
import { renderBackground } from '../renderer/backgroundRenderer.js';
import { renderShip } from '../renderer/shipRenderer.js';
import { renderStations } from '../renderer/stationRenderer.js';
import { updateHud } from '../renderer/hudRenderer.js';
import { playerState, getSpeedFraction } from '../world/playerState.js';
import { worldState } from '../world/worldState.js';
import { isDockingOpen } from '../ui/dockingMinigame.js';

let lastTime = 0;
let canvas = null;
let running = false;
let onFrameCallback = null;

export function startGameLoop(canvasEl, onFrame) {
    canvas = canvasEl;
    running = true;
    onFrameCallback = onFrame;
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

export function stopGameLoop() {
    running = false;
}

function loop(timestamp) {
    if (!running) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;

    resizeCanvas(canvas);

    // Don't update physics when docked or in docking minigame
    if (!playerState.isDocked && !isDockingOpen()) {
        updatePhysics(dt);
    }

    updateCamera(playerState, canvas);

    // Render
    const gl = getGL();
    gl.clear(gl.COLOR_BUFFER_BIT);

    renderBackground(camera, playerState, getSpeedFraction());
    renderStations(camera, worldState, playerState);

    if (!playerState.isDocked && !isDockingOpen()) {
        renderShip(camera, playerState);
    }

    if (!isDockingOpen()) {
        updateHud(playerState, worldState);
    }

    if (onFrameCallback) onFrameCallback(dt);

    clearFrameInput();
    requestAnimationFrame(loop);
}
