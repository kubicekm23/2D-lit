import { input } from '../engine/input.js';
import { playerState } from '../world/playerState.js';

let overlay = null;
let canvas = null;
let ctx = null;
let active = false;
let animFrame = null;
let onDockSuccess = null;
let onShipDestroyed = null;
let stationId = null;
let stationName = '';
let totalBays = 8;
let assignedBay = 0;

// Station cross-section dimensions
const STATION_W = 750;
const STATION_H = 400;
const WALL_THICK = 45;
const ENTRANCE_H = 80;
const BAY_W = 60;
const BAY_H = 45;
const BAY_MARGIN = 8;

// Player ship in minigame
let ship = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    rotation: 0,
    thrust: 120,
    turnRate: 3.0,
    maxSpeed: 100,
    size: 10,
};

// Crash/damage state
let crashCount = 0;
let crashFlashTimer = 0;
let hullDisplay = 100;
const CRASH_SPEED_THRESHOLD = 25; // speed above this = a crash
const CRASH_DAMAGE = 35; // hull damage per crash

// AI ships
let aiShips = [];
const AI_SPEED = 35;
const AI_COUNT = 4;

// Station position (centered on canvas)
let stX = 0, stY = 0;

// Bay layout: floor bays + ceiling bays
let floorBayCount = 0;
let ceilBayCount = 0;

// Phase: 'requesting' | 'granted' | 'flying' | 'docked' | 'destroyed'
let phase = 'requesting';
let phaseTimer = 0;
let dockTimer = 0;
const DOCK_HOLD_TIME = 1.5;

export function initDockingMinigame(onSuccess, onDestroy) {
    overlay = document.getElementById('docking-overlay');
    canvas = document.getElementById('docking-canvas');
    if (canvas) ctx = canvas.getContext('2d');
    onDockSuccess = onSuccess;
    onShipDestroyed = onDestroy;
}

export function isDockingOpen() {
    return active;
}

export function openDockingMinigame(sid, sname, hangarLim) {
    if (!overlay || !canvas || !ctx) return;
    stationId = sid;
    stationName = sname || 'Station';

    // More bays - split between floor and ceiling (centrifuge station)
    totalBays = Math.max(6, Math.min(hangarLim || 8, 16));
    floorBayCount = Math.ceil(totalBays / 2);
    ceilBayCount = totalBays - floorBayCount;
    assignedBay = Math.floor(Math.random() * totalBays);

    // Reset ship
    resizeCanvas();
    stX = canvas.clientWidth / 2 - STATION_W / 2;
    stY = canvas.clientHeight / 2 - STATION_H / 2;

    const entranceY = stY + STATION_H / 2 - ENTRANCE_H / 2;
    ship.x = stX - 80;
    ship.y = entranceY + ENTRANCE_H / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.rotation = 0;

    // Reset damage state
    crashCount = 0;
    crashFlashTimer = 0;
    hullDisplay = playerState.ship.hull;

    spawnAIShips();

    phase = 'requesting';
    phaseTimer = 0;
    dockTimer = 0;

    active = true;
    overlay.style.display = 'block';
    lastTime = performance.now();
    animFrame = requestAnimationFrame(loop);
}

export function closeDockingMinigame() {
    active = false;
    overlay.style.display = 'none';
    if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
    }
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

let lastTime = 0;

function loop(timestamp) {
    if (!active) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    resizeCanvas();
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    stX = cw / 2 - STATION_W / 2;
    stY = ch / 2 - STATION_H / 2;

    update(dt, cw, ch);
    draw(cw, ch);

    animFrame = requestAnimationFrame(loop);
}

