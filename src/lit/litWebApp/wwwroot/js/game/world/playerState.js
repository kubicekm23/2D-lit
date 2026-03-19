export const playerState = {
    credits: 0,
    isDocked: false,
    dockedStationId: null,
    targetStationId: null,
    lastDockedLocation: { x: 0, y: 0 },

    // Active ship
    ship: {
        id: 0,
        name: '',
        x: 0,
        y: 0,
        rotation: 0,    // radians
        vx: 0,
        vy: 0,
        fuel: 0,
        hull: 100,       // 0-100, ship destroyed at 0
        cargo: [],       // { cargoTypeId, name, quantity, weight }
        type: {
            id: 0,
            name: '',
            cargoHold: 0,
            maxSpeed: 200,
            thrustPower: 80,
            fuelEfficiency: 1.0,
            turnRate: 120,
            maxFuel: 20,
            price: 0,
            texture: '',
        },
    },

    ownedShips: [],
    visitedStations: new Map(), // stationId -> cached data
};

export function loadPlayer(data) {
    playerState.credits = data.credits;
    playerState.isDocked = data.isDocked;
    playerState.dockedStationId = data.dockedStationId;
    playerState.ownedShips = data.ownedShips || [];

    if (data.activeShip) {
        const s = data.activeShip;
        playerState.ship.id = s.id;
        playerState.ship.name = s.name;
        playerState.ship.x = s.x;
        playerState.ship.y = s.y;
        playerState.ship.rotation = s.rotation;
        playerState.ship.vx = s.vx;
        playerState.ship.vy = s.vy;
        playerState.ship.fuel = s.fuel;
        playerState.ship.hull = s.hull ?? 100;
        playerState.ship.cargo = s.cargo || [];

        // Update range base if docked
        if (data.isDocked && data.activeShip) {
            playerState.lastDockedLocation = { x: data.activeShip.x, y: data.activeShip.y };
        } else if (playerState.lastDockedLocation.x === 0 && playerState.lastDockedLocation.y === 0) {
            playerState.lastDockedLocation = { x: s.x, y: s.y };
        }

        if (s.type) {
            playerState.ship.type = {
                id: s.type.id,
                name: s.type.name || 'Ship',
                cargoHold: s.type.cargoHold || 4,
                maxSpeed: s.type.maxSpeed || 200,
                thrustPower: s.type.thrustPower || 80,
                fuelEfficiency: s.type.fuelEfficiency || 0.05,
                turnRate: s.type.turnRate || 120,
                maxFuel: s.type.maxFuel || 20,
                price: s.type.price || 0,
                texture: s.type.texture || '',
            };
        }
    }
}

export function getSpeed() {
    return Math.sqrt(playerState.ship.vx ** 2 + playerState.ship.vy ** 2);
}

export function getSpeedFraction() {
    const maxSpeed = playerState.ship.type.maxSpeed;
    return maxSpeed > 0 ? getSpeed() / maxSpeed : 0;
}

export function getMaxRange() {
    const ship = playerState.ship;
    if (!ship.type || ship.type.fuelEfficiency <= 0) return 0;
    // Estimate: fuel / efficiency * (maxSpeed * 0.8 travel factor)
    return (ship.fuel / ship.type.fuelEfficiency) * (ship.type.maxSpeed * 0.8);
}
