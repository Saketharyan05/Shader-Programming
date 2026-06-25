#ifdef GL_ES
precision mediump float;
#endif

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + (i.y + 1.0) * 57.0);
    float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0);

    float x1 = mix(a, b, f.x);
    float x2 = mix(c, d, f.x);

    return mix(x1, x2, f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

float circle(vec2 p, vec2 center, float radius) {
    float d = length(p - center);
    return smoothstep(radius, radius - 0.01, d);
}

float mountainShape(float x, float baseHeight, float amplitude, float scale, float offset) {
    float n = fbm(vec2(x * scale + offset, 0.0));
    return baseHeight + n * amplitude;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec2 sunPos = vec2(0.68, 0.58);
    sunPos.x *= iResolution.x / iResolution.y;

    // Sky
    vec3 skyBottom = vec3(0.95, 0.38, 0.12);
    vec3 skyTop    = vec3(0.04, 0.05, 0.18);
    vec3 sky = mix(skyBottom, skyTop, uv.y);

    // Sun
    float sun = circle(p, sunPos, 0.13);
    sky = mix(sky, vec3(1.0, 0.82, 0.28), sun);

    float sunDist = length(p - sunPos);
    float glow = 0.015 / sunDist;
    sky += vec3(1.0, 0.35, 0.08) * glow;

    vec3 color = sky;

    // Far mountain layer
    float farMountain = mountainShape(uv.x, 0.31, 0.14, 3.0, 10.0);
    vec3 farColor = vec3(0.18, 0.075, 0.09);

    if (uv.y < farMountain) {
        color = farColor;
    }

    // Middle mountain layer
    float midMountain = mountainShape(uv.x, 0.25, 0.17, 4.5, 30.0);
    vec3 midColor = vec3(0.10, 0.045, 0.055);

    if (uv.y < midMountain) {
        color = midColor;
    }

    // Near ground / mountain layer
    float nearMountain = mountainShape(uv.x, 0.16, 0.16, 7.0, 80.0);
    vec3 nearColor = vec3(0.035, 0.018, 0.015);

    if (uv.y < nearMountain) {
        color = nearColor;
    }

    gl_FragColor = vec4(color, 1.0);
}