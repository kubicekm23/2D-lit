let overlay = null;
let open = false;

export function initPauseMenu() {
    overlay = document.getElementById('pause-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="pause-panel">
            <h2>PAUSED</h2>
            <button id="btn-resume" class="pause-btn">Resume</button>
            <button id="btn-logout" class="pause-btn pause-btn-danger">Logout</button>
            <p class="pause-hint">ESC — Resume &nbsp; M — Map &nbsp; F — Dock</p>
        </div>
    `;

    document.getElementById('btn-resume').addEventListener('click', closePauseMenu);
    document.getElementById('btn-logout').addEventListener('click', () => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/Auth/Logout';
        document.body.appendChild(form);
        form.submit();
    });
}

export function openPauseMenu() {
    if (!overlay || open) return;
    open = true;
    overlay.style.display = 'flex';
}

export function closePauseMenu() {
    if (!overlay) return;
    open = false;
    overlay.style.display = 'none';
}

export function isPauseOpen() {
    return open;
}
