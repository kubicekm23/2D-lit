import { getSpeedFraction } from '../world/playerState.js';

export const camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    width: 0,
    height: 0,
};

export function updateCamera(playerState, canvas) {
    camera.x = playerState.ship.x;
    camera.y = playerState.ship.y;
    camera.width = canvas.width;
    camera.height = canvas.height;

    // Zoom out when going fast, zoom in when slow
    const sf = getSpeedFraction();
    const targetZoom = 1.0 - sf * 0.55; // 1.0 at rest, 0.45 at max speed
    camera.zoom += (targetZoom - camera.zoom) * 0.04;
}

// Convert world coordinates to screen (clip) coordinates for WebGL (-1 to 1)
export function worldToClip(wx, wy) {
    const sx = (wx - camera.x) * camera.zoom / (camera.width * 0.5);
    const sy = (wy - camera.y) * camera.zoom / (camera.height * 0.5);
    return [sx, sy];
}

// Convert world coordinates to canvas pixel coordinates
export function worldToScreen(wx, wy) {
    const sx = (wx - camera.x) * camera.zoom + camera.width * 0.5;
    const sy = -(wy - camera.y) * camera.zoom + camera.height * 0.5;
    return [sx, sy];
}

export function screenToWorld(sx, sy) {
    const wx = (sx - camera.width * 0.5) / camera.zoom + camera.x;
    const wy = -(sy - camera.height * 0.5) / camera.zoom + camera.y;
    return [wx, wy];
}