function update(dt, cw, ch) {
    phaseTimer += dt;
    if (crashFlashTimer > 0) crashFlashTimer -= dt;

    if (phase === 'requesting') {
        if (phaseTimer > 2.0) {
            phase = 'granted';
            phaseTimer = 0;
        }
        return;
    }

    if (phase === 'granted') {
        if (phaseTimer > 2.0) {
            phase = 'flying';
            phaseTimer = 0;
        }
        return;
    }

    if (phase === 'docked' || phase === 'destroyed') return;

    // Flying phase - player controls
    if (input.left) ship.rotation -= ship.turnRate * dt;
    if (input.right) ship.rotation += ship.turnRate * dt;

    if (input.up) {
        ship.vx += Math.cos(ship.rotation) * ship.thrust * dt;
        ship.vy += Math.sin(ship.rotation) * ship.thrust * dt;
    }
    if (input.down) {
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > 0) {
            const decel = Math.min(ship.thrust * 0.8 * dt, speed);
            const factor = (speed - decel) / speed;
            ship.vx *= factor;
            ship.vy *= factor;
        }
    }

    // Speed cap
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.maxSpeed) {
        ship.vx *= ship.maxSpeed / speed;
        ship.vy *= ship.maxSpeed / speed;
    }

    // Position update
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // Wall collision with crash detection
    const preSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    const collided = resolveWallCollision();
    if (collided && preSpeed > CRASH_SPEED_THRESHOLD) {
        handleCrash();
        if (phase === 'destroyed') return;
    }

    // AI collision
    checkAICollision();

    // Keep ship on screen
    ship.x = Math.max(10, Math.min(cw - 10, ship.x));
    ship.y = Math.max(10, Math.min(ch - 10, ship.y));

    // Check if in assigned bay
    const bay = getBayRect(assignedBay);
    const shipSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (ship.x > bay.x && ship.x < bay.x + bay.w &&
        ship.y > bay.y && ship.y < bay.y + bay.h &&
        shipSpeed < 15) {
        dockTimer += dt;
        if (dockTimer >= DOCK_HOLD_TIME) {
            phase = 'docked';
            phaseTimer = 0;
            // Apply hull to player state
            playerState.ship.hull = hullDisplay;
            setTimeout(() => {
                closeDockingMinigame();
                if (onDockSuccess) onDockSuccess(stationId);
            }, 1500);
        }
    } else {
        dockTimer = Math.max(0, dockTimer - dt * 2);
    }

    updateAI(dt, cw, ch);
}

function handleCrash() {
    crashCount++;
    crashFlashTimer = 0.5;
    hullDisplay = Math.max(0, hullDisplay - CRASH_DAMAGE);

    if (hullDisplay <= 0) {
        // Ship destroyed
        phase = 'destroyed';
        phaseTimer = 0;
        playerState.ship.hull = 0;
        setTimeout(() => {
            closeDockingMinigame();
            if (onShipDestroyed) onShipDestroyed();
        }, 2500);
    }
}

function checkAICollision() {
    const collisionDist = ship.size + 8; // ship.size + ai.size
    for (const ai of aiShips) {
        if (ai.state === 'outside') continue;
        const dx = ship.x - ai.x;
        const dy = ship.y - ai.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < collisionDist) {
            // Push apart
            const nx = dx / dist;
            const ny = dy / dist;
            ship.x = ai.x + nx * collisionDist;
            ship.y = ai.y + ny * collisionDist;

            const relSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
            ship.vx = nx * relSpeed * 0.5;
            ship.vy = ny * relSpeed * 0.5;

            if (relSpeed > CRASH_SPEED_THRESHOLD) {
                handleCrash();
            }
        }
    }
}

// Returns bay index 0..floorBayCount-1 for floor, floorBayCount..totalBays-1 for ceiling
function getBayRect(bayIndex) {
    const innerLeft = stX + WALL_THICK;
    const innerW = STATION_W - 2 * WALL_THICK;

    if (bayIndex < floorBayCount) {
        // Floor bays (bottom wall, bays open upward)
        const count = floorBayCount;
        const totalW = count * (BAY_W + BAY_MARGIN) - BAY_MARGIN;
        const startX = innerLeft + (innerW - totalW) / 2;
        const y = stY + STATION_H - WALL_THICK - BAY_H;
        return {
            x: startX + bayIndex * (BAY_W + BAY_MARGIN),
            y: y,
            w: BAY_W,
            h: BAY_H,
            side: 'floor',
        };
    } else {
        // Ceiling bays (top wall, bays open downward)
        const ci = bayIndex - floorBayCount;
        const count = ceilBayCount;
        const totalW = count * (BAY_W + BAY_MARGIN) - BAY_MARGIN;
        const startX = innerLeft + (innerW - totalW) / 2;
        const y = stY + WALL_THICK;
        return {
            x: startX + ci * (BAY_W + BAY_MARGIN),
            y: y,
            w: BAY_W,
            h: BAY_H,
            side: 'ceiling',
        };
    }
}

