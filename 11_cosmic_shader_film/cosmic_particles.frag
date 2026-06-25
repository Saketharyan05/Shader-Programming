#ifdef GL_ES
precision mediump float;
#endif

// =====================================================
// COSMIC PARTICLES
// Music-synchronized procedural shader film
//
// Direction:
// Deep space -> particles -> chain reaction -> black hole
// -> multiverse -> life/rebirth -> silence
// =====================================================


// -----------------------------------------------------
// BASIC UTILITY FUNCTIONS
// -----------------------------------------------------

float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 aspectUV(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= iResolution.x / iResolution.y;
    return p;
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f * f * (3.0 - 2.0 * f);

    float a = hash2(i);
    float b = hash2(i + vec2(1.0, 0.0));
    float c = hash2(i + vec2(0.0, 1.0));
    float d = hash2(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;

    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}


// -----------------------------------------------------
// CINEMATIC HELPERS
// -----------------------------------------------------

float sceneFade(float t, float start, float end) {
    float fadeIn = smoothstep(start, start + 2.0, t);
    float fadeOut = 1.0 - smoothstep(end - 2.0, end, t);
    return fadeIn * fadeOut;
}

vec3 postProcess(vec3 col, vec2 uv) {
    vec2 p = aspectUV(uv);

    // Vignette: dark cinematic edges
    float vignette = smoothstep(1.45, 0.25, length(p));
    col *= vignette;

    // Tone mapping
    col = col / (col + vec3(1.0));

    // Gamma correction
    col = pow(col, vec3(0.4545));

    return col;
}


// -----------------------------------------------------
// STAR FIELD
// -----------------------------------------------------

vec3 starLayer(vec2 uv, float t, float density, float speed, float brightness) {
    vec3 col = vec3(0.0);

    vec2 movingUV = uv;
    movingUV.y += t * speed;
    movingUV.x += sin(t * 0.05) * 0.02;

    vec2 grid = movingUV * density;
    vec2 id = floor(grid);
    vec2 gv = fract(grid) - 0.5;

    float rnd = hash2(id);

    float starMask = step(0.965, rnd);

    float size = mix(0.012, 0.040, hash2(id + 12.4));
    float d = length(gv);

    float star = smoothstep(size, 0.0, d);
    float twinkle = 0.55 + 0.45 * sin(t * 2.5 + rnd * 40.0);

    vec3 coldStar = vec3(0.45, 0.65, 1.0);
    vec3 warmStar = vec3(1.0, 0.72, 0.42);
    vec3 starColor = mix(coldStar, warmStar, hash2(id + 6.8));

    col += starColor * star * starMask * twinkle * brightness;

    return col;
}


// -----------------------------------------------------
// NEBULA / COSMIC DUST
// -----------------------------------------------------

vec3 nebulaField(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    float n1 = fbm(p * 1.0 + vec2(t * 0.015, -t * 0.010));
    float n2 = fbm(p * 2.4 - vec2(t * 0.010, t * 0.018));
    float n3 = fbm(p * 4.0 + vec2(-t * 0.006, t * 0.010));

    float cloud = smoothstep(0.25, 0.95, n1 * n2 * 2.2);
    float detail = smoothstep(0.35, 0.85, n3);

    vec3 deepBlue = vec3(0.015, 0.045, 0.16);
    vec3 violet   = vec3(0.14, 0.04, 0.22);
    vec3 orange   = vec3(0.55, 0.16, 0.035);

    vec3 col = mix(deepBlue, violet, n1);
    col = mix(col, orange, n2 * 0.55);

    col *= cloud * 0.55;
    col += orange * detail * cloud * 0.10;

    return col;
}


// -----------------------------------------------------
// SHOOTING STAR / FALLING PARTICLE
// -----------------------------------------------------

vec3 shootingStar(vec2 uv, float t, float offset, vec2 start, vec2 dir, vec3 color) {
    vec2 p = aspectUV(uv);

    float localTime = mod(t + offset, 7.0);

    vec2 direction = normalize(dir);
    vec2 pos = start + direction * localTime * 0.55;

    vec2 rel = p - pos;

    float along = dot(rel, direction);
    float across = length(rel - direction * along);

    float head = smoothstep(0.045, 0.0, length(rel));

    float trail = smoothstep(0.030, 0.0, across);
    trail *= smoothstep(-0.85, 0.0, along);
    trail *= smoothstep(0.18, 0.0, along);

    return color * head * 1.5 + color * trail * 0.75;
}


// -----------------------------------------------------
// PARTICLE RING SYSTEM
// -----------------------------------------------------

vec3 vibratingParticles(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);

    vec3 col = vec3(0.0);

    float particleCount = 80.0;

    for (int i = 0; i < 80; i++) {
        float fi = float(i);

        float rnd1 = hash(fi * 12.31);
        float rnd2 = hash(fi * 43.17);
        float rnd3 = hash(fi * 91.73);

        float angle = rnd1 * 6.2831853;

        // Radius slowly grows with time
        float baseRadius = mix(0.05, 1.05, rnd2);
        float pulse = sin(t * 4.0 + fi * 0.7) * 0.035 * intensity;
        float radius = baseRadius + pulse;

        // Rotation becomes stronger as music builds
        float rotation = t * (0.08 + rnd3 * 0.15) * intensity;

        vec2 pos = vec2(cos(angle + rotation), sin(angle + rotation)) * radius;

        // Atomic vibration feeling
        pos += vec2(
            sin(t * 8.0 + fi) * 0.015,
            cos(t * 7.0 + fi * 1.3) * 0.015
        ) * intensity;

        float d = length(p - pos);

        float particle = smoothstep(0.025, 0.0, d);

        vec3 blue = vec3(0.20, 0.65, 1.0);
        vec3 orange = vec3(1.0, 0.36, 0.08);

        vec3 particleColor = mix(blue, orange, rnd3);

        col += particleColor * particle * (0.55 + intensity * 1.4);
    }

    return col;
}


