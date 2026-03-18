import * as api from '../api/client.js';
import { worldState } from '../world/worldState.js';
import { playerState, getMaxRange } from '../world/playerState.js';

let overlay, canvas, ctx, detailsPanel;
let isOpen = false;
let mapData = []; // visited stations from server
let panX = 0, panY = 0, zoom = 1;
let dragging = false, lastMouse = { x: 0, y: 0 };

export function initMap() {
    overlay = document.getElementById('map-overlay');
    canvas = document.getElementById('map-canvas');
    detailsPanel = document.getElementById('map-details');
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
    if (detailsPanel) detailsPanel.style.display = 'none';
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

function worldToMap(wx, wy) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const worldW = worldState.maxX - worldState.minX;
    const worldH = worldState.maxY - worldState.minY;
    const baseScale = Math.min(w / worldW, h / worldH) * 0.85;
    const scale = baseScale * zoom;

    return [
        cx + (wx - playerState.ship.x + panX) * scale,
        cy - (wy - playerState.ship.y + panY) * scale,
    ];
}

function drawMap() {
    if (!ctx || !isOpen) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    // World boundary
    const [bx0, by0] = worldToMap(worldState.minX, worldState.maxY);
    const [bx1, by1] = worldToMap(worldState.maxX, worldState.minY);
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);

    // Max Range Circle
    const range = getMaxRange();
    if (range > 0) {
        const [rx, ry] = worldToMap(playerState.lastDockedLocation.x, playerState.lastDockedLocation.y);
        const worldW = worldState.maxX - worldState.minX;
        const worldH = worldState.maxY - worldState.minY;
        const baseScale = Math.min(w / worldW, h / worldH) * 0.85;
        const screenRange = range * baseScale * zoom;

        ctx.beginPath();
        ctx.arc(rx, ry, screenRange, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 0, 0, 0.6)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Curved text "MAXIMUM RANGE"
        drawCurvedText("MAXIMUM RANGE", rx, ry, screenRange + 5, -Math.PI / 2);
    }

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
    ctx.fillText('M - Close Map | Scroll to zoom | Drag to pan | Click station for info', 10, h - 10);
}

function drawCurvedText(str, x, y, radius, startAngle) {
    ctx.save();
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(200, 0, 0, 0.8)';
    ctx.textAlign = 'center';
    
    // Spread letters slightly
    const totalAngle = str.length * 0.08;
    let currentAngle = startAngle - totalAngle / 2;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        ctx.save();
        ctx.translate(
            x + Math.cos(currentAngle) * radius,
            y + Math.sin(currentAngle) * radius
        );
        ctx.rotate(currentAngle + Math.PI / 2);
        ctx.fillText(char, 0, 0);
        ctx.restore();
        currentAngle += 0.08;
    }
    ctx.restore();
}

function onClick(e) {
    if (dragging && (Math.abs(e.clientX - lastMouse.x) > 5 || Math.abs(e.clientY - lastMouse.y) > 5)) {
        return; // Don't click when dragging
    }

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Hit detection for all stations (not just visited, but details only for visited)
    let found = null;
    let minDist = 20;

    for (const st of worldState.stations) {
        const [sx, sy] = worldToMap(st.x, st.y);
        const dist = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2);
        if (dist < minDist) {
            found = st;
            minDist = dist;
        }
    }

    if (found) {
        showStationDetails(found);
    } else {
        if (detailsPanel) detailsPanel.style.display = 'none';
    }
}

function showStationDetails(st) {
    const data = playerState.visitedStations.get(st.id);
    if (!detailsPanel) return;

    const isTarget = playerState.targetStationId === st.id;

    let html = `
        <h3>${st.name}</h3>
        <p>Location: ${Math.round(st.x)}Ls, ${Math.round(st.y)}Ls</p>
        <button id="btn-map-target" class="tab-btn ${isTarget ? 'active' : ''}" style="width:100%; margin-bottom:10px;">
            ${isTarget ? 'DESTINATION SET' : 'SET DESTINATION'}
        </button>
    `;

    if (data) {
        const dateStr = new Date(data.visitedAt).toLocaleString();
        html += `
            <p>Last visited: ${dateStr}</p>
            <div class="map-details-section">
                <h4>Market Data (Cached)</h4>
                ${data.cachedGoods.length === 0 ? '<p>No data</p>' : `
                    <ul>
                        ${data.cachedGoods.map(g => `
                            <li><span>${g.name}</span> <span>${g.price} CR</span></li>
                        `).join('')}
                    </ul>
                `}
            </div>
            <div class="map-details-section">
                <h4>Shipyard Data (Cached)</h4>
                ${data.cachedShips.length === 0 ? '<p>No data</p>' : `
                    <ul>
                        ${data.cachedShips.map(s => `
                            <li><span>${s.name}</span> <span>${s.price.toLocaleString()} CR</span></li>
                        `).join('')}
                    </ul>
                `}
            </div>
        `;
    } else {
        html += `<p style="font-style:italic;">No data available. Visit station to update logs.</p>`;
    }

    detailsPanel.innerHTML = html;
    detailsPanel.style.display = 'block';

    const targetBtn = document.getElementById('btn-map-target');
    targetBtn.addEventListener('click', () => {
        if (playerState.targetStationId === st.id) {
            playerState.targetStationId = null;
        } else {
            playerState.targetStationId = st.id;
        }
        showStationDetails(st);
    });
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
    canvas.addEventListener('click', onClick);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function removeMapListeners() {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}
