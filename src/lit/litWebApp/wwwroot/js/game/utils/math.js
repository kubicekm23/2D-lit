export function length(x, y) {
    return Math.sqrt(x * x + y * y);
}

export function distance(x1, y1, x2, y2) {
    return length(x2 - x1, y2 - y1);
}

export function normalize(x, y) {
    const len = length(x, y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function degToRad(deg) {
    return deg * Math.PI / 180;
}

export function radToDeg(rad) {
    return rad * 180 / Math.PI;
}
