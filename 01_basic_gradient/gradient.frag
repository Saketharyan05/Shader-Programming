#ifdef GL_ES
precision mediump float;
#endif

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec3 bottomColor = vec3(1.0, 0.45, 0.15);
    vec3 topColor    = vec3(0.05, 0.08, 0.25);

    vec3 color = mix(bottomColor, topColor, uv.y);

    gl_FragColor = vec4(color, 1.0);
}