function resolveWallCollision() {
    const s = ship.size;
    const innerLeft = stX + WALL_THICK;
    const innerRight = stX + STATION_W - WALL_THICK;
    const innerTop = stY + WALL_THICK;
    const innerBottom = stY + STATION_H - WALL_THICK;
    const entranceTop = stY + STATION_H / 2 - ENTRANCE_H / 2;
    const entranceBottom = stY + STATION_H / 2 + ENTRANCE_H / 2;
    let hit = false;

    const insideOuter = ship.x > stX && ship.x < stX + STATION_W &&
                        ship.y > stY && ship.y < stY + STATION_H;

    if (!insideOuter) return false;

    const insideInner = ship.x > innerLeft + s && ship.x < innerRight - s &&
                        ship.y > innerTop + s && ship.y < innerBottom - s;

    if (insideInner) return false;

    // Entrance gap check
    const inEntranceX = ship.x < innerLeft + s && ship.x > stX - s;
    const inEntranceY = ship.y > entranceTop + s && ship.y < entranceBottom - s;

    if (inEntranceX && inEntranceY) return false;

    // Wall collisions
    if (ship.x < innerLeft + s && ship.x > stX) {
        if (ship.y < entranceTop || ship.y > entranceBottom) {
            ship.x = innerLeft + s;
            ship.vx = Math.abs(ship.vx) * 0.3;
            hit = true;
        } else {
            if (ship.y < entranceTop + s) {
                ship.y = entranceTop + s;
                ship.vy = Math.abs(ship.vy) * 0.3;
                hit = true;
            }
            if (ship.y > entranceBottom - s) {
                ship.y = entranceBottom - s;
                ship.vy = -Math.abs(ship.vy) * 0.3;
                hit = true;
            }
        }
    }
    if (ship.x > innerRight - s && ship.x < stX + STATION_W) {
        ship.x = innerRight - s;
        ship.vx = -Math.abs(ship.vx) * 0.3;
        hit = true;
    }
    if (ship.y < innerTop + s && ship.y > stY) {
        ship.y = innerTop + s;
        ship.vy = Math.abs(ship.vy) * 0.3;
        hit = true;
    }
    if (ship.y > innerBottom - s && ship.y < stY + STATION_H) {
        ship.y = innerBottom - s;
        ship.vy = -Math.abs(ship.vy) * 0.3;
        hit = true;
    }

    return hit;
}

function spawnAIShips() {
    aiShips = [];
    const usedBays = new Set([assignedBay]);
    for (let i = 0; i < AI_COUNT; i++) {
        let bay;
        let attempts = 0;
        do {
            bay = Math.floor(Math.random() * totalBays);
            attempts++;
        } while (usedBays.has(bay) && attempts < 20);
        if (usedBays.has(bay)) continue;
        usedBays.add(bay);

        const bayRect = getBayRect(bay);
        aiShips.push({
            x: bayRect.x + bayRect.w / 2,
            y: bayRect.y + bayRect.h / 2,
            rotation: bayRect.side === 'floor' ? -Math.PI / 2 : Math.PI / 2,
            state: 'parked',
            timer: 3 + Math.random() * 8,
            bay: bay,
            size: 8,
        });
    }
}

