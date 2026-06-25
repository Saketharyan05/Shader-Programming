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

float cloudLayer(vec2 uv) {
    vec2 cloudUV = uv;
    cloudUV.x += iTime * 0.035;

    cloudUV.x *= 2.0;
    cloudUV.y *= 5.0;

    float n = fbm(cloudUV);
    float clouds = smoothstep(0.45, 0.78, n);

    float verticalMask = smoothstep(0.35, 0.75, uv.y);

    return clouds * verticalMask;
}

vec3 sceneSky(vec2 uv, vec2 p, vec2 sunPos) {
    vec3 skyBottom = vec3(0.95, 0.38, 0.12);
    vec3 skyTop    = vec3(0.04, 0.05, 0.18);
    vec3 sky = mix(skyBottom, skyTop, uv.y);

    float sun = circle(p, sunPos, 0.13);
    sky = mix(sky, vec3(1.0, 0.82, 0.28), sun);

    float sunDist = length(p - sunPos);
    float glow = 0.015 / sunDist;
    sky += vec3(1.0, 0.35, 0.08) * glow;

    float clouds = cloudLayer(uv);
    vec3 cloudColor = vec3(1.0, 0.55, 0.35);
    sky = mix(sky, cloudColor, clouds * 0.45);

    return sky;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec2 sunPos = vec2(0.68, 0.58);
    sunPos.x *= iResolution.x / iResolution.y;

    vec3 sky = sceneSky(uv, p, sunPos);
    vec3 color = sky;

    // Mountain layers
    float farMountain = mountainShape(uv.x, 0.31, 0.14, 3.0, 10.0);
    float midMountain = mountainShape(uv.x, 0.25, 0.17, 4.5, 30.0);
    float nearMountain = mountainShape(uv.x, 0.16, 0.16, 7.0, 80.0);

    vec3 farColor  = vec3(0.18, 0.075, 0.09);
    vec3 midColor  = vec3(0.10, 0.045, 0.055);
    vec3 nearColor = vec3(0.035, 0.018, 0.015);

    if (uv.y < farMountain) {
        color = farColor;
    }

    if (uv.y < midMountain) {
        color = midColor;
    }

    if (uv.y < nearMountain) {
        color = nearColor;
    }

    // Water area
    float waterLine = 0.22;

    if (uv.y < waterLine) {
        // 0 at bottom, 1 near horizon
        float waterDepth = uv.y / waterLine;

        // Base water color: darker near viewer, warmer near horizon
        vec3 deepWater = vec3(0.025, 0.025, 0.055);
        vec3 shallowWater = vec3(0.18, 0.07, 0.06);
        vec3 waterColor = mix(deepWater, shallowWater, waterDepth);

        // Mirror UV for reflection
        vec2 reflectedUV = uv;
        reflectedUV.y = waterLine + (waterLine - uv.y) * 2.4;

        // Irregular wave distortion using fbm, not only sine
        float n1 = fbm(vec2(uv.x * 8.0 + iTime * 0.18, uv.y * 18.0));
        float n2 = fbm(vec2(uv.x * 18.0 - iTime * 0.12, uv.y * 35.0));

        float wave = (n1 - 0.5) * 0.025;
        wave += (n2 - 0.5) * 0.010;

        // Waves should be stronger near the viewer, weaker near horizon
        wave *= (1.0 - waterDepth);

        reflectedUV.x += wave;

        vec2 reflectedP = reflectedUV;
        reflectedP.x *= iResolution.x / iResolution.y;

        vec3 reflection = sceneSky(reflectedUV, reflectedP, sunPos);

        // Reflection stronger near horizon, weaker near bottom
        float reflectionStrength = smoothstep(0.05, 1.0, waterDepth);
        color = mix(waterColor, reflection, reflectionStrength * 0.55);

        // Long soft sun reflection path
        vec2 sunScreen = vec2(0.68, waterLine);
        float sunPathX = abs(uv.x - sunScreen.x);
        float sunPathY = waterDepth;

        float sunPath = smoothstep(0.18, 0.0, sunPathX);
        sunPath *= smoothstep(0.0, 0.9, sunPathY);
        sunPath *= 0.5 + 0.5 * fbm(vec2(uv.x * 25.0, uv.y * 80.0 + iTime));

        color += vec3(1.0, 0.45, 0.15) * sunPath * 0.22;

        // Realistic thin horizontal water ripples
        float ripple1 = sin(uv.y * 180.0 + iTime * 2.0 + fbm(vec2(uv.x * 6.0, uv.y * 20.0)) * 4.0);
        float ripple2 = sin(uv.y * 260.0 - iTime * 1.4 + fbm(vec2(uv.x * 10.0, uv.y * 30.0)) * 3.0);

        // Combine two ripple frequencies
        float ripples = ripple1 * 0.6 + ripple2 * 0.4;

        // Convert sine waves into thin bright lines
        float rippleLines = smoothstep(0.72, 0.95, ripples);

        // Stronger near viewer, softer near horizon
        float rippleFade = (1.0 - waterDepth);
        rippleFade *= smoothstep(0.02, 0.18, uv.y);

        // Break the lines so they are not perfectly continuous
        float brokenPattern = fbm(vec2(uv.x * 18.0 + iTime * 0.2, uv.y * 45.0));
        rippleLines *= smoothstep(0.35, 0.75, brokenPattern);

        // Add warm highlights
        color += vec3(1.0, 0.55, 0.25) * rippleLines * rippleFade * 0.18;

        // Slight fog near water horizon
        float horizonMist = smoothstep(0.75, 1.0, waterDepth);
        color = mix(color, vec3(0.55, 0.22, 0.16), horizonMist * 0.18);
    }
        gl_FragColor = vec4(color, 1.0);
}