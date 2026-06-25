#ifdef GL_ES
precision mediump float;
#endif

float circle(vec2 p, vec2 center, float radius) {
    float d = length(p - center);
    return smoothstep(radius, radius - 0.01, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // Aspect-correct coordinate system for circles
    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec2 sunPos = vec2(0.68, 0.58);
    sunPos.x *= iResolution.x / iResolution.y;

    // Sky gradient
    vec3 skyBottom = vec3(0.95, 0.38, 0.12);
    vec3 skyTop    = vec3(0.04, 0.05, 0.18);
    vec3 sky = mix(skyBottom, skyTop, uv.y);

    // Sun
    float sun = circle(p, sunPos, 0.13);
    sky = mix(sky, vec3(1.0, 0.82, 0.28), sun);

    // Sun glow
    float sunDist = length(p - sunPos);
    float glow = 0.015 / sunDist;
    sky += vec3(1.0, 0.35, 0.08) * glow;

    // Horizon
    float horizon = 0.34;

    vec3 groundNear = vec3(0.035, 0.018, 0.015);
    vec3 groundFar  = vec3(0.22, 0.07, 0.04);
    vec3 ground = mix(groundNear, groundFar, uv.y / horizon);

    vec3 color = sky;

    if (uv.y < horizon) {
        color = ground;
    }

    gl_FragColor = vec4(color, 1.0);
}