// -----------------------------------------------------
// SCENE 1: DEEP SPACE AWAKENING
// 0s - 15s
// -----------------------------------------------------

vec3 sceneDeepSpace(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 col = vec3(0.002, 0.004, 0.014);

    // Very subtle central depth
    col += vec3(0.010, 0.018, 0.055) * (1.0 - length(p) * 0.35);

    // Nebula slowly appears
    float nebulaAppear = smoothstep(2.0, 12.0, t);
    col += nebulaField(uv, t) * nebulaAppear;

    // Star layers
    col += starLayer(uv, t, 42.0, 0.003, 0.90);
    col += starLayer(uv * 1.35 + 0.13, t, 75.0, 0.008, 0.60);
    col += starLayer(uv * 1.90 - 0.27, t, 120.0, 0.014, 0.42);

    // One or two falling stars, but subtle
    col += shootingStar(
        uv,
        t,
        0.0,
        vec2(-1.25, 0.78),
        vec2(1.6, -0.65),
        vec3(0.45, 0.70, 1.0)
    ) * smoothstep(4.0, 9.0, t);

    // First invisible energy point begins
    float d = length(p);
    float awakening = smoothstep(9.0, 15.0, t);
    float glow = 0.008 / (d + 0.04);

    col += vec3(0.15, 0.35, 1.0) * glow * awakening;

    return col;
}


// -----------------------------------------------------
// SCENE 2: PARTICLES AWAKENING
// 15s - 30s
// -----------------------------------------------------

vec3 sceneParticlesAwakening(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 col = sceneDeepSpace(uv, 15.0 + t);

    float build = smoothstep(0.0, 15.0, t);

    // Central blue-orange core
    float d = length(p);

    float core = 0.020 / (d + 0.020);
    float pulse = 0.65 + 0.35 * sin(t * 4.5);

    vec3 coreColor = mix(
        vec3(0.15, 0.45, 1.0),
        vec3(1.0, 0.35, 0.08),
        smoothstep(7.0, 15.0, t)
    );

    col += coreColor * core * pulse * build;

    // Particles appear around the center
    col += vibratingParticles(uv, t, build);

    // First weak shock rings
    float ring = abs(sin(d * 32.0 - t * 4.0));
    ring = smoothstep(0.94, 1.0, ring);
    ring *= smoothstep(5.0, 15.0, t);

    col += vec3(0.3, 0.7, 1.0) * ring * 0.35;

    // More shooting/falling stars as intensity grows
    col += shootingStar(
        uv,
        t,
        1.5,
        vec2(-1.3, 0.95),
        vec2(1.9, -0.9),
        vec3(0.55, 0.75, 1.0)
    ) * build;

    col += shootingStar(
        uv,
        t,
        4.0,
        vec2(1.25, 0.80),
        vec2(-1.5, -0.75),
        vec3(1.0, 0.55, 0.25)
    ) * build * 0.65;

    return col;
}


// -----------------------------------------------------
// TEMPORARY PLACEHOLDER SCENES
// These will be replaced one by one.
// -----------------------------------------------------

