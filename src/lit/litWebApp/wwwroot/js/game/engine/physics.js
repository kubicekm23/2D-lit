import { input } from './input.js';
import { playerState } from '../world/playerState.js';
import { degToRad } from '../utils/math.js';
import {
    WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y,
    BRAKE_POWER_FACTOR, WORLD_BOUNCE_FACTOR
} from '../utils/constants.js';

export function updatePhysics(dt) {
    const ship = playerState.ship;
    const type = ship.type;

    // Rotation (turnRate is degrees/sec)
    if (input.left) ship.rotation += degToRad(type.turnRate) * dt;
    if (input.right) ship.rotation -= degToRad(type.turnRate) * dt;

    // Thrust (W key)
    if (input.up && ship.fuel > 0) {
        const dirX = Math.cos(ship.rotation);
        const dirY = Math.sin(ship.rotation);
        ship.vx += dirX * type.thrustPower * dt;
        ship.vy += dirY * type.thrustPower * dt;
        ship.fuel -= type.fuelEfficiency * dt;
    }

    // Passive fuel drain (life support)
    if (!playerState.isDocked && ship.fuel > 0) {
        ship.fuel -= 0.01 * dt;
    }

    if (ship.fuel < 0) ship.fuel = 0;

    // Brake (S key) - simple deceleration toward zero
    if (input.down) {
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > 0) {
            const decel = Math.min(type.thrustPower * BRAKE_POWER_FACTOR * dt, speed);
            const factor = (speed - decel) / speed;
            ship.vx *= factor;
            ship.vy *= factor;
        }
    }

    // Speed cap
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > type.maxSpeed) {
        const scale = type.maxSpeed / speed;
        ship.vx *= scale;
        ship.vy *= scale;
    }

    // Position update
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    // World bounds (elastic bounce)
    let hit = false;
    if (ship.x < WORLD_MIN_X) {
        ship.x = WORLD_MIN_X;
        ship.vx *= WORLD_BOUNCE_FACTOR;
        hit = true;
    } else if (ship.x > WORLD_MAX_X) {
        ship.x = WORLD_MAX_X;
        ship.vx *= WORLD_BOUNCE_FACTOR;
        hit = true;
    }

    if (ship.y < WORLD_MIN_Y) {
        ship.y = WORLD_MIN_Y;
        ship.vy *= WORLD_BOUNCE_FACTOR;
        hit = true;
    } else if (ship.y > WORLD_MAX_Y) {
        ship.y = WORLD_MAX_Y;
        ship.vy *= WORLD_BOUNCE_FACTOR;
        hit = true;
    }

    if (hit) {
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > 100) {
            ship.hull -= (speed - 100) * 0.05;
            if (ship.hull < 0) ship.hull = 0;
        }
    }
}