function updateAI(dt, cw, ch) {
    const entranceMidY = stY + STATION_H / 2;
    const outsideX = stX - 120;
    const innerMidY = stY + STATION_H / 2;

    for (const ai of aiShips) {
        ai.timer -= dt;

        if (ai.state === 'parked' && ai.timer <= 0) {
            ai.state = 'leaving';
            ai.timer = 0;
        }

        if (ai.state === 'leaving') {
            // First move to center height, then to entrance, then outside
            if (Math.abs(ai.y - entranceMidY) > 5) {
                ai.y += (entranceMidY > ai.y ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = entranceMidY > ai.y ? Math.PI / 2 : -Math.PI / 2;
            } else {
                ai.x -= AI_SPEED * dt;
                ai.rotation = Math.PI;
                if (ai.x < outsideX) {
                    ai.state = 'outside';
                    ai.timer = 4 + Math.random() * 6;
                }
            }
        }

        if (ai.state === 'outside' && ai.timer <= 0) {
            ai.state = 'entering';
            ai.x = outsideX;
            ai.y = entranceMidY;
        }

        if (ai.state === 'entering') {
            const bayRect = getBayRect(ai.bay);
            const targetX = bayRect.x + bayRect.w / 2;
            const targetY = bayRect.y + bayRect.h / 2;

            if (ai.x < stX + WALL_THICK + 20) {
                ai.x += AI_SPEED * dt;
                ai.rotation = 0;
            } else if (Math.abs(ai.x - targetX) > 5) {
                ai.x += (targetX > ai.x ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = targetX > ai.x ? 0 : Math.PI;
            } else if (Math.abs(ai.y - targetY) > 5) {
                ai.y += (targetY > ai.y ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = targetY > ai.y ? Math.PI / 2 : -Math.PI / 2;
            } else {
                ai.state = 'parked';
                ai.timer = 5 + Math.random() * 10;
                ai.rotation = bayRect.side === 'floor' ? -Math.PI / 2 : Math.PI / 2;
            }
        }
    }
}

function draw(cw, ch) {
    ctx.clearRect(0, 0, cw, ch);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);

    // Background stars (grey on white)
    ctx.fillStyle = '#bbbcce';
    for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5) % cw);
        const sy = ((i * 211.3) % ch);
        ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Crash flash
    if (crashFlashTimer > 0) {
        const alpha = crashFlashTimer * 0.4;
        ctx.fillStyle = `rgba(255, 50, 0, ${alpha})`;
        ctx.fillRect(0, 0, cw, ch);
    }

    drawStation(cw, ch);
    drawBays();

    if (phase === 'flying' || phase === 'docked' || phase === 'destroyed') {
        drawAIShips();
        if (phase !== 'destroyed') {
            drawPlayerShip();
        }
    }

    drawHUD(cw, ch);
}

function drawStation(cw, ch) {
    // Outer walls
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(stX, stY, STATION_W, STATION_H);

    // Inner space (white, like space)
    const innerLeft = stX + WALL_THICK;
    const innerTop = stY + WALL_THICK;
    const innerW = STATION_W - 2 * WALL_THICK;
    const innerH = STATION_H - 2 * WALL_THICK;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(innerLeft, innerTop, innerW, innerH);

    // Entrance gap
    const entranceTop = stY + STATION_H / 2 - ENTRANCE_H / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(stX, entranceTop, WALL_THICK, ENTRANCE_H);

    // Entrance markers (blinking lights)
    const blink = Math.sin(performance.now() / 300) > 0;
    ctx.fillStyle = blink ? '#0f0' : '#030';
    ctx.fillRect(stX - 2, entranceTop - 4, 6, 6);
    ctx.fillRect(stX - 2, entranceTop + ENTRANCE_H - 2, 6, 6);

    // Wall edge highlights
    ctx.strokeStyle = '#445';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop);
    ctx.lineTo(innerLeft + innerW, innerTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop + innerH);
    ctx.lineTo(innerLeft + innerW, innerTop + innerH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerLeft + innerW, innerTop);
    ctx.lineTo(innerLeft + innerW, innerTop + innerH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop);
    ctx.lineTo(innerLeft, entranceTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerLeft, entranceTop + ENTRANCE_H);
    ctx.lineTo(innerLeft, innerTop + innerH);
    ctx.stroke();

    // Centrifuge rotation arrows on walls to indicate spin
    ctx.font = '10px monospace';
    ctx.fillStyle = '#334';
    ctx.textAlign = 'center';
    // Top wall arrows (moving right)
    for (let x = innerLeft + 40; x < innerLeft + innerW - 40; x += 80) {
        ctx.fillText('\u25B6', x, stY + WALL_THICK / 2 + 3);
    }
    // Bottom wall arrows (moving left)
    for (let x = innerLeft + 40; x < innerLeft + innerW - 40; x += 80) {
        ctx.fillText('\u25C0', x, stY + STATION_H - WALL_THICK / 2 + 3);
    }
    ctx.textAlign = 'left';

    // Station name
    ctx.font = '11px monospace';
    ctx.fillStyle = '#556';
    ctx.textAlign = 'center';
    ctx.fillText(stationName + ' (Centrifuge Station)', stX + STATION_W / 2, stY - 8);
    ctx.textAlign = 'left';
}