vec3 sceneCosmicReaction(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    vec3 col = sceneParticlesAwakening(uv, 15.0);

    float d = length(p);

    float explosion = smoothstep(0.0, 10.0, t);

    float core = 0.040 / (d + 0.020);
    col += vec3(1.0, 0.35, 0.06) * core * explosion;

    float ring = smoothstep(0.030, 0.0, abs(d - t * 0.045));
    col += vec3(1.0, 0.60, 0.15) * ring * 2.0;

    col += vibratingParticles(uv, t * 1.5, explosion) * 1.3;

    return col;
}

vec3 sceneBlackHole(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float d = length(p);

    vec2 warpedUV = uv;

    // Pull stars toward center
    float pull = smoothstep(0.0, 8.0, t) * 0.12 / (d + 0.12);
    warpedUV += normalize(p) * pull;

    vec3 col = sceneDeepSpace(warpedUV, 45.0 + t);

    float blackDisk = smoothstep(0.25, 0.18, d);
    col = mix(col, vec3(0.0), blackDisk);

    float ring = smoothstep(0.055, 0.0, abs(d - 0.34));
    col += vec3(1.0, 0.42, 0.08) * ring * 1.8;

    float blueOuter = smoothstep(0.04, 0.0, abs(d - 0.47));
    col += vec3(0.2, 0.55, 1.0) * blueOuter * 0.8;

    return col;
}

vec3 sceneMultiverse(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    float open = smoothstep(0.0, 8.0, t);

    vec2 leftP = p + vec2(0.58, 0.0);
    vec2 rightP = p - vec2(0.58, 0.0);

    float leftPortal = smoothstep(0.58, 0.42, length(leftP)) * open;
    float rightPortal = smoothstep(0.58, 0.42, length(rightP)) * open;

    vec2 uvLeft = uv + vec2(0.10 * sin(t), 0.08 * cos(t * 0.7));
    vec2 uvRight = uv - vec2(0.12 * cos(t * 0.9), 0.06 * sin(t));

    col += sceneDeepSpace(uvLeft, 60.0 + t) * leftPortal * vec3(0.7, 0.9, 1.5);
    col += sceneDeepSpace(uvRight, 75.0 + t) * rightPortal * vec3(1.4, 0.75, 0.45);

    float edgeLeft = smoothstep(0.035, 0.0, abs(length(leftP) - 0.50));
    float edgeRight = smoothstep(0.035, 0.0, abs(length(rightP) - 0.50));

    col += vec3(0.25, 0.85, 1.0) * edgeLeft * open;
    col += vec3(1.0, 0.40, 0.12) * edgeRight * open;

    // Central fracture
    float crack = smoothstep(0.025, 0.0, abs(p.x + sin(p.y * 12.0 + t) * 0.03));
    col += vec3(1.0, 0.9, 0.55) * crack * 0.25 * open;

    return col;
}

vec3 sceneLifeAndRebirth(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 col = sceneDeepSpace(uv, 90.0 + t) * 0.45;

    vec2 cells = p * 5.5;
    vec2 id = floor(cells);
    vec2 gv = fract(cells);

    float minDist = 10.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 cellId = id + offset;

            vec2 point = vec2(
                hash2(cellId),
                hash2(cellId + 19.7)
            );

            point = 0.5 + 0.35 * sin(t * 1.5 + 6.2831 * point);

            vec2 diff = offset + point - gv;
            minDist = min(minDist, length(diff));
        }
    }

    float life = smoothstep(0.10, 0.025, minDist);
    float appear = smoothstep(0.0, 6.0, t);

    col += vec3(0.10, 1.0, 0.55) * life * appear;

    float d = length(p);
    float core = 0.025 / (d + 0.025);
    col += vec3(0.15, 1.0, 0.60) * core * appear;

    return col;
}

vec3 energyRays(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);

    float angle = atan(p.y, p.x);
    float radius = length(p);

    float rays = sin(angle * 18.0 + t * 4.0);
    rays += sin(angle * 31.0 - t * 2.7) * 0.5;

    rays = smoothstep(0.55, 1.0, rays);

    float radialFade = smoothstep(1.25, 0.05, radius);
    float coreBlock = smoothstep(0.06, 0.22, radius);

    vec3 rayColor = mix(
        vec3(0.15, 0.55, 1.0),
        vec3(1.0, 0.35, 0.05),
        0.5 + 0.5 * sin(t * 1.5)
    );

    return rayColor * rays * radialFade * coreBlock * intensity;
}

