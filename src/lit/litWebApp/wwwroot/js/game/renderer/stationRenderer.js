import { getGL, createProgram } from './webgl.js';
import { stationVertSrc, stationFragSrc, boundaryVertSrc, boundaryFragSrc } from './shaders.js';
import { ATC_RANGE } from '../utils/constants.js';
import { distance } from '../utils/math.js';
import { WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y } from '../utils/constants.js';

let stationProgram, stationVao, stationVerts;
let boundaryProgram, boundaryVao;
let stationLoc = {};
let boundaryLoc = {};

const STATION_SCALE = 20;
const ATC_CIRCLE_SEGMENTS = 48;

export function initStations() {
    const gl = getGL();

    // Station shape program
    stationProgram = createProgram(stationVertSrc, stationFragSrc);
    if (!stationProgram) return;

    stationLoc.stationPos = gl.getUniformLocation(stationProgram, 'u_stationPos');
    stationLoc.cameraPos = gl.getUniformLocation(stationProgram, 'u_cameraPos');
    stationLoc.resolution = gl.getUniformLocation(stationProgram, 'u_resolution');
    stationLoc.zoom = gl.getUniformLocation(stationProgram, 'u_zoom');
    stationLoc.scale = gl.getUniformLocation(stationProgram, 'u_scale');
    stationLoc.color = gl.getUniformLocation(stationProgram, 'u_color');

    // Hexagon shape
    const hexVerts = [];
    for (let i = 0; i < 6; i++) {
        const a1 = (Math.PI * 2 * i) / 6;
        const a2 = (Math.PI * 2 * (i + 1)) / 6;
        hexVerts.push(0, 0);
        hexVerts.push(Math.cos(a1), Math.sin(a1));
        hexVerts.push(Math.cos(a2), Math.sin(a2));
    }
    stationVerts = hexVerts.length / 2;

    stationVao = gl.createVertexArray();
    gl.bindVertexArray(stationVao);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hexVerts), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(stationProgram, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Boundary rectangle program
    boundaryProgram = createProgram(boundaryVertSrc, boundaryFragSrc);
    if (!boundaryProgram) return;

    boundaryLoc.cameraPos = gl.getUniformLocation(boundaryProgram, 'u_cameraPos');
    boundaryLoc.resolution = gl.getUniformLocation(boundaryProgram, 'u_resolution');
    boundaryLoc.zoom = gl.getUniformLocation(boundaryProgram, 'u_zoom');

    // World boundary rectangle (line loop)
    const bx0 = WORLD_MIN_X, bx1 = WORLD_MAX_X;
    const by0 = WORLD_MIN_Y, by1 = WORLD_MAX_Y;
    const boundaryData = new Float32Array([
        bx0, by0, bx1, by0, bx1, by1, bx0, by1
    ]);

    boundaryVao = gl.createVertexArray();
    gl.bindVertexArray(boundaryVao);

    const bbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bbuf);
    gl.bufferData(gl.ARRAY_BUFFER, boundaryData, gl.STATIC_DRAW);

    const bPos = gl.getAttribLocation(boundaryProgram, 'a_position');
    gl.enableVertexAttribArray(bPos);
    gl.vertexAttribPointer(bPos, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
}

export function renderStations(camera, worldState, playerState) {
    const gl = getGL();
    if (!stationProgram) return;

    // Draw world boundary
    if (boundaryProgram) {
        gl.useProgram(boundaryProgram);
        gl.bindVertexArray(boundaryVao);
        gl.uniform2f(boundaryLoc.cameraPos, camera.x, camera.y);
        gl.uniform2f(boundaryLoc.resolution, camera.width, camera.height);
        gl.uniform1f(boundaryLoc.zoom, camera.zoom);
        gl.drawArrays(gl.LINE_LOOP, 0, 4);
        gl.bindVertexArray(null);
    }

    // Draw stations
    gl.useProgram(stationProgram);
    gl.bindVertexArray(stationVao);

    gl.uniform2f(stationLoc.cameraPos, camera.x, camera.y);
    gl.uniform2f(stationLoc.resolution, camera.width, camera.height);
    gl.uniform1f(stationLoc.zoom, camera.zoom);

    for (const station of worldState.stations) {
        const dist = distance(playerState.ship.x, playerState.ship.y, station.x, station.y);
        const inRange = dist < ATC_RANGE;

        gl.uniform2f(stationLoc.stationPos, station.x, station.y);
        gl.uniform1f(stationLoc.scale, STATION_SCALE);

        // Color: bright when in range, dim when far
        if (inRange) {
            gl.uniform4f(stationLoc.color, 0.8, 0.85, 1.0, 1.0);
        } else {
            gl.uniform4f(stationLoc.color, 0.35, 0.35, 0.45, 1.0);
        }

        gl.drawArrays(gl.TRIANGLES, 0, stationVerts);
    }

    gl.bindVertexArray(null);
}
