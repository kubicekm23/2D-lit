import { getGL, createProgram } from './webgl.js';
import { bgVertSrc, bgFragSrc } from './shaders.js';
import { STAR_COUNT, DUST_COUNT, BLUR_START, BLUR_FULL } from '../utils/constants.js';
import { WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Y, WORLD_MAX_Y } from '../utils/constants.js';

let program, vao, vertexCount;
let loc = {};

export function initBackground() {
    const gl = getGL();
    program = createProgram(bgVertSrc, bgFragSrc);
    if (!program) return;

    loc.cameraPos = gl.getUniformLocation(program, 'u_cameraPos');
    loc.resolution = gl.getUniformLocation(program, 'u_resolution');
    loc.zoom = gl.getUniformLocation(program, 'u_zoom');
    loc.speedFraction = gl.getUniformLocation(program, 'u_speedFraction');
    loc.velocityDir = gl.getUniformLocation(program, 'u_velocityDir');
    loc.blurStart = gl.getUniformLocation(program, 'u_blurStart');
    loc.blurFull = gl.getUniformLocation(program, 'u_blurFull');

    // Generate star + dust data
    const totalCount = STAR_COUNT + DUST_COUNT;
    // Each: x, y, depth, brightness
    const data = new Float32Array(totalCount * 4);

    const expandX = (WORLD_MAX_X - WORLD_MIN_X) * 0.3;
    const expandY = (WORLD_MAX_Y - WORLD_MIN_Y) * 0.3;

    for (let i = 0; i < totalCount; i++) {
        const isDust = i >= STAR_COUNT;
        const idx = i * 4;
        data[idx + 0] = (WORLD_MIN_X - expandX) + Math.random() * (WORLD_MAX_X - WORLD_MIN_X + expandX * 2); // x
        data[idx + 1] = (WORLD_MIN_Y - expandY) + Math.random() * (WORLD_MAX_Y - WORLD_MIN_Y + expandY * 2); // y
        data[idx + 2] = isDust ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.7; // depth
        data[idx + 3] = isDust ? 0.25 + Math.random() * 0.35 : 0.15 + Math.random() * 0.5; // brightness
    }

    vertexCount = totalCount;

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const aDepth = gl.getAttribLocation(program, 'a_depth');
    const aBright = gl.getAttribLocation(program, 'a_brightness');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aDepth);
    gl.vertexAttribPointer(aDepth, 1, gl.FLOAT, false, 16, 8);

    gl.enableVertexAttribArray(aBright);
    gl.vertexAttribPointer(aBright, 1, gl.FLOAT, false, 16, 12);

    gl.bindVertexArray(null);
}

export function renderBackground(camera, playerState, speedFraction) {
    const gl = getGL();
    if (!program) return;

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(loc.cameraPos, camera.x, camera.y);
    gl.uniform2f(loc.resolution, camera.width, camera.height);
    gl.uniform1f(loc.zoom, camera.zoom);
    gl.uniform1f(loc.speedFraction, speedFraction);
    gl.uniform1f(loc.blurStart, BLUR_START);
    gl.uniform1f(loc.blurFull, BLUR_FULL);

    // Velocity direction
    const vx = playerState.ship.vx;
    const vy = playerState.ship.vy;
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0.1) {
        gl.uniform2f(loc.velocityDir, vx / speed, vy / speed);
    } else {
        gl.uniform2f(loc.velocityDir, 1, 0);
    }

    gl.drawArrays(gl.POINTS, 0, vertexCount);
    gl.bindVertexArray(null);
}
