import { getGL, createProgram } from './webgl.js';
import { shipVertSrc, shipFragSrc } from './shaders.js';

let program, vao, vertexCount;
let loc = {};

const SHIP_SCALE = 12; // pixels at zoom 1

export function initShip() {
    const gl = getGL();
    program = createProgram(shipVertSrc, shipFragSrc);
    if (!program) return;

    loc.shipPos = gl.getUniformLocation(program, 'u_shipPos');
    loc.rotation = gl.getUniformLocation(program, 'u_rotation');
    loc.cameraPos = gl.getUniformLocation(program, 'u_cameraPos');
    loc.resolution = gl.getUniformLocation(program, 'u_resolution');
    loc.zoom = gl.getUniformLocation(program, 'u_zoom');
    loc.scale = gl.getUniformLocation(program, 'u_scale');

    // Rectangular ship with pointed front (rotation 0 = right)
    const verts = new Float32Array([
        // Main rectangular body (two triangles)
        -0.6, -0.35,
         0.4, -0.35,
         0.4,  0.35,

        -0.6, -0.35,
         0.4,  0.35,
        -0.6,  0.35,

        // Pointed nose (front wedge)
         0.4, -0.25,
         1.0,  0.0,
         0.4,  0.25,
    ]);

    vertexCount = verts.length / 2;

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

export function renderShip(camera, playerState) {
    const gl = getGL();
    if (!program) return;

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(loc.shipPos, playerState.ship.x, playerState.ship.y);
    gl.uniform1f(loc.rotation, playerState.ship.rotation);
    gl.uniform2f(loc.cameraPos, camera.x, camera.y);
    gl.uniform2f(loc.resolution, camera.width, camera.height);
    gl.uniform1f(loc.zoom, camera.zoom);
    gl.uniform1f(loc.scale, SHIP_SCALE);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    gl.bindVertexArray(null);
}