function drawBays() {
    for (let i = 0; i < totalBays; i++) {
        const bay = getBayRect(i);

        if (i === assignedBay) {
            const pulse = 0.3 + Math.sin(performance.now() / 400) * 0.15;
            ctx.fillStyle = `rgba(0, 255, 100, ${pulse})`;
            ctx.fillRect(bay.x, bay.y, bay.w, bay.h);
            ctx.strokeStyle = '#0f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(bay.x, bay.y, bay.w, bay.h);

            ctx.font = 'bold 12px monospace';
            ctx.fillStyle = '#0f6';
            ctx.textAlign = 'center';
            ctx.fillText(`BAY ${i + 1}`, bay.x + bay.w / 2, bay.y + bay.h / 2 + 4);
            ctx.textAlign = 'left';
        } else {
            ctx.strokeStyle = '#334';
            ctx.lineWidth = 1;
            ctx.strokeRect(bay.x, bay.y, bay.w, bay.h);
            ctx.font = '9px monospace';
            ctx.fillStyle = '#334';
            ctx.textAlign = 'center';
            ctx.fillText(`${i + 1}`, bay.x + bay.w / 2, bay.y + bay.h / 2 + 3);
            ctx.textAlign = 'left';
        }
    }

    // Dock progress indicator
    if (dockTimer > 0 && phase === 'flying') {
        const pct = dockTimer / DOCK_HOLD_TIME;
        const bay = getBayRect(assignedBay);
        const barY = bay.side === 'floor' ? bay.y + bay.h + 4 : bay.y - 8;
        ctx.fillStyle = '#0f6';
        ctx.fillRect(bay.x, barY, bay.w * pct, 4);
        ctx.strokeStyle = '#0f6';
        ctx.strokeRect(bay.x, barY, bay.w, 4);
    }
}

function drawPlayerShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    // Rectangular ship with pointed front (matching main game)
    const s = ship.size;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.35);
    ctx.lineTo(s * 0.4, -s * 0.35);
    ctx.lineTo(s * 0.4, -s * 0.25);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.4, s * 0.25);
    ctx.lineTo(s * 0.4, s * 0.35);
    ctx.lineTo(-s * 0.6, s * 0.35);
    ctx.closePath();

    // Flash red on crash
    if (crashFlashTimer > 0) {
        ctx.fillStyle = '#f44';
    } else {
        ctx.fillStyle = '#000000'; // Solid black like in the main game
    }
    ctx.fill();
    ctx.strokeStyle = '#444'; // Darker stroke for contrast
    ctx.lineWidth = 1;
    ctx.stroke();

    // Engine glow
    if (input.up) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, -s * 0.2);
        ctx.lineTo(-s * (0.8 + Math.random() * 0.4), 0);
        ctx.lineTo(-s * 0.6, s * 0.2);
        ctx.fillStyle = `rgba(120, 180, 255, ${0.4 + Math.random() * 0.2})`; // Slightly more subtle
        ctx.fill();
    }

    ctx.restore();
}

