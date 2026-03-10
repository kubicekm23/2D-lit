// ─── Background stars/dust ───────────────────────────────
export const bgVertSrc = `#version 300 es
precision highp float;

in vec2 a_position;   // star world position
in float a_depth;     // 0.3 - 1.0 parallax depth
in float a_brightness;// 0.1 - 0.6

uniform vec2 u_cameraPos;
uniform vec2 u_resolution;
uniform float u_zoom;

out float v_brightness;
out float v_depth;

void main() {
    // Parallax: deeper stars move less
    vec2 parallax = a_position - u_cameraPos * a_depth;
    vec2 screen = parallax * u_zoom / (u_resolution * 0.5);
    gl_Position = vec4(screen, 0.0, 1.0);
    gl_PointSize = mix(1.5, 4.0, a_depth);
    v_brightness = a_brightness;
    v_depth = a_depth;
}
`;

export const bgFragSrc = `#version 300 es
precision highp float;

in float v_brightness;
in float v_depth;

uniform float u_speedFraction; // 0..1
uniform vec2 u_velocityDir;    // normalized
uniform float u_blurStart;     // 0.3
uniform float u_blurFull;      // 0.8

out vec4 fragColor;

void main() {
    vec2 coord = gl_PointCoord - 0.5;

    // Blur factor based on speed
    float blur = smoothstep(u_blurStart, u_blurFull, u_speedFraction);

    // Stretch point along velocity direction
    float stretch = 1.0 + blur * 8.0 * v_depth;
    // Rotate coord to align with velocity
    float angle = atan(u_velocityDir.y, u_velocityDir.x);
    float c = cos(-angle), s = sin(-angle);
    vec2 rotated = vec2(c * coord.x - s * coord.y, s * coord.x + c * coord.y);
    rotated.x *= stretch;

    float dist = length(rotated);
    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);

    if (alpha < 0.01) discard;

    // Grey tone on white background
    float grey = 1.0 - v_brightness;
    fragColor = vec4(grey, grey, grey, alpha);
}
`;

// ─── Ship renderer ───────────────────────────────────────
export const shipVertSrc = `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_shipPos;
uniform float u_rotation;
uniform vec2 u_cameraPos;
uniform vec2 u_resolution;
uniform float u_zoom;
uniform float u_scale;

void main() {
    // Rotate vertex
    float c = cos(u_rotation), s = sin(u_rotation);
    vec2 rotated = vec2(
        a_position.x * c - a_position.y * s,
        a_position.x * s + a_position.y * c
    );
    vec2 worldPos = rotated * u_scale + u_shipPos;
    vec2 screen = (worldPos - u_cameraPos) * u_zoom / (u_resolution * 0.5);
    gl_Position = vec4(screen, 0.0, 1.0);
}
`;

export const shipFragSrc = `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Solid black
}
`;

// ─── Station renderer ────────────────────────────────────
export const stationVertSrc = `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_stationPos;
uniform vec2 u_cameraPos;
uniform vec2 u_resolution;
uniform float u_zoom;
uniform float u_scale;

void main() {
    vec2 worldPos = a_position * u_scale + u_stationPos;
    vec2 screen = (worldPos - u_cameraPos) * u_zoom / (u_resolution * 0.5);
    gl_Position = vec4(screen, 0.0, 1.0);
}
`;

export const stationFragSrc = `#version 300 es
precision highp float;

uniform vec4 u_color;
out vec4 fragColor;

void main() {
    fragColor = u_color;
}
`;

// ─── World boundary indicator ────────────────────────────
export const boundaryVertSrc = `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_cameraPos;
uniform vec2 u_resolution;
uniform float u_zoom;

void main() {
    vec2 screen = (a_position - u_cameraPos) * u_zoom / (u_resolution * 0.5);
    gl_Position = vec4(screen, 0.0, 1.0);
}
`;

export const boundaryFragSrc = `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(0.7, 0.7, 0.7, 0.5);
}
`;
