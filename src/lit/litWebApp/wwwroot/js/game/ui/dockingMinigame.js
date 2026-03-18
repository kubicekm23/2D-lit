import { input } from '../engine/input.js';

let overlay = null;
let canvas = null;
let ctx = null;
let active = false;
let animFrame = null;
let onDockSuccess = null;
let stationId = null;
let stationName = '';
let hangarLimit = 6;
let assignedBay = 0;

// Minigame coordinate system (pixels, origin top-left of canvas)
// Station cross-section dimensions
const STATION_W = 700;
const STATION_H = 350;
const WALL_THICK = 40;
const ENTRANCE_H = 80;
const BAY_W = 70;
const BAY_H = 50;
const BAY_MARGIN = 10;

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

// AI ships
let aiShips = [];
const AI_SPEED = 30;
const AI_COUNT = 3;

// Station position (centered on canvas)
let stX = 0, stY = 0;

// Phase: 'requesting' | 'granted' | 'flying' | 'docked'
let phase = 'requesting';
let phaseTimer = 0;
let dockTimer = 0;
const DOCK_HOLD_TIME = 1.5; // seconds player must hold still in bay

export function initDockingMinigame(onSuccess) {
    overlay = document.getElementById('docking-overlay');
    canvas = document.getElementById('docking-canvas');
    if (canvas) ctx = canvas.getContext('2d');
    onDockSuccess = onSuccess;
}

export function isDockingOpen() {
    return active;
}

export function openDockingMinigame(sid, sname, hangarLim) {
    if (!overlay || !canvas || !ctx) return;
    stationId = sid;
    stationName = sname || 'Station';
    hangarLimit = Math.max(3, Math.min(hangarLim || 6, 10));
    assignedBay = Math.floor(Math.random() * hangarLimit);

    // Reset ship position (to the left of station entrance)
    resizeCanvas();
    stX = canvas.width / 2 - STATION_W / 2;
    stY = canvas.height / 2 - STATION_H / 2;

    const entranceY = stY + STATION_H / 2 - ENTRANCE_H / 2;
    ship.x = stX - 80;
    ship.y = entranceY + ENTRANCE_H / 2;
    ship.vx = 0;
    ship.vy = 0;
    ship.rotation = 0; // pointing right

    // Spawn AI ships
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

    // Update station position (centered)
    stX = cw / 2 - STATION_W / 2;
    stY = ch / 2 - STATION_H / 2;

    update(dt, cw, ch);
    draw(cw, ch);

    animFrame = requestAnimationFrame(loop);
}

function update(dt, cw, ch) {
    // Phase management
    phaseTimer += dt;

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

    if (phase === 'docked') return;

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

    // Wall collision
    resolveWallCollision();

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
            setTimeout(() => {
                closeDockingMinigame();
                if (onDockSuccess) onDockSuccess(stationId);
            }, 1500);
        }
    } else {
        dockTimer = Math.max(0, dockTimer - dt * 2);
    }

    // Update AI ships
    updateAI(dt, cw, ch);
}

function getBayRect(bayIndex) {
    const innerLeft = stX + WALL_THICK;
    const innerBottom = stY + STATION_H - WALL_THICK;
    const totalBaysWidth = hangarLimit * (BAY_W + BAY_MARGIN) - BAY_MARGIN;
    const startX = innerLeft + (STATION_W - 2 * WALL_THICK - totalBaysWidth) / 2;

    return {
        x: startX + bayIndex * (BAY_W + BAY_MARGIN),
        y: innerBottom - BAY_H,
        w: BAY_W,
        h: BAY_H,
    };
}

function resolveWallCollision() {
    const s = ship.size;
    const innerLeft = stX + WALL_THICK;
    const innerRight = stX + STATION_W - WALL_THICK;
    const innerTop = stY + WALL_THICK;
    const innerBottom = stY + STATION_H - WALL_THICK;
    const entranceTop = stY + STATION_H / 2 - ENTRANCE_H / 2;
    const entranceBottom = stY + STATION_H / 2 + ENTRANCE_H / 2;

    // Check if ship is inside station walls
    const insideOuter = ship.x > stX && ship.x < stX + STATION_W &&
                        ship.y > stY && ship.y < stY + STATION_H;

    if (!insideOuter) return;

    const insideInner = ship.x > innerLeft + s && ship.x < innerRight - s &&
                        ship.y > innerTop + s && ship.y < innerBottom - s;

    if (insideInner) return;

    // Ship is in the wall zone - check if in entrance gap
    const inEntranceX = ship.x < innerLeft + s && ship.x > stX - s;
    const inEntranceY = ship.y > entranceTop + s && ship.y < entranceBottom - s;

    if (inEntranceX && inEntranceY) return; // in the entrance, allow passage

    // Colliding with wall - push out
    if (ship.x < innerLeft + s && ship.x > stX) {
        // Left wall (but not in entrance)
        if (ship.y < entranceTop || ship.y > entranceBottom) {
            ship.x = innerLeft + s;
            ship.vx = Math.abs(ship.vx) * 0.3;
        } else {
            // Near entrance edges
            if (ship.y < entranceTop + s) {
                ship.y = entranceTop + s;
                ship.vy = Math.abs(ship.vy) * 0.3;
            }
            if (ship.y > entranceBottom - s) {
                ship.y = entranceBottom - s;
                ship.vy = -Math.abs(ship.vy) * 0.3;
            }
        }
    }
    if (ship.x > innerRight - s && ship.x < stX + STATION_W) {
        ship.x = innerRight - s;
        ship.vx = -Math.abs(ship.vx) * 0.3;
    }
    if (ship.y < innerTop + s && ship.y > stY) {
        ship.y = innerTop + s;
        ship.vy = Math.abs(ship.vy) * 0.3;
    }
    if (ship.y > innerBottom - s && ship.y < stY + STATION_H) {
        ship.y = innerBottom - s;
        ship.vy = -Math.abs(ship.vy) * 0.3;
    }
}

