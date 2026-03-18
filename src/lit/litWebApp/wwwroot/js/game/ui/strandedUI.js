import * as api from '../api/client.js';
import { playerState, loadPlayer } from '../world/playerState.js';
import { openStation } from './stationUI.js';

let overlay = null;
let shown = false;
let onRespawnCallback = null;

export function initStrandedUI(onRespawn) {
    overlay = document.getElementById('stranded-overlay');
    onRespawnCallback = onRespawn;
}

export function isStrandedOpen() {
    return shown;
}

export function openStranded() {
    if (!overlay || shown) return;
    shown = true;
    renderStranded();
    overlay.style.display = 'flex';
}

export function closeStranded() {
    if (!overlay) return;
    shown = false;
    overlay.style.display = 'none';
}

function renderStranded() {
    const ownedShips = playerState.ownedShips.filter(s => !s.isActive);

    overlay.innerHTML = `
        <div class="stranded-panel">
            <div class="stranded-header">
                <h2>STRANDED</h2>
                <p>Your ship has run out of fuel and you are adrift in space.</p>
                <p class="stranded-coords">Location: X:${Math.round(playerState.ship.x)} Y:${Math.round(playerState.ship.y)}</p>
            </div>
            <div class="stranded-content">
                <h4>Abandon Ship</h4>
                <p>You will be transported to the nearest station.</p>
                ${ownedShips.length > 0 ? `
                    <div class="stranded-ships">
                        <p>Switch to one of your other ships:</p>
                        ${ownedShips.map(s => `
                            <button class="btn-respawn-ship" data-ship-id="${s.id}">
                                ${s.name} (${s.typeName})
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="stranded-current">
                    <button id="btn-respawn-current">Respawn current ship at nearest station</button>
                </div>
            </div>
        </div>
    `;

    // Bind events
    overlay.querySelectorAll('.btn-respawn-ship').forEach(btn => {
        btn.addEventListener('click', () => handleRespawn(parseInt(btn.dataset.shipId)));
    });

    const currentBtn = document.getElementById('btn-respawn-current');
    if (currentBtn) {
        currentBtn.addEventListener('click', () => handleRespawn(null));
    }
}

async function handleRespawn(shipId) {
    try {
        const result = await api.respawn(shipId);
        const pd = await api.getPlayer();
        loadPlayer(pd);
        closeStranded();

        // Open station UI if docked
        if (result.stationId && playerState.isDocked) {
            openStation(result.stationId);
        }

        if (onRespawnCallback) onRespawnCallback();
    } catch (e) {
        alert('Respawn failed: ' + e.message);
    }
}
