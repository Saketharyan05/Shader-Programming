#ifdef GL_ES
precision mediump float;
#endif

// ======================================================
// PROCEDURAL ALIEN WORLD
// Final Shader Project
// Concepts:
// UV coordinates, gradients, distance fields, noise, FBM,
// procedural mountains, animated clouds, water ripples,
// ray marching, SDF sphere, normals, lighting, fog.
// ======================================================


// -------------------- NOISE --------------------

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


// -------------------- 2D HELPERS --------------------

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

    cloudUV.x += iTime * 0.025;
    cloudUV.x *= 2.0;
    cloudUV.y *= 5.0;

    float n = fbm(cloudUV);
    float clouds = smoothstep(0.46, 0.78, n);

    float verticalMask = smoothstep(0.35, 0.78, uv.y);

    return clouds * verticalMask;
}


// -------------------- SKY --------------------

vec3 sceneSky(vec2 uv, vec2 p, vec2 sunPos) {
    vec3 skyBottom = vec3(0.95, 0.34, 0.10);
    vec3 skyTop    = vec3(0.025, 0.035, 0.12);

    vec3 sky = mix(skyBottom, skyTop, uv.y);

    // Sun disc
    float sun = circle(p, sunPos, 0.12);
    sky = mix(sky, vec3(1.0, 0.82, 0.28), sun);

    // Sun glow
    float sunDist = length(p - sunPos);
    float glow = 0.018 / sunDist;
    sky += vec3(1.0, 0.35, 0.08) * glow;

    // Clouds
    float clouds = cloudLayer(uv);
    vec3 cloudColor = vec3(1.0, 0.52, 0.30);
    sky = mix(sky, cloudColor, clouds * 0.38);

    return sky;
}


// -------------------- RAY MARCHING SDF --------------------

float sphereSDF(vec3 p, float r) {
    return length(p) - r;
}

float mapScene(vec3 p) {
    // Floating alien energy orb
    vec3 orbPos = vec3(0.0, 0.1 + sin(iTime * 0.8) * 0.08, 0.0);
    float orb = sphereSDF(p - orbPos, 0.7);

    return orb;
}

float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < 90; i++) {
        vec3 p = ro + rd * t;
        float d = mapScene(p);

        if (d < 0.001) {
            return t;
        }

        t += d;

        if (t > 20.0) {
            break;
        }
    }

    return -1.0;
}

vec3 estimateNormal(vec3 p) {
    float eps = 0.001;
    vec2 e = vec2(eps, 0.0);

    return normalize(vec3(
        mapScene(p + e.xyy) - mapScene(p - e.xyy),
        mapScene(p + e.yxy) - mapScene(p - e.yxy),
        mapScene(p + e.yyx) - mapScene(p - e.yyx)
    ));
}

vec3 renderOrb(vec2 uv) {
    vec2 screen = uv * 2.0 - 1.0;
    screen.x *= iResolution.x / iResolution.y;

    // Camera for orb
    vec3 ro = vec3(0.0, 0.1, 3.3);
    vec3 rd = normalize(vec3(screen.x, screen.y - 0.05, -1.6));

    float dist = rayMarch(ro, rd);

    if (dist < 0.0) {
        return vec3(-1.0);
    }

    vec3 p = ro + rd * dist;
    vec3 n = estimateNormal(p);
    vec3 viewDir = normalize(ro - p);

    vec3 lightDir = normalize(vec3(1.5, 2.5, 3.0));

    float diffuse = max(dot(n, lightDir), 0.0);

    vec3 reflectDir = reflect(-lightDir, n);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), 48.0);

    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

    vec3 baseColor = vec3(0.3, 0.9, 1.0);

    vec3 color = baseColor * 0.18;
    color += baseColor * diffuse * 0.8;
    color += vec3(1.0, 0.9, 0.6) * specular * 0.8;
    color += vec3(0.2, 0.9, 1.0) * fresnel * 0.9;

    return color;
}


