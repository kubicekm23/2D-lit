import * as api from '../api/client.js';
import { worldState } from '../world/worldState.js';
import { playerState } from '../world/playerState.js';

let overlay, canvas, ctx;
let isOpen = false;
let mapData = []; // visited stations from server
let panX = 0, panY = 0, zoom = 1;
let dragging = false, lastMouse = { x: 0, y: 0 };

export function initMap() {
    overlay = document.getElementById('map-overlay');
    canvas = document.getElementById('map-canvas');
    if (canvas) ctx = canvas.getContext('2d');
}

export async function openMap() {
    if (!overlay || !canvas || !ctx) return;

    try {
        mapData = await api.getMap() || [];
        playerState.visitedStations.clear();
        for (const v of mapData) {
            playerState.visitedStations.set(v.stationId, v);
        }
    } catch (e) {
        console.error('Failed to load map:', e);
    }

    isOpen = true;
    overlay.style.display = 'flex';

    // Center on player
    panX = 0;
    panY = 0;
    zoom = 1;

    resizeMap();
    drawMap();
    addMapListeners();
}

export function closeMap() {
    isOpen = false;
    overlay.style.display = 'none';
    removeMapListeners();
}

export function isMapOpen() {
    return isOpen;
}

function resizeMap() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function drawMap() {
    if (!ctx || !isOpen) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Scale: map world bounds to canvas
    const worldW = worldState.maxX - worldState.minX;
    const worldH = worldState.maxY - worldState.minY;
    const baseScale = Math.min(w / worldW, h / worldH) * 0.85;
    const scale = baseScale * zoom;

    function worldToMap(wx, wy) {
        return [
            cx + (wx - playerState.ship.x + panX) * scale,
            cy - (wy - playerState.ship.y + panY) * scale,
        ];
    }

    // World boundary
    const [bx0, by0] = worldToMap(worldState.minX, worldState.maxY);
    const [bx1, by1] = worldToMap(worldState.maxX, worldState.minY);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);

    // Draw all stations
    const visitedIds = new Set(mapData.map(v => v.stationId));

    for (const st of worldState.stations) {
        const [sx, sy] = worldToMap(st.x, st.y);
        const visited = visitedIds.has(st.id);

        ctx.beginPath();
        ctx.arc(sx, sy, visited ? 6 : 4, 0, Math.PI * 2);

        if (visited) {
            ctx.fillStyle = '#222';
            ctx.fill();
            ctx.font = '11px monospace';
            ctx.fillStyle = '#333';
            ctx.fillText(st.name, sx + 10, sy + 4);
        } else {
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Player position
    const [px, py] = worldToMap(playerState.ship.x, playerState.ship.y);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#c00';
    ctx.fill();

    // Legend
    ctx.font = '12px monospace';
    ctx.fillStyle = '#000';
    ctx.fillText('M - Close Map | Scroll to zoom | Drag to pan', 10, h - 10);
}

function onWheel(e) {
    e.preventDefault();
    zoom *= e.deltaY < 0 ? 1.15 : 0.87;
    zoom = Math.max(0.3, Math.min(5, zoom));
    drawMap();
}

function onMouseDown(e) {
    dragging = true;
    lastMouse = { x: e.clientX, y: e.clientY };
}

function onMouseMove(e) {
    if (!dragging) return;
    const worldW = worldState.maxX - worldState.minX;
    const baseScale = Math.min(canvas.width / worldW, canvas.height / worldW) * 0.85 * zoom;
    panX += (e.clientX - lastMouse.x) / baseScale;
    panY -= (e.clientY - lastMouse.y) / baseScale;
    lastMouse = { x: e.clientX, y: e.clientY };
    drawMap();
}

function onMouseUp() {
    dragging = false;
}

function addMapListeners() {
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function removeMapListeners() {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}
