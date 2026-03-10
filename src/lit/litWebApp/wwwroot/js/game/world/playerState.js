export const playerState = {
    credits: 0,
    isDocked: false,
    dockedStationId: null,

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
        playerState.ship.cargo = s.cargo || [];

        if (s.type) {
            playerState.ship.type = {
                id: s.type.id,
                name: s.type.name,
                cargoHold: s.type.cargoHold,
                maxSpeed: s.type.maxSpeed,
                thrustPower: s.type.thrustPower,
                fuelEfficiency: s.type.fuelEfficiency,
                turnRate: s.type.turnRate,
                maxFuel: s.type.maxFuel,
                price: s.type.price,
                texture: s.type.texture,
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