// -------------------- MAIN --------------------

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 p = uv;
    p.x *= iResolution.x / iResolution.y;

    vec2 sunPos = vec2(0.70, 0.62);
    sunPos.x *= iResolution.x / iResolution.y;

    // Base sky
    vec3 sky = sceneSky(uv, p, sunPos);
    vec3 color = sky;

    // -------------------- MOUNTAINS --------------------

    float farMountain = mountainShape(uv.x, 0.33, 0.12, 3.0, 10.0);
    float midMountain = mountainShape(uv.x, 0.26, 0.16, 4.5, 30.0);
    float nearMountain = mountainShape(uv.x, 0.16, 0.15, 7.0, 80.0);

    vec3 farColor  = vec3(0.18, 0.075, 0.09);
    vec3 midColor  = vec3(0.095, 0.040, 0.050);
    vec3 nearColor = vec3(0.030, 0.016, 0.015);

    if (uv.y < farMountain) {
        color = farColor;
    }

    if (uv.y < midMountain) {
        color = midColor;
    }

    if (uv.y < nearMountain) {
        color = nearColor;
    }


    // -------------------- WATER --------------------

    float waterLine = 0.22;

    if (uv.y < waterLine) {
        float waterDepth = uv.y / waterLine;

        vec3 deepWater = vec3(0.020, 0.022, 0.050);
        vec3 shallowWater = vec3(0.16, 0.06, 0.055);
        vec3 waterColor = mix(deepWater, shallowWater, waterDepth);

        vec2 reflectedUV = uv;
        reflectedUV.y = waterLine + (waterLine - uv.y) * 2.4;

        float n1 = fbm(vec2(uv.x * 8.0 + iTime * 0.18, uv.y * 18.0));
        float n2 = fbm(vec2(uv.x * 18.0 - iTime * 0.12, uv.y * 35.0));

        float wave = (n1 - 0.5) * 0.014;
        wave += (n2 - 0.5) * 0.006;
        wave *= (1.0 - waterDepth);

        reflectedUV.x += wave;

        vec2 reflectedP = reflectedUV;
        reflectedP.x *= iResolution.x / iResolution.y;

        vec3 reflection = sceneSky(reflectedUV, reflectedP, sunPos);

        float reflectionStrength = smoothstep(0.05, 1.0, waterDepth);
        color = mix(waterColor, reflection, reflectionStrength * 0.50);

        // Sun trail on water
        vec2 sunScreen = vec2(0.70, waterLine);
        float sunPathX = abs(uv.x - sunScreen.x);

        float sunPath = smoothstep(0.16, 0.0, sunPathX);
        sunPath *= smoothstep(0.0, 0.9, waterDepth);
        sunPath *= 0.45 + 0.55 * fbm(vec2(uv.x * 25.0, uv.y * 80.0 + iTime));

        color += vec3(1.0, 0.42, 0.12) * sunPath * 0.20;

        // Thin realistic ripples
        float ripple1 = sin(uv.y * 180.0 + iTime * 2.0 + fbm(vec2(uv.x * 6.0, uv.y * 20.0)) * 4.0);
        float ripple2 = sin(uv.y * 260.0 - iTime * 1.4 + fbm(vec2(uv.x * 10.0, uv.y * 30.0)) * 3.0);

        float ripples = ripple1 * 0.6 + ripple2 * 0.4;
        float rippleLines = smoothstep(0.72, 0.95, ripples);

        float rippleFade = (1.0 - waterDepth);
        rippleFade *= smoothstep(0.02, 0.18, uv.y);

        float brokenPattern = fbm(vec2(uv.x * 18.0 + iTime * 0.2, uv.y * 45.0));
        rippleLines *= smoothstep(0.35, 0.75, brokenPattern);

        color += vec3(1.0, 0.55, 0.25) * rippleLines * rippleFade * 0.16;

        // Mist near horizon
        float horizonMist = smoothstep(0.75, 1.0, waterDepth);
        color = mix(color, vec3(0.50, 0.20, 0.15), horizonMist * 0.16);
    }


    // -------------------- RAY-MARCHED ORB --------------------
    // The orb is placed visually above the water/mountains.
    // We blend it only in the upper middle area.

    vec3 orb = renderOrb(uv);

    if (orb.x >= 0.0 && uv.y > 0.25) {
        color = mix(color, orb, 0.85);

        // Extra outer glow around orb
        vec2 orbCenter = vec2(0.5, 0.52);
        vec2 q = uv - orbCenter;
        q.x *= iResolution.x / iResolution.y;

        float glow = 0.015 / length(q);
        color += vec3(0.1, 0.8, 1.0) * glow * 0.35;
    }


    // -------------------- FINAL POST PROCESSING --------------------

    // Subtle vignette
    vec2 centered = uv - 0.5;
    centered.x *= iResolution.x / iResolution.y;
    float vignette = smoothstep(0.9, 0.25, length(centered));
    color *= vignette;

    // Gamma correction
    color = pow(color, vec3(0.4545));

    gl_FragColor = vec4(color, 1.0);
}