function spawnAIShips() {
    aiShips = [];
    for (let i = 0; i < AI_COUNT; i++) {
        const bay = Math.floor(Math.random() * hangarLimit);
        if (bay === assignedBay) continue; // don't block assigned bay
        const bayRect = getBayRect(bay);
        aiShips.push({
            x: bayRect.x + bayRect.w / 2,
            y: bayRect.y + bayRect.h / 2,
            rotation: -Math.PI / 2, // pointing up
            state: 'parked', // 'parked', 'leaving', 'entering', 'outside'
            timer: 3 + Math.random() * 8,
            bay: bay,
            targetX: 0,
            targetY: 0,
            size: 8,
        });
    }
}

function updateAI(dt, cw, ch) {
    const entranceMidY = stY + STATION_H / 2;
    const outsideX = stX - 120;

    for (const ai of aiShips) {
        ai.timer -= dt;

        if (ai.state === 'parked' && ai.timer <= 0) {
            ai.state = 'leaving';
            ai.timer = 0;
        }

        if (ai.state === 'leaving') {
            // Move toward entrance then outside
            const targetX = outsideX;
            const targetY = entranceMidY;

            // First move up to entrance height
            if (Math.abs(ai.y - targetY) > 5) {
                ai.y += (targetY > ai.y ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = targetY > ai.y ? Math.PI / 2 : -Math.PI / 2;
            } else {
                // Then move left through entrance
                ai.x -= AI_SPEED * dt;
                ai.rotation = Math.PI; // pointing left
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

            // Move right through entrance first
            if (ai.x < stX + WALL_THICK + 20) {
                ai.x += AI_SPEED * dt;
                ai.rotation = 0; // pointing right
            } else if (Math.abs(ai.x - targetX) > 5) {
                ai.x += (targetX > ai.x ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = targetX > ai.x ? 0 : Math.PI;
            } else if (Math.abs(ai.y - targetY) > 5) {
                ai.y += (targetY > ai.y ? 1 : -1) * AI_SPEED * dt;
                ai.rotation = targetY > ai.y ? Math.PI / 2 : -Math.PI / 2;
            } else {
                ai.state = 'parked';
                ai.timer = 5 + Math.random() * 10;
                ai.rotation = -Math.PI / 2;
            }
        }
    }
}

function draw(cw, ch) {
    ctx.clearRect(0, 0, cw, ch);

    // Dark background
    ctx.fillStyle = '#020210';
    ctx.fillRect(0, 0, cw, ch);

    // Draw some background stars
    ctx.fillStyle = '#335';
    for (let i = 0; i < 60; i++) {
        const sx = ((i * 137.5) % cw);
        const sy = ((i * 211.3) % ch);
        ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    drawStation(cw, ch);
    drawBays();

    if (phase === 'flying' || phase === 'docked') {
        drawAIShips();
        drawPlayerShip();
    }

    drawHUD(cw, ch);
}

function drawStation(cw, ch) {
    // Outer walls
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(stX, stY, STATION_W, STATION_H);

    // Inner space (darker)
    const innerLeft = stX + WALL_THICK;
    const innerTop = stY + WALL_THICK;
    const innerW = STATION_W - 2 * WALL_THICK;
    const innerH = STATION_H - 2 * WALL_THICK;
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(innerLeft, innerTop, innerW, innerH);

    // Entrance gap (cut out left wall)
    const entranceTop = stY + STATION_H / 2 - ENTRANCE_H / 2;
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(stX, entranceTop, WALL_THICK, ENTRANCE_H);

    // Entrance markers (blinking lights)
    const blink = Math.sin(performance.now() / 300) > 0;
    ctx.fillStyle = blink ? '#0f0' : '#030';
    ctx.fillRect(stX - 2, entranceTop - 4, 6, 6);
    ctx.fillRect(stX - 2, entranceTop + ENTRANCE_H - 2, 6, 6);

    // Wall edge highlights
    ctx.strokeStyle = '#445';
    ctx.lineWidth = 1;
    // Top wall bottom edge
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop);
    ctx.lineTo(innerLeft + innerW, innerTop);
    ctx.stroke();
    // Bottom wall top edge
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop + innerH);
    ctx.lineTo(innerLeft + innerW, innerTop + innerH);
    ctx.stroke();
    // Right wall left edge
    ctx.beginPath();
    ctx.moveTo(innerLeft + innerW, innerTop);
    ctx.lineTo(innerLeft + innerW, innerTop + innerH);
    ctx.stroke();
    // Left wall right edge (above and below entrance)
    ctx.beginPath();
    ctx.moveTo(innerLeft, innerTop);
    ctx.lineTo(innerLeft, entranceTop);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(innerLeft, entranceTop + ENTRANCE_H);
    ctx.lineTo(innerLeft, innerTop + innerH);
    ctx.stroke();

    // Station name on top wall
    ctx.font = '11px monospace';
    ctx.fillStyle = '#556';
    ctx.textAlign = 'center';
    ctx.fillText(stationName, stX + STATION_W / 2, stY + WALL_THICK / 2 + 4);
    ctx.textAlign = 'left';
}

function drawBays() {
    for (let i = 0; i < hangarLimit; i++) {
        const bay = getBayRect(i);

        if (i === assignedBay) {
            // Assigned bay - highlighted
            const pulse = 0.3 + Math.sin(performance.now() / 400) * 0.15;
            ctx.fillStyle = `rgba(0, 255, 100, ${pulse})`;
            ctx.fillRect(bay.x, bay.y, bay.w, bay.h);
            ctx.strokeStyle = '#0f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(bay.x, bay.y, bay.w, bay.h);

            // Bay number
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = '#0f6';
            ctx.textAlign = 'center';
            ctx.fillText(`BAY ${i + 1}`, bay.x + bay.w / 2, bay.y + bay.h / 2 + 5);
            ctx.textAlign = 'left';
        } else {
            // Other bays
            ctx.strokeStyle = '#334';
            ctx.lineWidth = 1;
            ctx.strokeRect(bay.x, bay.y, bay.w, bay.h);
            ctx.font = '10px monospace';
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
        ctx.fillStyle = '#0f6';
        ctx.fillRect(bay.x, bay.y + bay.h + 4, bay.w * pct, 4);
        ctx.strokeStyle = '#0f6';
        ctx.strokeRect(bay.x, bay.y + bay.h + 4, bay.w, 4);
    }
}

function drawPlayerShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.rotation);

    // Triangle ship
    ctx.beginPath();
    ctx.moveTo(ship.size, 0);
    ctx.lineTo(-ship.size * 0.7, -ship.size * 0.5);
    ctx.lineTo(-ship.size * 0.4, 0);
    ctx.lineTo(-ship.size * 0.7, ship.size * 0.5);
    ctx.closePath();

    ctx.fillStyle = '#dde';
    ctx.fill();
    ctx.strokeStyle = '#8af';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Engine glow when thrusting
    if (input.up) {
        ctx.beginPath();
        ctx.moveTo(-ship.size * 0.5, -ship.size * 0.25);
        ctx.lineTo(-ship.size * (0.8 + Math.random() * 0.4), 0);
        ctx.lineTo(-ship.size * 0.5, ship.size * 0.25);
        ctx.fillStyle = `rgba(100, 180, 255, ${0.5 + Math.random() * 0.3})`;
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

        ctx.beginPath();
        ctx.moveTo(ai.size, 0);
        ctx.lineTo(-ai.size * 0.7, -ai.size * 0.5);
        ctx.lineTo(-ai.size * 0.4, 0);
        ctx.lineTo(-ai.size * 0.7, ai.size * 0.5);
        ctx.closePath();

        ctx.fillStyle = '#665';
        ctx.fill();
        ctx.strokeStyle = '#887';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }
}

function drawHUD(cw, ch) {
    // Phase messages
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
        ctx.fillText(`Assigned to Bay ${assignedBay + 1} - Navigate to your bay and hold position`, cw / 2, 65);
    }

    if (phase === 'flying') {
        ctx.font = '13px monospace';
        ctx.fillStyle = '#8af';
        ctx.fillText(`Navigate to Bay ${assignedBay + 1} | W/S - Thrust/Brake | A/D - Rotate`, cw / 2, 30);

        // Speed indicator
        const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        ctx.font = '12px monospace';
        ctx.fillStyle = spd < 15 ? '#0f0' : '#fa0';
        ctx.fillText(`SPD: ${Math.round(spd)}`, cw / 2, ch - 20);
    }

    if (phase === 'docked') {
        ctx.font = '22px monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('DOCKED SUCCESSFULLY', cw / 2, 50);
    }

    ctx.textAlign = 'left';

    // ESC to abort
    if (phase === 'flying') {
        ctx.font = '11px monospace';
        ctx.fillStyle = '#556';
        ctx.fillText('ESC - Abort docking', 10, ch - 10);
    }
}
