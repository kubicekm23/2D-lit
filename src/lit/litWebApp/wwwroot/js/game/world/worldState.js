export const worldState = {
    stations: [],     // { id, name, x, y, hangarLimit }
    minX: -5000,
    maxX: 5000,
    minY: -5000,
    maxY: 5000,
};

export function loadWorld(data) {
    worldState.stations = data.stations;
    worldState.minX = data.minX;
    worldState.maxX = data.maxX;
    worldState.minY = data.minY;
    worldState.maxY = data.maxY;
}
