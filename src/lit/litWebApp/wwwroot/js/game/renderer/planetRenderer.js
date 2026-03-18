import { getGL, createProgram } from './webgl.js';
import { planetVertSrc, planetFragSrc } from './shaders.js';

let program, vao, vertexCount;
let loc = {};

export function initPlanets() {
    const gl = getGL();
    program = createProgram(planetVertSrc, planetFragSrc);
    if (!program) return;

    loc.cameraPos = gl.getUniformLocation(program, 'u_cameraPos');
    loc.resolution = gl.getUniformLocation(program, 'u_resolution');
    loc.zoom = gl.getUniformLocation(program, 'u_zoom');

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
}

export function renderPlanets(camera, worldState) {
    const gl = getGL();
    if (!program || worldState.planets.length === 0) return;

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(loc.cameraPos, camera.x, camera.y);
    gl.uniform2f(loc.resolution, camera.width, camera.height);
    gl.uniform1f(loc.zoom, camera.zoom);

    // Dynamic buffer since world state loads later
    const data = new Float32Array(worldState.planets.length * 4);
    for (let i = 0; i < worldState.planets.length; i++) {
        const p = worldState.planets[i];
        const idx = i * 4;
        data[idx + 0] = p.x;
        data[idx + 1] = p.y;
        data[idx + 2] = 120 + (p.id % 5) * 40; // radius 120-280
        data[idx + 3] = p.id; // seed
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const aRad = gl.getAttribLocation(program, 'a_radius');
    const aSeed = gl.getAttribLocation(program, 'a_seed');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aRad);
    gl.vertexAttribPointer(aRad, 1, gl.FLOAT, false, 16, 8);

    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 16, 12);

    gl.drawArrays(gl.POINTS, 0, worldState.planets.length);
    
    // Clean up buffer
    gl.deleteBuffer(buffer);
    gl.bindVertexArray(null);
}
