let gl = null;

export function initWebGL(canvas) {
    gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) {
        gl = canvas.getContext('webgl', { antialias: true });
    }
    if (!gl) {
        throw new Error('WebGL not supported');
    }

    // White background (space is white)
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    return gl;
}

export function getGL() {
    return gl;
}

export function resizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
    }
}

export function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export function createProgram(vertSrc, fragSrc) {
    const vert = compileShader(vertSrc, gl.VERTEX_SHADER);
    const frag = compileShader(fragSrc, gl.FRAGMENT_SHADER);
    if (!vert || !frag) return null;

    const program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }

    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
}
