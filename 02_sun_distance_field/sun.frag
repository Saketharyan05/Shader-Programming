#ifdef GL_ES
precision mediump float;
#endif

float circle(vec2 uv, vec2 center, float radius) {
    float d = length(uv - center);
    return smoothstep(radius, radius - 0.01, d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec3 bottomColor = vec3(1.0, 0.45, 0.15);
    vec3 topColor    = vec3(0.05, 0.08, 0.25);

    vec3 color = mix(bottomColor, topColor, uv.y);

    float sun = circle(uv, vec2(0.72, 0.62), 0.12);
    vec3 sunColor = vec3(1.0, 0.85, 0.35);

    color = mix(color, sunColor, sun);

    gl_FragColor = vec4(color, 1.0);
}