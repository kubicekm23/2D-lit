export const worldState = {
    stations: [],
    planets: [],
    minX: -5000,
    maxX: 5000,
    minY: -5000,
    maxY: 5000,
};

export function loadWorld(data) {
    worldState.stations = data.stations || [];
    worldState.planets = data.planets || [];
    worldState.minX = data.minX ?? -5000;
    worldState.maxX = data.maxX ?? 5000;
    worldState.minY = data.minY ?? -5000;
    worldState.maxY = data.maxY ?? 5000;
    
    // Ensure numbers
    worldState.minX = Number(worldState.minX);
    worldState.maxX = Number(worldState.maxX);
    worldState.minY = Number(worldState.minY);
    worldState.maxY = Number(worldState.maxY);
}
