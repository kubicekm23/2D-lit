let gl = null;
let _shaderErrors = [];

export function getShaderErrors() { return _shaderErrors; }

export function initWebGL(canvas) {
    gl = canvas.getContext('webgl2', { antialias: true });
    let isWebGL2 = true;
    if (!gl) {
        gl = canvas.getContext('webgl', { antialias: true }) || canvas.getContext('experimental-webgl');
        isWebGL2 = false;
    }
    if (!gl) {
        throw new Error('WebGL not supported');
    }

    // Polyfill VAO for WebGL 1
    if (!isWebGL2) {
        const vaoExt = gl.getExtension('OES_vertex_array_object');
        if (vaoExt) {
            gl.createVertexArray = () => vaoExt.createVertexArrayOES();
            gl.bindVertexArray = (vao) => vaoExt.bindVertexArrayOES(vao);
            gl.deleteVertexArray = (vao) => vaoExt.deleteVertexArrayOES(vao);
        } else {
            gl.createVertexArray = () => ({});
            gl.bindVertexArray = () => {};
            console.warn('VAO extension not supported on WebGL 1');
        }
    }

    // White background (space is white)
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl._isWebGL2 = isWebGL2;
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
    let finalSource = source;
    if (!gl._isWebGL2) {
        // Simple downgrade version 300 es to 100
        // Order matters: remove fragColor output BEFORE replacing remaining out keywords
        finalSource = source
            .replace('#version 300 es', '')
            .replace(/out\s+vec4\s+fragColor\s*;/g, '')       // remove fragColor output first
            .replace(/\bfragColor\s*=/g, 'gl_FragColor =')    // redirect writes
            .replace(/\bin\s+/g, type === gl.VERTEX_SHADER ? 'attribute ' : 'varying ')
            .replace(/\bout\s+/g, 'varying ')
            .replace(/\btexture\s*\(/g, 'texture2D(');

        // Precision is required in frag shaders in WebGL 1
        if (type === gl.FRAGMENT_SHADER && !finalSource.includes('precision ')) {
            finalSource = 'precision highp float;\n' + finalSource;
        }
    }

    const shader = gl.createShader(type);
    gl.shaderSource(shader, finalSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(shader);
        const typeName = type === gl.VERTEX_SHADER ? 'VERT' : 'FRAG';
        console.error(`Shader compile error (${typeName}):`, err);
        console.log('Source:', finalSource);
        _shaderErrors.push(`${typeName}: ${err}`);
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
