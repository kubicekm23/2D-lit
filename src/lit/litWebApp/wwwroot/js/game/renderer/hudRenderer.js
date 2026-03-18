import { distance } from '../utils/math.js';
import { ATC_RANGE } from '../utils/constants.js';

let elements = {};
let nearestStation = null;

export function initHud() {
    elements = {
        speed: document.getElementById('hud-speed'),
        fuel: document.getElementById('hud-fuel'),
        hull: document.getElementById('hud-hull'),
        credits: document.getElementById('hud-credits'),
        stationInfo: document.getElementById('hud-station'),
        coords: document.getElementById('hud-coords'),
    };
}

export function updateHud(playerState, worldState) {
    const ship = playerState.ship;
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
            elements.stationInfo.textContent = `${nearestStation.name} — ${Math.round(minDist)}u — [F] Request Docking`;
            elements.stationInfo.style.color = '#000';
        } else if (nearestStation) {
            elements.stationInfo.textContent = `${nearestStation.name} — ${Math.round(minDist)}u`;
            elements.stationInfo.style.color = '#999';
        } else {
            elements.stationInfo.textContent = '';
        }
    }
}

export function getNearestStation() {
    return nearestStation;
}
