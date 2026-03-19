import { resizeCanvas, getGL } from '../renderer/webgl.js';
import { updatePhysics } from './physics.js';
import { updateCamera, camera } from './camera.js';
import { clearFrameInput } from './input.js';
import { renderBackground } from '../renderer/backgroundRenderer.js';
import { renderShip } from '../renderer/shipRenderer.js';
import { renderStations } from '../renderer/stationRenderer.js';
import { renderPlanets } from '../renderer/planetRenderer.js';
import { updateHud } from '../renderer/hudRenderer.js';
import { playerState, getSpeedFraction } from '../world/playerState.js';
import { worldState } from '../world/worldState.js';

let lastTime = 0;
let canvas = null;
let running = false;
let onFrameCallback = null;

// Flag set by main.js when docking minigame is active
let _overlayActive = false;
export function setOverlayActive(v) { _overlayActive = v; }

// Track render errors for debug overlay
export const _renderErrors = {};

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

    // Don't update physics when docked or in overlay
    if (!playerState.isDocked && !_overlayActive) {
        updatePhysics(dt);
    }

    updateCamera(playerState, canvas);

    // Render
    const gl = getGL();
    gl.clear(gl.COLOR_BUFFER_BIT);

    try {
        renderBackground(camera, playerState, getSpeedFraction());
    } catch (e) { if (!_renderErrors.bg) { _renderErrors.bg = e.message; console.error('renderBackground error:', e); } }

    try {
        renderPlanets(camera, worldState);
    } catch (e) { if (!_renderErrors.planet) { _renderErrors.planet = e.message; console.error('renderPlanets error:', e); } }

    try {
        renderStations(camera, worldState, playerState);
    } catch (e) { if (!_renderErrors.station) { _renderErrors.station = e.message; console.error('renderStations error:', e); } }

    if (!playerState.isDocked && !_overlayActive) {
        try {
            renderShip(camera, playerState);
        } catch (e) { if (!_renderErrors.ship) { _renderErrors.ship = e.message; console.error('renderShip error:', e); } }
    }

    if (!_overlayActive) {
        try {
            updateHud(playerState, worldState);
        } catch (e) { if (!_renderErrors.hud) { _renderErrors.hud = e.message; console.error('updateHud error:', e); } }
    }

    if (onFrameCallback) onFrameCallback(dt);

    clearFrameInput();
    requestAnimationFrame(loop);
}
