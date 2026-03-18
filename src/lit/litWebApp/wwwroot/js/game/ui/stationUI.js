import * as api from '../api/client.js';
import { playerState, loadPlayer } from '../world/playerState.js';

let overlay = null;
let stationData = null;
let currentStationId = null;

export function initStationUI() {
    overlay = document.getElementById('station-overlay');
}

export async function openStation(stationId) {
    currentStationId = stationId;

    try {
        stationData = await api.getStation(stationId);
    } catch (e) {
        console.error('Failed to load station:', e);
        return;
    }

    playerState.isDocked = true;
    playerState.dockedStationId = stationId;

    renderStationUI();
    overlay.style.display = 'flex';
}

export function closeStation() {
    overlay.style.display = 'none';
    stationData = null;
    currentStationId = null;
}

export function isOpen() {
    return overlay && overlay.style.display !== 'none';
}

function renderStationUI() {
    if (!stationData) return;

    const ship = playerState.ship;
    const fuelPct = ship.type.maxFuel > 0 ? (ship.fuel / ship.type.maxFuel * 100) : 0;

    overlay.innerHTML = `
        <div class="station-panel">
            <div class="station-header">
                <h2>${stationData.name}</h2>
                <span>Credits: ${playerState.credits.toLocaleString()} CR</span>
            </div>
            <div class="station-tabs">
                <button class="tab-btn active" data-tab="market">Market</button>
                <button class="tab-btn" data-tab="shipyard">Shipyard</button>
                <button class="tab-btn" data-tab="services">Services</button>
            </div>
            <div class="station-content" id="station-tab-content">
                ${renderMarketTab()}
            </div>
            <div class="station-footer">
                <button id="btn-launch" class="btn-launch">Launch</button>
            </div>
        </div>
    `;

    // Tab switching
    overlay.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            overlay.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const content = document.getElementById('station-tab-content');
            switch (btn.dataset.tab) {
                case 'market': content.innerHTML = renderMarketTab(); break;
                case 'shipyard': content.innerHTML = renderShipyardTab(); break;
                case 'services': content.innerHTML = renderServicesTab(); break;
            }
            bindTabEvents(btn.dataset.tab);
        });
    });

    bindTabEvents('market');

    document.getElementById('btn-launch').addEventListener('click', handleLaunch);
}