vec3 explosionParticles(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);

    vec3 col = vec3(0.0);

    for (int i = 0; i < 100; i++) {
        float fi = float(i);

        float rnd1 = hash(fi * 11.13);
        float rnd2 = hash(fi * 31.71);
        float rnd3 = hash(fi * 71.91);

        float angle = rnd1 * 6.2831853;

        float speed = mix(0.25, 1.35, rnd2);
        float radius = t * 0.085 * speed;

        // particles start near center and fly outward
        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 pos = dir * radius;

        // slight spiral turbulence
        pos += vec2(
            sin(t * 3.0 + fi) * 0.035,
            cos(t * 2.5 + fi * 1.2) * 0.035
        ) * intensity;

        float d = length(p - pos);

        float size = mix(0.010, 0.026, rnd3);
        float particle = smoothstep(size, 0.0, d);

        float fade = 1.0 - smoothstep(0.0, 1.55, radius);

        vec3 blue = vec3(0.15, 0.55, 1.0);
        vec3 orange = vec3(1.0, 0.38, 0.07);
        vec3 whiteHot = vec3(1.0, 0.85, 0.45);

        vec3 particleColor = mix(blue, orange, rnd3);
        particleColor = mix(particleColor, whiteHot, smoothstep(0.0, 4.0, t));

        col += particleColor * particle * fade * intensity * 1.8;
    }

    return col;
}

vec3 sceneCosmicReaction(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float d = length(p);

    // Start from the previous particle awakening scene
    vec3 col = sceneParticlesAwakening(uv, 15.0);

    // Scene intensity rises with time
    float build = smoothstep(0.0, 8.0, t);
    float peak = smoothstep(5.0, 12.0, t);
    float finalFlash = smoothstep(11.0, 14.5, t);

    // Background darkens slightly so the explosion is clearer
    col *= mix(1.0, 0.45, build);

    // Central atomic core
    float corePulse = 0.65 + 0.35 * sin(t * 8.0);
    float core = 0.050 / (d + 0.025);
    vec3 coreColor = mix(
        vec3(0.15, 0.55, 1.0),
        vec3(1.0, 0.32, 0.04),
        smoothstep(3.0, 10.0, t)
    );

    col += coreColor * core * corePulse * build;

    // White-hot inner core
    float innerCore = smoothstep(0.10, 0.0, d);
    col += vec3(1.0, 0.85, 0.45) * innerCore * build * 1.8;

    // Expanding shockwaves
    float r1 = smoothstep(0.020, 0.0, abs(d - t * 0.055));
    float r2 = smoothstep(0.018, 0.0, abs(d - (t * 0.075 - 0.25)));
    float r3 = smoothstep(0.016, 0.0, abs(d - (t * 0.095 - 0.55)));

    col += vec3(1.0, 0.55, 0.10) * r1 * 2.2;
    col += vec3(0.20, 0.65, 1.0) * r2 * 1.5;
    col += vec3(1.0, 0.25, 0.05) * r3 * 1.2;

    // Radial energy rays
    col += energyRays(uv, t, build * 0.95);

    // Outward flying particles
    col += explosionParticles(uv, t, build);

    // Existing vibrating particles, but stronger
    col += vibratingParticles(uv, t * 1.6, build) * 1.6;

    // Momentary flash near the end of scene
    col += vec3(1.0, 0.75, 0.35) * finalFlash * 0.9;

    // Radial dark vignette to keep center readable
    float focus = smoothstep(1.4, 0.15, d);
    col *= mix(0.75, 1.25, focus);

    return col;
}


// -----------------------------------------------------
// MAIN TIMELINE
// -----------------------------------------------------

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // Track length is around 104 seconds
    float totalTime = 104.0;
    float time = mod(iTime, totalTime);

    vec3 color;

    if (time < 15.0) {
        color = sceneDeepSpace(uv, time);
    } else if (time < 30.0) {
        color = sceneParticlesAwakening(uv, time - 15.0);
    } else if (time < 45.0) {
        color = sceneCosmicReaction(uv, time - 30.0);
    } else if (time < 60.0) {
        color = sceneBlackHole(uv, time - 45.0);
    } else if (time < 75.0) {
        color = sceneMultiverse(uv, time - 60.0);
    } else if (time < 95.0) {
        color = sceneLifeAndRebirth(uv, time - 75.0);
    } else {
        color = sceneFinalSilence(uv, time - 95.0);
    }

    color = postProcess(color, uv);

    gl_FragColor = vec4(color, 1.0);
}