// World - these get overridden by server data
export let WORLD_MIN_X = -5000;
export let WORLD_MAX_X = 5000;
export let WORLD_MIN_Y = -5000;
export let WORLD_MAX_Y = 5000;

export function setWorldBounds(minX, maxX, minY, maxY) {
    WORLD_MIN_X = minX;
    WORLD_MAX_X = maxX;
    WORLD_MIN_Y = minY;
    WORLD_MAX_Y = maxY;
}

// Rendering
export const STAR_COUNT = 800;
export const DUST_COUNT = 200;

// Speed blur thresholds (fraction of max speed)
export const BLUR_START = 0.3;
export const BLUR_FULL = 0.8;

// Station interaction ranges
export const ATC_RANGE = 800;
export const LANDING_RANGE = 100;
export const LANDING_MAX_SPEED = 15;

// Auto-save interval (ms)
export const AUTOSAVE_INTERVAL = 30000;

// Physics
export const BRAKE_POWER_FACTOR = 0.8;
export const WORLD_BOUNCE_FACTOR = -0.5;

// HUD
export const HUD_UPDATE_INTERVAL = 100; // ms