function renderMarketTab() {
    const goods = stationData.goods || [];
    const cargo = playerState.ship.cargo || [];

    return `
        <div class="market-grid">
            <div class="market-section">
                <h4>Buy Goods</h4>
                <table class="market-table">
                    <tr><th>Commodity</th><th>Price</th><th></th></tr>
                    ${goods.map(g => `
                        <tr>
                            <td>${g.name}</td>
                            <td>${g.price} CR</td>
                            <td>
                                <input type="number" min="1" value="1" class="qty-input" data-cargo="${g.cargoTypeId}" data-action="buy" />
                                <button class="btn-trade" data-cargo="${g.cargoTypeId}" data-action="buy">Buy</button>
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>
            <div class="market-section">
                <h4>Your Cargo</h4>
                ${cargo.length === 0 ? '<p>Empty</p>' : `
                <table class="market-table">
                    <tr><th>Commodity</th><th>Qty</th><th>Sell Price</th><th></th></tr>
                    ${cargo.map(c => {
                        const stPrice = goods.find(g => g.cargoTypeId === c.cargoTypeId);
                        return `
                        <tr>
                            <td>${c.name}</td>
                            <td>${c.quantity}</td>
                            <td>${stPrice ? stPrice.price + ' CR' : 'N/A'}</td>
                            <td>
                                <input type="number" min="1" max="${c.quantity}" value="${c.quantity}" class="qty-input" data-cargo="${c.cargoTypeId}" data-action="sell" />
                                <button class="btn-trade" data-cargo="${c.cargoTypeId}" data-action="sell">Sell</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </table>`}
            </div>
        </div>
    `;
}

function renderShipyardTab() {
    const ships = stationData.shipsForSale || [];
    const currentType = playerState.ship.type;

    return `
        <div class="shipyard-grid">
            <div class="current-ship">
                <h4>Your Ship: ${currentType.name}</h4>
                <p>Cargo: ${currentType.cargoHold} | Speed: ${currentType.maxSpeed} | Fuel: ${currentType.maxFuel}</p>
            </div>
            <div class="ships-list">
                ${ships.map(s => `
                    <div class="ship-card ${s.id === currentType.id ? 'owned' : ''}">
                        <h5>${s.name}</h5>
                        <p>${s.description}</p>
                        <div class="ship-stats">
                            <span>Cargo: ${s.cargoHold}</span>
                            <span>Speed: ${s.maxSpeed}</span>
                            <span>Fuel: ${s.maxFuel}</span>
                            <span>Thrust: ${s.thrustPower}</span>
                        </div>
                        <div class="ship-price">
                            ${s.id === currentType.id
                                ? '<em>Current Ship</em>'
                                : `<button class="btn-buy-ship" data-type="${s.id}">${s.price.toLocaleString()} CR</button>`
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderServicesTab() {
    const ship = playerState.ship;
    const fuelNeeded = ship.type.maxFuel - ship.fuel;
    const fuelCost = Math.ceil(fuelNeeded * 5);
    const hullDamage = 100 - Math.round(ship.hull);
    const repairCost = Math.ceil(hullDamage * 2);

    return `
        <div class="services-section">
            <h4>Refuel</h4>
            <p>Fuel: ${Math.round(ship.fuel)} / ${ship.type.maxFuel}</p>
            <p>Cost: ${fuelCost} CR</p>
            <button id="btn-refuel" ${fuelNeeded <= 0 ? 'disabled' : ''}>
                ${fuelNeeded <= 0 ? 'Tank Full' : 'Refuel'}
            </button>
        </div>
        <div class="services-section">
            <h4>Repair Hull</h4>
            <p>Hull: ${Math.round(ship.hull)}% ${ship.hull < 50 ? '- CRITICAL' : ship.hull < 80 ? '- Damaged' : ''}</p>
            <p>Cost: ${repairCost} CR</p>
            <button id="btn-repair" ${hullDamage <= 0 ? 'disabled' : ''}>
                ${hullDamage <= 0 ? 'Hull Intact' : 'Repair'}
            </button>
        </div>
        <div class="services-section" style="border-top: 1px solid #eee; margin-top: 20px; padding-top: 20px;">
            <h4>Emergency Services</h4>
            <p style="font-size: 12px; color: #666;">If you are unable to proceed, you can abandon this ship and be recovered at the nearest station.</p>
            <button id="btn-abandon-ship" class="pause-btn-danger" style="margin-top: 10px;">Abandon Ship</button>
        </div>
    `;
}

function bindTabEvents(tab) {
    if (tab === 'market') {
        overlay.querySelectorAll('.btn-trade').forEach(btn => {
            btn.addEventListener('click', async () => {
                const cargoId = parseInt(btn.dataset.cargo);
                const action = btn.dataset.action;
                const input = overlay.querySelector(\`.qty-input[data-cargo="\${cargoId}"][data-action="\${action}"]\`);
                const qty = parseInt(input?.value || '1');

                try {
                    if (action === 'buy') {
                        const result = await api.buyCargo(currentStationId, cargoId, qty);
                        playerState.credits = result.credits;
                    } else {
                        const result = await api.sellCargo(currentStationId, cargoId, qty);
                        playerState.credits = result.credits;
                    }
                    // Refresh player data
                    const pd = await api.getPlayer();
                    loadPlayer(pd);
                    renderStationUI();
                } catch (e) {
                    alert(e.message);
                }
            });
        });
    }

    if (tab === 'shipyard') {
        overlay.querySelectorAll('.btn-buy-ship').forEach(btn => {
            btn.addEventListener('click', async () => {
                const typeId = parseInt(btn.dataset.type);
                try {
                    await api.buyShip(currentStationId, typeId);
                    const pd = await api.getPlayer();
                    loadPlayer(pd);
                    stationData = await api.getStation(currentStationId);
                    renderStationUI();
                } catch (e) {
                    alert(e.message);
                }
            });
        });
    }

    if (tab === 'services') {
        const refuelBtn = document.getElementById('btn-refuel');
        if (refuelBtn) {
            refuelBtn.addEventListener('click', async () => {
                try {
                    const result = await api.refuel(currentStationId);
                    playerState.credits = result.credits;
                    playerState.ship.fuel = result.fuel;
                    renderStationUI();
                } catch (e) {
                    alert(e.message);
                }
            });
        }

        const repairBtn = document.getElementById('btn-repair');
        if (repairBtn) {
            repairBtn.addEventListener('click', async () => {
                try {
                    const result = await api.repair(currentStationId);
                    playerState.credits = result.credits;
                    playerState.ship.hull = result.hull;
                    renderStationUI();
                } catch (e) {
                    alert(e.message);
                }
            });
        }

        const abandonBtn = document.getElementById('btn-abandon-ship');
        if (abandonBtn) {
            abandonBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to abandon ship? You will be transported to the nearest station.')) {
                    closeStation();
                    import('./strandedUI.js').then(m => m.openStranded());
                }
            });
        }
    }
}

async function handleLaunch() {
    try {
        await api.undock(currentStationId);
        playerState.isDocked = false;
        playerState.dockedStationId = null;
        closeStation();
    } catch (e) {
        alert(e.message);
    }
}
