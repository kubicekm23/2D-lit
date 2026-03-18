let atcEl = null;
let visible = false;

export function initATC() {
    atcEl = document.getElementById('atc-notification');
}

export function showATC() {
    if (!atcEl || visible) return;
    atcEl.classList.remove('atc-hidden');
    visible = true;
}

export function hideATC() {
    if (!atcEl || !visible) return;
    atcEl.classList.add('atc-hidden');
    visible = false;
}

export function isATCVisible() {
    return visible;
}
