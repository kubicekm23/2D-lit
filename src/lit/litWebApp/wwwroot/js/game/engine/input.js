const keys = {};

export const input = {
    get up() { return !!keys['KeyW'] || !!keys['ArrowUp']; },
    get down() { return !!keys['KeyS'] || !!keys['ArrowDown']; },
    get left() { return !!keys['KeyA'] || !!keys['ArrowLeft']; },
    get right() { return !!keys['KeyD'] || !!keys['ArrowRight']; },
    get interact() { return !!keys['KeyF']; },
    get map() { return !!keys['KeyM']; },
    get escape() { return !!keys['Escape']; },
};

// Track single-press events
let pressedThisFrame = {};

export function wasPressed(code) {
    return !!pressedThisFrame[code];
}

export function clearFrameInput() {
    pressedThisFrame = {};
}

export function initInput() {
    window.addEventListener('keydown', (e) => {
        if (!keys[e.code]) {
            pressedThisFrame[e.code] = true;
        }
        keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    window.addEventListener('blur', () => {
        for (const k in keys) keys[k] = false;
    });
}
