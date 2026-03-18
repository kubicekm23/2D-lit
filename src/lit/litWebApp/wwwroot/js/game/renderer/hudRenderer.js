import { distance } from '../utils/math.js';
import { ATC_RANGE } from '../utils/constants.js';
import { camera } from '../engine/camera.js';

let elements = {};
let nearestStation = null;
let hudCanvas = null;
let hudCtx = null;

export function initHud() {
    elements = {
        speed: document.getElementById('hud-speed'),
        fuel: document.getElementById('hud-fuel'),
        hull: document.getElementById('hud-hull'),
        credits: document.getElementById('hud-credits'),
        stationInfo: document.getElementById('hud-station'),
        coords: document.getElementById('hud-coords'),
    };
    hudCanvas = document.getElementById('hudCanvas');
    if (hudCanvas) hudCtx = hudCanvas.getContext('2d');
}

export function updateHud(playerState, worldState) {
    const ship = playerState.ship;
    
    // Reset HUD canvas
    if (hudCanvas && hudCtx) {
        const dpr = window.devicePixelRatio || 1;
        if (hudCanvas.width !== window.innerWidth * dpr) {
            hudCanvas.width = window.innerWidth * dpr;
            hudCanvas.height = window.innerHeight * dpr;
        }
        hudCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        hudCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    const maxSpeed = ship.type.maxSpeed;
    const fuelPct = ship.type.maxFuel > 0 ? (ship.fuel / ship.type.maxFuel * 100) : 0;

    if (elements.speed) {
        elements.speed.textContent = `SPD: ${Math.round(speed)} / ${Math.round(maxSpeed)}`;
    }

    if (elements.fuel) {
        elements.fuel.textContent = `FUEL: ${Math.round(fuelPct)}%`;
        elements.fuel.style.color = fuelPct < 20 ? '#c00' : '#000';
    }

    if (elements.hull) {
        const hull = Math.round(ship.hull);
        elements.hull.textContent = `HULL: ${hull}%`;
        elements.hull.style.color = hull < 30 ? '#c00' : hull < 60 ? '#960' : '#000';
    }

    if (elements.credits) {
        elements.credits.textContent = `CR: ${playerState.credits.toLocaleString()}`;
    }

    if (elements.coords) {
        elements.coords.textContent = `X:${Math.round(ship.x)} Y:${Math.round(ship.y)}`;
    }

    // Find nearest station
    let minDist = Infinity;
    nearestStation = null;
    for (const st of worldState.stations) {
        const d = distance(ship.x, ship.y, st.x, st.y);
        if (d < minDist) {
            minDist = d;
            nearestStation = st;
        }
    }

    if (elements.stationInfo) {
        if (nearestStation && minDist < ATC_RANGE) {
            elements.stationInfo.textContent = `${nearestStation.name} — ${Math.round(minDist)}Ls — [F] Request Docking`;
            elements.stationInfo.style.color = '#000';
            elements.stationInfo.style.display = '';
        } else if (nearestStation) {
            elements.stationInfo.textContent = `${nearestStation.name} — ${Math.round(minDist)}Ls`;
            elements.stationInfo.style.color = '#999';
            elements.stationInfo.style.display = '';
        } else {
            elements.stationInfo.textContent = '';
            elements.stationInfo.style.display = 'none';
        }
    }

    // Draw targeting arrow
    if (playerState.targetStationId) {
        const target = worldState.stations.find(s => s.id === playerState.targetStationId);
        if (target) {
            drawTargetArrow(playerState, target);
        }
    }
}

function drawTargetArrow(playerState, target) {
    if (!hudCtx) return;

    const ship = playerState.ship;
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Project target to screen
    const screenX = (target.x - camera.x) * camera.zoom + window.innerWidth / 2;
    const screenY = -(target.y - camera.y) * camera.zoom + window.innerHeight / 2;

    // Only draw arrow if target is off-screen
    const margin = 40;
    const isOffScreen = screenX < margin || screenX > window.innerWidth - margin ||
                       screenY < margin || screenY > window.innerHeight - margin;

    if (!isOffScreen) return;

    // Calculate edge intersection
    const angle = Math.atan2(target.y - ship.y, target.x - ship.x);
    // Invert Y for screen coords
    const screenAngle = Math.atan2(-(target.y - ship.y), target.x - ship.x);
    
    let arrowX = window.innerWidth / 2 + Math.cos(screenAngle) * 5000;
    let arrowY = window.innerHeight / 2 + Math.sin(screenAngle) * 5000;

    // Clamp to screen edges
    const hw = window.innerWidth / 2 - margin;
    const hh = window.innerHeight / 2 - margin;
    
    // Intersection with box
    const absCos = Math.abs(Math.cos(screenAngle));
    const absSin = Math.abs(Math.sin(screenAngle));
    
    let scale = 1;
    if (hw * absSin > hh * absCos) {
        scale = hh / absSin;
    } else {
        scale = hw / absCos;
    }
    
    arrowX = window.innerWidth / 2 + Math.cos(screenAngle) * scale;
    arrowY = window.innerHeight / 2 + Math.sin(screenAngle) * scale;

    // Draw arrow
    hudCtx.save();
    hudCtx.translate(arrowX, arrowY);
    hudCtx.rotate(screenAngle);

    hudCtx.beginPath();
    hudCtx.moveTo(0, 0);
    hudCtx.lineTo(-15, -8);
    hudCtx.lineTo(-15, 8);
    hudCtx.closePath();
    hudCtx.fillStyle = '#000';
    hudCtx.fill();

    // Draw target info
    hudCtx.rotate(-screenAngle);
    hudCtx.font = '12px "JetBrains Mono", monospace';
    hudCtx.textAlign = screenX < window.innerWidth / 2 ? 'left' : 'right';
    const textX = screenX < window.innerWidth / 2 ? 10 : -10;
    hudCtx.fillText(target.name, textX, -10);
    hudCtx.font = '10px "JetBrains Mono", monospace';
    hudCtx.fillText(`${Math.round(dist)}Ls`, textX, 5);

    hudCtx.restore();
}

export function getNearestStation() {
    return nearestStation;
}