function drawAIShips() {
    for (const ai of aiShips) {
        if (ai.state === 'outside') continue;

        ctx.save();
        ctx.translate(ai.x, ai.y);
        ctx.rotate(ai.rotation);

        const s = ai.size;
        ctx.beginPath();
        ctx.moveTo(-s * 0.6, -s * 0.35);
        ctx.lineTo(s * 0.4, -s * 0.35);
        ctx.lineTo(s * 0.4, -s * 0.25);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.4, s * 0.25);
        ctx.lineTo(s * 0.4, s * 0.35);
        ctx.lineTo(-s * 0.6, s * 0.35);
        ctx.closePath();

        ctx.fillStyle = '#333333'; // Dark grey AI
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

function drawHUD(cw, ch) {
    ctx.textAlign = 'center';

    if (phase === 'requesting') {
        ctx.font = '18px monospace';
        ctx.fillStyle = '#fa0';
        ctx.fillText('REQUESTING DOCKING PERMISSION...', cw / 2, 40);
        const dots = '.'.repeat(Math.floor(phaseTimer * 2) % 4);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#886';
        ctx.fillText(`Contacting ${stationName} ATC${dots}`, cw / 2, 65);
    }

    if (phase === 'granted') {
        ctx.font = '18px monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('PERMISSION GRANTED', cw / 2, 40);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#8c8';
        const side = assignedBay < floorBayCount ? 'FLOOR' : 'CEILING';
        ctx.fillText(`Bay ${assignedBay + 1} (${side}) - Navigate and hold position`, cw / 2, 65);
    }

    if (phase === 'flying') {
        ctx.font = '13px monospace';
        ctx.fillStyle = '#8af';
        const side = assignedBay < floorBayCount ? 'Floor' : 'Ceiling';
        ctx.fillText(`Bay ${assignedBay + 1} (${side}) | W/S - Thrust/Brake | A/D - Rotate`, cw / 2, 30);

        // Speed
        const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        ctx.font = '12px monospace';
        ctx.fillStyle = spd < 15 ? '#0f0' : (spd > CRASH_SPEED_THRESHOLD ? '#f44' : '#fa0');
        ctx.fillText(`SPD: ${Math.round(spd)}`, cw / 2, ch - 20);
    }

    // Hull display (always visible during flying)
    if (phase === 'flying' || phase === 'destroyed') {
        ctx.textAlign = 'right';
        ctx.font = '13px monospace';
        const hullColor = hullDisplay > 60 ? '#0f0' : hullDisplay > 30 ? '#fa0' : '#f44';
        ctx.fillStyle = hullColor;
        ctx.fillText(`HULL: ${Math.round(hullDisplay)}%`, cw - 15, 30);

        // Hull bar
        const barW = 120;
        const barH = 8;
        const barX = cw - 15 - barW;
        const barY = 36;
        ctx.fillStyle = '#222';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = hullColor;
        ctx.fillRect(barX, barY, barW * hullDisplay / 100, barH);
        ctx.strokeStyle = '#445';
        ctx.strokeRect(barX, barY, barW, barH);

        if (crashCount > 0) {
            ctx.font = '11px monospace';
            ctx.fillStyle = '#f88';
            ctx.fillText(`Impacts: ${crashCount}`, cw - 15, barY + 22);
        }
    }

    if (phase === 'docked') {
        ctx.textAlign = 'center';
        ctx.font = '22px monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('DOCKED SUCCESSFULLY', cw / 2, 50);
    }

    if (phase === 'destroyed') {
        ctx.textAlign = 'center';
        ctx.font = '26px monospace';
        ctx.fillStyle = '#f44';
        ctx.fillText('SHIP DESTROYED', cw / 2, ch / 2 - 10);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#a66';
        ctx.fillText('Hull integrity lost from collision damage', cw / 2, ch / 2 + 20);
    }

    ctx.textAlign = 'left';

    // ESC to abort
    if (phase === 'flying') {
        ctx.font = '11px monospace';
        ctx.fillStyle = '#556';
        ctx.fillText('ESC - Abort docking', 10, ch - 10);
    }
}
