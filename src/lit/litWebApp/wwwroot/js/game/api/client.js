async function request(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (res.status === 401) {
        window.location.href = '/Auth/Login';
        return null;
    }
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
    }
    const ct = res.headers.get('content-type');
    if (ct && ct.includes('application/json')) return res.json();
    return null;
}

export async function getWorld() {
    return request('/api/game/world');
}

export async function getPlayer() {
    return request('/api/game/player');
}

export async function savePosition(data) {
    return request('/api/game/save', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getStation(id) {
    return request(`/api/game/station/${id}`);
}

export async function buyCargo(stationId, cargoTypeId, quantity) {
    return request(`/api/game/station/${stationId}/buy`, {
        method: 'POST',
        body: JSON.stringify({ cargoTypeId, quantity }),
    });
}

export async function sellCargo(stationId, cargoTypeId, quantity) {
    return request(`/api/game/station/${stationId}/sell`, {
        method: 'POST',
        body: JSON.stringify({ cargoTypeId, quantity }),
    });
}

export async function refuel(stationId) {
    return request(`/api/game/station/${stationId}/refuel`, {
        method: 'POST',
    });
}

export async function buyShip(stationId, shipTypeId) {
    return request(`/api/game/station/${stationId}/buyship`, {
        method: 'POST',
        body: JSON.stringify({ shipTypeId }),
    });
}

export async function dock(stationId) {
    return request(`/api/game/station/${stationId}/dock`, {
        method: 'POST',
    });
}

export async function undock(stationId) {
    return request(`/api/game/station/${stationId}/undock`, {
        method: 'POST',
    });
}

export async function getMap() {
    return request('/api/game/map');
}
