#ifdef GL_ES
precision highp float;
#endif

// =====================================================
// COSMIC PARTICLES
// Music-synchronized procedural shader film
// Shader Programming Project
//
// Story:
// Deep space -> particle awakening -> cosmic reaction
// -> black hole -> multiverse split -> life/rebirth
// -> final silence
//
// Built with:
// UV coordinates, hash/random, noise, FBM, star fields,
// nebula fields, shooting stars, particle systems,
// radial shockwaves, gravitational distortion,
// accretion disk, portal universes, cellular/Voronoi patterns,
// DNA-like spiral, cinematic transitions, intensity pulse,
// camera shake, vignette, tone mapping, gamma correction,
// 3D ray generation, analytic sphere intersection,
// sphere tracing / ray marching, SDF tunnel, normals,
// lighting, reflections, and stochastic-style jitter.
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
// CINEMATIC / TIMELINE HELPERS
// -----------------------------------------------------

float transitionWeight(float time, float start, float duration) {
    return smoothstep(start, start + duration, time);
}

vec3 crossFade(vec3 a, vec3 b, float w) {
    return mix(a, b, clamp(w, 0.0, 1.0));
}

float musicIntensity(float time) {
    float intensity = 0.0;

    if (time < 15.0) {
        intensity = smoothstep(5.0, 15.0, time) * 0.25;
    }
    else if (time < 30.0) {
        intensity = mix(0.25, 0.55, smoothstep(15.0, 30.0, time));
    }
    else if (time < 48.0) {
        intensity = mix(0.55, 1.00, smoothstep(30.0, 48.0, time));
    }
    else if (time < 65.0) {
        intensity = 0.80 + 0.20 * sin(time * 0.8);
    }
    else if (time < 82.0) {
        intensity = 0.75 + 0.25 * sin(time * 1.3);
    }
    else if (time < 98.0) {
        intensity = mix(0.70, 0.45, smoothstep(82.0, 98.0, time));
    }
    else {
        intensity = mix(0.35, 0.0, smoothstep(98.0, 104.0, time));
    }

    return clamp(intensity, 0.0, 1.0);
}

float beatPulse(float time, float intensity) {
    float slowPulse = pow(0.5 + 0.5 * sin(time * 2.2), 3.0);
    float fastPulse = pow(0.5 + 0.5 * sin(time * 7.5), 6.0);

    return mix(slowPulse, fastPulse, intensity) * intensity;
}

vec2 cameraShakeOffset(float time, float intensity) {
    float shakeAmount = smoothstep(0.55, 1.0, intensity);

    float frame = floor(time * 18.0);
    float nextFrame = frame + 1.0;
    float f = fract(time * 18.0);
    f = f * f * (3.0 - 2.0 * f);

    vec2 a = vec2(hash(frame * 12.31), hash(frame * 41.77)) - 0.5;
    vec2 b = vec2(hash(nextFrame * 12.31), hash(nextFrame * 41.77)) - 0.5;

    vec2 shake = mix(a, b, f);

    return shake * 0.010 * shakeAmount;
}

vec3 globalIntensityGlow(vec2 uv, float time, float intensity) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float pulse = beatPulse(time, intensity);

    vec3 blueGlow = vec3(0.12, 0.45, 1.0);
    vec3 orangeGlow = vec3(1.0, 0.35, 0.08);

    vec3 glowColor = mix(blueGlow, orangeGlow, smoothstep(30.0, 55.0, time));
    float radial = 0.012 / (r + 0.08);

    return glowColor * radial * pulse * 0.45;
}

vec3 transitionFlash(vec2 uv, float time, float centerTime, vec3 flashColor, float strength) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float pulse = 1.0 - smoothstep(0.0, 1.0, abs(time - centerTime));
    float radial = smoothstep(1.1, 0.0, r);

    return flashColor * pulse * radial * strength;
}

vec3 postProcess(vec3 col, vec2 uv) {
    vec2 p = aspectUV(uv);

    float vignette = smoothstep(1.45, 0.25, length(p));
    col *= vignette;

    // Tone mapping to avoid pure overexposure
    col = col / (col + vec3(1.0));

    // Gamma correction
    col = pow(col, vec3(0.4545));

    return col;
}

// -----------------------------------------------------
// STAR FIELD / NEBULA / METEORS
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
// PARTICLE SYSTEMS
// -----------------------------------------------------

vec3 vibratingParticles(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    for (int i = 0; i < 80; i++) {
        float fi = float(i);

        float rnd1 = hash(fi * 12.31);
        float rnd2 = hash(fi * 43.17);
        float rnd3 = hash(fi * 91.73);

        float angle = rnd1 * 6.2831853;

        float baseRadius = mix(0.05, 1.05, rnd2);
        float pulse = sin(t * 4.0 + fi * 0.7) * 0.035 * intensity;
        float radius = baseRadius + pulse;

        float rotation = t * (0.08 + rnd3 * 0.15) * intensity;

        vec2 pos = vec2(cos(angle + rotation), sin(angle + rotation)) * radius;

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

        vec2 dir = vec2(cos(angle), sin(angle));
        vec2 pos = dir * radius;

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

// -----------------------------------------------------
// BLACK HOLE HELPERS
// -----------------------------------------------------

vec3 blackHoleAccretionDisk(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    float r = length(p);
    float a = atan(p.y, p.x);

    float diskY = p.y * 2.8;
    float diskR = length(vec2(p.x, diskY));

    float swirl = a * 3.0 + t * 2.2 + 1.8 / (r + 0.12);
    float bands = sin(swirl * 3.0 + diskR * 22.0);

    float disk = smoothstep(0.52, 0.26, diskR);
    disk *= smoothstep(0.16, 0.28, r);

    float bandMask = 0.55 + 0.45 * bands;

    vec3 orange = vec3(1.0, 0.36, 0.05);
    vec3 yellow = vec3(1.0, 0.78, 0.25);
    vec3 blue   = vec3(0.18, 0.55, 1.0);

    vec3 diskColor = mix(orange, yellow, bandMask);
    diskColor = mix(diskColor, blue, smoothstep(0.42, 0.55, diskR) * 0.35);

    return diskColor * disk * (1.4 + bandMask * 0.8);
}

vec3 gravitationalStarBending(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    vec2 dir = normalize(p + 0.0001);

    float lensStrength = 0.20 / (r + 0.18);
    float rotation = 0.45 / (r + 0.25);

    float ca = cos(rotation);
    float sa = sin(rotation);

    vec2 rotated = vec2(
        p.x * ca - p.y * sa,
        p.x * sa + p.y * ca
    );

    vec2 warpedP = mix(p, rotated, 0.85);
    warpedP -= dir * lensStrength;

    vec2 warpedUV = warpedP;
    warpedUV.x /= iResolution.x / iResolution.y;
    warpedUV = warpedUV * 0.5 + 0.5;

    vec3 stars = vec3(0.0);

    stars += starLayer(warpedUV, t, 60.0, 0.020, 1.0);
    stars += starLayer(warpedUV * 1.4 + 0.2, t, 100.0, 0.035, 0.65);
    stars += starLayer(warpedUV * 1.9 - 0.3, t, 150.0, 0.050, 0.45);

    float lensGlow = smoothstep(0.55, 0.20, r) * smoothstep(0.12, 0.28, r);
    stars += vec3(0.25, 0.55, 1.0) * lensGlow * 0.20;

    return stars;
}

// -----------------------------------------------------
// MULTIVERSE HELPERS
// -----------------------------------------------------

vec3 portalUniverse(vec2 uv, vec2 center, float radius, float t, vec3 tint, float seed) {
    vec2 p = aspectUV(uv);

    vec2 q = p - center;
    float d = length(q);

    float mask = smoothstep(radius, radius - 0.04, d);
    float edge = smoothstep(0.035, 0.0, abs(d - radius));

    float swirl = 0.8 / (d + 0.15) + t * 0.35 + seed;
    float ca = cos(swirl);
    float sa = sin(swirl);

    vec2 rotated = vec2(
        q.x * ca - q.y * sa,
        q.x * sa + q.y * ca
    );

    vec2 innerUV = rotated;
    innerUV.x /= iResolution.x / iResolution.y;
    innerUV = innerUV * 0.5 + 0.5;

    vec3 universe = vec3(0.0);
    universe += nebulaField(innerUV + seed, t + seed * 10.0) * 0.8;
    universe += starLayer(innerUV + seed * 0.13, t, 55.0, 0.020, 0.95);
    universe += starLayer(innerUV * 1.6 + seed, t, 105.0, 0.035, 0.55);

    universe *= tint;

    vec3 rimColor = tint * 1.4 + vec3(0.15, 0.25, 0.35);
    vec3 rim = rimColor * edge * 2.0;

    float innerGlow = smoothstep(radius, 0.0, d);
    universe += tint * innerGlow * 0.10;

    return universe * mask + rim;
}

vec3 realityFracture(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    float crackShape = p.x + sin(p.y * 10.0 + t * 2.0) * 0.035;
    float crack = smoothstep(0.030, 0.0, abs(crackShape));

    float branch1 = abs(p.x - 0.20 * sin(p.y * 4.0 + t) - 0.18);
    float branch2 = abs(p.x + 0.18 * sin(p.y * 5.0 - t * 0.8) + 0.22);

    float branches = smoothstep(0.018, 0.0, branch1) * smoothstep(0.8, 0.15, abs(p.y));
    branches += smoothstep(0.018, 0.0, branch2) * smoothstep(0.8, 0.15, abs(p.y));

    vec3 crackColor = vec3(0.8, 0.95, 1.0);

    col += crackColor * crack * intensity * 1.5;
    col += vec3(1.0, 0.45, 0.12) * branches * intensity * 0.7;

    return col;
}

vec3 energyConnection(vec2 uv, vec2 a, vec2 b, float t, vec3 color) {
    vec2 p = aspectUV(uv);

    vec2 pa = p - a;
    vec2 ba = b - a;

    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    vec2 closest = a + ba * h;

    float d = length(p - closest);
    float line = smoothstep(0.025, 0.0, d);

    float n = fbm(vec2(h * 12.0, t * 0.8));
    line *= smoothstep(0.25, 0.75, n);

    float pulse = 0.5 + 0.5 * sin(t * 5.0 + h * 12.0);

    return color * line * pulse * 0.75;
}

// -----------------------------------------------------
// LIFE / REBIRTH HELPERS
// -----------------------------------------------------

vec3 organicCellField(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    vec2 cells = p * 5.8;
    vec2 id = floor(cells);
    vec2 gv = fract(cells);

    float minDist = 10.0;
    float secondDist = 10.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 cellId = id + offset;

            vec2 point = vec2(hash2(cellId), hash2(cellId + 19.7));
            point = 0.5 + 0.32 * sin(t * 1.4 + 6.2831 * point);

            vec2 diff = offset + point - gv;
            float d = length(diff);

            if (d < minDist) {
                secondDist = minDist;
                minDist = d;
            } else if (d < secondDist) {
                secondDist = d;
            }
        }
    }

    float membrane = smoothstep(0.055, 0.015, abs(secondDist - minDist));
    float cellGlow = smoothstep(0.22, 0.02, minDist);

    vec3 green = vec3(0.08, 1.00, 0.52);
    vec3 cyan  = vec3(0.12, 0.75, 1.00);
    vec3 gold  = vec3(1.00, 0.70, 0.25);

    float colorShift = 0.5 + 0.5 * sin(t * 0.7 + p.x * 2.0);
    vec3 cellColor = mix(green, cyan, colorShift);

    col += cellColor * membrane * intensity * 1.2;
    col += mix(cellColor, gold, 0.25) * cellGlow * intensity * 0.20;

    return col;
}

vec3 dnaSpiral(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    float y = p.y;
    float x = p.x;

    float strandA = sin(y * 9.0 + t * 2.2) * 0.22;
    float strandB = sin(y * 9.0 + t * 2.2 + 3.14159) * 0.22;

    float dA = abs(x - strandA);
    float dB = abs(x - strandB);

    float lineA = smoothstep(0.025, 0.0, dA);
    float lineB = smoothstep(0.025, 0.0, dB);

    float verticalFade = smoothstep(-0.85, -0.20, y) * (1.0 - smoothstep(0.25, 0.90, y));

    col += vec3(0.10, 0.95, 0.55) * lineA * verticalFade;
    col += vec3(0.20, 0.75, 1.00) * lineB * verticalFade;

    float bars = abs(fract((y + t * 0.08) * 7.0) - 0.5);
    float barMask = smoothstep(0.08, 0.0, bars);

    float between = smoothstep(0.25, 0.0, abs(x));
    col += vec3(0.85, 1.0, 0.65) * barMask * between * verticalFade * 0.35;

    return col * intensity;
}

vec3 rebirthParticles(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    for (int i = 0; i < 90; i++) {
        float fi = float(i);

        float rnd1 = hash(fi * 17.13);
        float rnd2 = hash(fi * 41.91);
        float rnd3 = hash(fi * 83.37);

        float angle = rnd1 * 6.2831853;

        float radius = mix(1.15, 0.22, smoothstep(0.0, 11.0, t));
        radius += rnd2 * 0.55;
        radius += sin(t * 2.0 + fi) * 0.035;

        float rotation = t * (0.18 + rnd3 * 0.25);
        vec2 pos = vec2(cos(angle + rotation), sin(angle + rotation)) * radius;
        pos.y *= 0.75;

        float d = length(p - pos);

        float size = mix(0.010, 0.024, rnd2);
        float particle = smoothstep(size, 0.0, d);

        vec3 c1 = vec3(0.12, 0.90, 0.55);
        vec3 c2 = vec3(0.18, 0.65, 1.00);
        vec3 c3 = vec3(1.00, 0.70, 0.25);

        vec3 particleColor = mix(c1, c2, rnd3);
        particleColor = mix(particleColor, c3, smoothstep(8.0, 15.0, t) * 0.35);

        col += particleColor * particle * intensity * 1.2;
    }

    return col;
}

vec3 lifeCore(vec2 uv, float t, float intensity) {
    vec2 p = aspectUV(uv);
    float d = length(p);
    vec3 col = vec3(0.0);

    float pulse = 0.65 + 0.35 * sin(t * 3.2);
    float core = 0.035 / (d + 0.025);

    vec3 coreColor = mix(
        vec3(0.10, 0.85, 0.55),
        vec3(0.25, 0.75, 1.00),
        0.5 + 0.5 * sin(t * 0.8)
    );

    col += coreColor * core * pulse * intensity;

    float membrane = smoothstep(0.035, 0.0, abs(d - 0.28));
    col += vec3(0.65, 1.0, 0.75) * membrane * intensity * 1.1;

    float waveRadius = smoothstep(8.0, 15.5, t) * 1.25;
    float wave = smoothstep(0.025, 0.0, abs(d - waveRadius));
    col += vec3(0.85, 1.0, 0.65) * wave * intensity * 1.6;

    return col;
}

// -----------------------------------------------------
// FINAL SILENCE HELPERS
// -----------------------------------------------------

vec3 finalStarReturn(vec2 uv, float t) {
    vec3 col = vec3(0.0);

    float appear = smoothstep(1.0, 5.0, t);

    col += starLayer(uv, t + 100.0, 45.0, 0.002, 0.70) * appear;
    col += starLayer(uv * 1.5 + 0.2, t + 100.0, 85.0, 0.004, 0.45) * appear;
    col += starLayer(uv * 2.0 - 0.3, t + 100.0, 130.0, 0.006, 0.30) * appear;

    return col;
}

vec3 fadingCosmicCore(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);
    vec3 col = vec3(0.0);

    float fade = 1.0 - smoothstep(0.0, 6.0, t);

    float pulse = 0.6 + 0.4 * sin(t * 2.5);
    float core = 0.040 / (r + 0.030);

    vec3 warm = vec3(1.0, 0.72, 0.35);
    vec3 softBlue = vec3(0.25, 0.55, 1.0);

    vec3 coreColor = mix(warm, softBlue, smoothstep(2.0, 7.0, t));

    col += coreColor * core * pulse * fade;

    float ringRadius = mix(0.85, 0.18, smoothstep(0.0, 7.0, t));
    float ring = smoothstep(0.025, 0.0, abs(r - ringRadius));
    col += vec3(0.75, 0.95, 1.0) * ring * fade * 0.9;

    return col;
}

vec3 finalDustFade(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    float n = fbm(p * 2.0 + vec2(t * 0.01, -t * 0.006));
    float dust = smoothstep(0.35, 0.90, n);

    float fade = 1.0 - smoothstep(4.0, 9.0, t);

    vec3 col = mix(
        vec3(0.02, 0.06, 0.16),
        vec3(0.16, 0.08, 0.20),
        n
    );

    return col * dust * fade * 0.30;
}



// -----------------------------------------------------
// PART 2 - 3D RAY TRACING / SPHERE TRACING HELPERS
// Added for the professor review:
// - Ray generation from camera
// - Analytic ray-sphere intersection
// - Signed distance fields
// - Sphere tracing / ray marching
// - Normal estimation
// - Lighting, reflection and stochastic-style jitter
// - Infinite 3D tunnel: "lost inside infinity"
// -----------------------------------------------------

#define ENABLE_PART2_3D 1
#define ENABLE_INFINITY_TUNNEL 1
#define ENABLE_REFLECTIVE_CORE 1

mat2 rot2(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

vec3 getRayDirection3D(vec2 p, vec3 ro, vec3 target, float zoom) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));

    return normalize(forward * zoom + right * p.x + up * p.y);
}

float sdSphere3D(vec3 p, float radius) {
    return length(p) - radius;
}

float intersectSphere3D(vec3 ro, vec3 rd, vec3 center, float radius) {
    vec3 oc = ro - center;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - radius * radius;
    float h = b * b - c;

    if (h < 0.0) {
        return -1.0;
    }

    return -b - sqrt(h);
}

// A repeating SDF tunnel. mod() makes the z direction feel infinite.
float mapInfinityTunnel3D(vec3 p, float t) {
    vec3 q = p;

    q.xy *= rot2(q.z * 0.18 + sin(t * 0.45) * 0.35);

    float tunnelRadius = 1.05 + 0.10 * sin(q.z * 0.75 + t);
    float cylinderShell = abs(length(q.xy) - tunnelRadius) - 0.035;

    vec3 cell = q;
    cell.z = mod(cell.z + 0.60, 1.20) - 0.60;
    float ringSlice = abs(cell.z) - 0.055;
    float ring = max(cylinderShell, ringSlice);

    // Small glowing 3D nodes repeated around the tunnel.
    float nodes = 100.0;
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        float angle = fi * 6.2831853 / 8.0 + floor((q.z + 0.60) / 1.20) * 0.45;
        vec3 nodePos = vec3(cos(angle), sin(angle), 0.0) * tunnelRadius;
        float node = sdSphere3D(cell - nodePos, 0.075);
        nodes = min(nodes, node);
    }

    return min(ring, nodes);
}

float rayMarchInfinityTunnel3D(vec3 ro, vec3 rd, float t) {
    float distTravelled = 0.0;

    for (int i = 0; i < 96; i++) {
        vec3 p = ro + rd * distTravelled;
        float distToScene = mapInfinityTunnel3D(p, t);

        if (distToScene < 0.001) {
            return distTravelled;
        }

        distTravelled += distToScene * 0.82;

        if (distTravelled > 32.0) {
            break;
        }
    }

    return -1.0;
}

vec3 getNormalInfinityTunnel3D(vec3 p, float t) {
    vec2 e = vec2(0.0015, 0.0);

    return normalize(vec3(
        mapInfinityTunnel3D(p + e.xyy, t) - mapInfinityTunnel3D(p - e.xyy, t),
        mapInfinityTunnel3D(p + e.yxy, t) - mapInfinityTunnel3D(p - e.yxy, t),
        mapInfinityTunnel3D(p + e.yyx, t) - mapInfinityTunnel3D(p - e.yyx, t)
    ));
}

vec3 cosmicEnvironment3D(vec3 rd, float t) {
    vec2 envUV = rd.xy * 0.45 + 0.5;
    envUV += rd.z * 0.035;

    vec3 col = vec3(0.0);
    col += nebulaField(envUV, t + 120.0) * 0.60;
    col += starLayer(envUV, t + 80.0, 70.0, 0.010, 0.80);
    col += starLayer(envUV * 1.7 + 0.21, t + 80.0, 140.0, 0.018, 0.45);

    float forwardGlow = pow(max(rd.z, 0.0), 5.0);
    col += mix(vec3(0.15, 0.45, 1.0), vec3(1.0, 0.42, 0.10), 0.5 + 0.5 * sin(t)) * forwardGlow * 0.45;

    return col;
}

vec2 stochasticJitter2D(vec2 seed, float sampleId) {
    return vec2(
        hash2(seed + vec2(sampleId, 19.17)),
        hash2(seed + vec2(71.31, sampleId))
    ) - 0.5;
}

vec3 sceneInfinityTunnel3D(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    // Stochastic-style tiny camera jitter: demonstrates random sampling idea.
    vec2 jitter = stochasticJitter2D(gl_FragCoord.xy, floor(iTime * 24.0)) * 0.0025;
    p += jitter;

    vec3 ro = vec3(0.0, 0.0, -4.0 + t * 3.20);
    ro.xy += vec2(sin(t * 0.65), cos(t * 0.47)) * 0.16;

    vec3 target = ro + vec3(0.0, 0.0, 1.0);
    target.xy += vec2(sin(t * 0.37), cos(t * 0.31)) * 0.35;

    vec3 rd = getRayDirection3D(p, ro, target, 1.35);
    rd.xy *= rot2(sin(t * 0.25) * 0.18);

    vec3 col = cosmicEnvironment3D(rd, t) * 0.42;

    float hit = rayMarchInfinityTunnel3D(ro, rd, t);

    if (hit > 0.0) {
        vec3 hitPos = ro + rd * hit;
        vec3 normal = getNormalInfinityTunnel3D(hitPos, t);

        vec3 lightDirA = normalize(vec3(0.45, 0.75, -0.35));
        vec3 lightDirB = normalize(vec3(-0.55, -0.25, 0.75));

        float diffA = max(dot(normal, lightDirA), 0.0);
        float diffB = max(dot(normal, lightDirB), 0.0);
        float rim = pow(1.0 - max(dot(normal, -rd), 0.0), 3.0);
        float spec = pow(max(dot(reflect(rd, normal), lightDirA), 0.0), 20.0);

        float stripes = 0.5 + 0.5 * sin(hitPos.z * 8.0 + atan(hitPos.y, hitPos.x) * 6.0 + t * 4.0);

        vec3 blue = vec3(0.12, 0.55, 1.0);
        vec3 orange = vec3(1.0, 0.35, 0.08);
        vec3 violet = vec3(0.55, 0.20, 1.0);

        vec3 surfaceColor = mix(blue, orange, stripes);
        surfaceColor = mix(surfaceColor, violet, 0.25 + 0.25 * sin(hitPos.z * 0.7));

        vec3 reflected = cosmicEnvironment3D(reflect(rd, normal), t) * 0.45;

        col = surfaceColor * (0.12 + diffA * 1.05 + diffB * 0.45);
        col += reflected;
        col += vec3(0.70, 0.90, 1.0) * rim * 0.75;
        col += vec3(1.0, 0.80, 0.45) * spec * 0.75;

        float fog = 1.0 - exp(-hit * 0.055);
        col = mix(col, cosmicEnvironment3D(rd, t) * 0.9, fog);
    }

    // Forward vanishing point glow: gives the "lost in infinity" feeling.
    float center = smoothstep(0.55, 0.0, length(p));
    col += vec3(0.35, 0.70, 1.0) * pow(center, 2.5) * (0.8 + 0.2 * sin(t * 5.0));

    return col;
}

// Classical ray tracing example: analytic ray/sphere hit + reflection.
// It is blended into life/rebirth as a 3D core.
vec3 sceneReflectiveLifeCore3D(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 ro = vec3(0.0, 0.05, 3.2);
    vec3 target = vec3(0.0, 0.0, 0.0);
    vec3 rd = getRayDirection3D(p, ro, target, 1.45);

    vec3 sphereCenter = vec3(0.0, 0.0, 0.0);
    float radius = 0.72 + 0.035 * sin(t * 2.0);

    float hit = intersectSphere3D(ro, rd, sphereCenter, radius);

    if (hit < 0.0) {
        float aura = smoothstep(1.05, 0.25, length(p)) * 0.16;
        return vec3(0.08, 0.85, 0.55) * aura;
    }

    vec3 hitPos = ro + rd * hit;
    vec3 normal = normalize(hitPos - sphereCenter);

    vec3 lightDir = normalize(vec3(0.55, 0.85, 0.45));
    float diff = max(dot(normal, lightDir), 0.0);
    float fresnel = pow(1.0 - max(dot(normal, -rd), 0.0), 3.0);
    float spec = pow(max(dot(reflect(rd, normal), lightDir), 0.0), 40.0);

    vec3 refl = cosmicEnvironment3D(reflect(rd, normal), t + 90.0);

    float organic = fbm(normal.xy * 4.0 + vec2(t * 0.18, -t * 0.12));
    vec3 lifeGreen = vec3(0.08, 1.0, 0.55);
    vec3 cyan = vec3(0.15, 0.75, 1.0);
    vec3 gold = vec3(1.0, 0.72, 0.28);

    vec3 base = mix(lifeGreen, cyan, organic);
    base = mix(base, gold, smoothstep(0.66, 0.92, organic) * 0.35);

    vec3 col = base * (0.18 + diff * 0.90);
    col += refl * 0.30;
    col += vec3(0.75, 1.0, 0.70) * fresnel * 1.2;
    col += vec3(1.0, 0.92, 0.60) * spec * 0.85;

    return col;
}


float lineSegment2D(vec2 p, vec2 a, vec2 b, float width) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return smoothstep(width, 0.0, length(pa - ba * h));
}

vec2 project3DTo2D(vec3 p) {
    float z = max(0.55, p.z + 3.4);
    return p.xy / z * 2.25;
}

// Visible Part 2 explanation scene: analytic ray-sphere tracing + reflected/path rays.
// The lines are intentionally visible so the professor can immediately see ray tracing.
vec3 rayBounceSphereStep(
    vec2 screenP,
    vec3 currentOrigin,
    vec3 currentDir,
    vec3 center,
    float radius,
    float stepId,
    vec2 last2,
    out vec3 nextOrigin,
    out vec3 nextDir,
    out vec2 next2
) {
    vec3 col = vec3(0.0);
    float hit = intersectSphere3D(currentOrigin, currentDir, center, radius);

    vec3 hitPoint = center;
    if (hit > 0.0) {
        hitPoint = currentOrigin + currentDir * hit;
    }

    vec2 hit2 = project3DTo2D(hitPoint);
    float rayLine = lineSegment2D(screenP, last2, hit2, 0.012);
    float rayGlow = lineSegment2D(screenP, last2, hit2, 0.045);

    vec3 rayColor = mix(vec3(0.20, 0.70, 1.0), vec3(1.0, 0.55, 0.12), stepId * 0.5);
    col += rayColor * rayGlow * 0.30;
    col += rayColor * rayLine * 1.80;

    vec2 sphere2 = project3DTo2D(center);
    float screenRadius = radius / max(0.65, center.z + 3.4) * 2.25;
    float d = length(screenP - sphere2);
    float sphereMask = smoothstep(screenRadius, screenRadius - 0.018, d);
    float sphereRim = smoothstep(0.018, 0.0, abs(d - screenRadius));
    float sphereLight = smoothstep(screenRadius, 0.0, length(screenP - (sphere2 - vec2(0.08, 0.08))));

    vec3 sphereColor = mix(vec3(0.15, 0.55, 1.0), vec3(1.0, 0.36, 0.06), stepId * 0.35);
    col += sphereColor * sphereMask * (0.25 + sphereLight * 0.85);
    col += vec3(0.9, 1.0, 1.0) * sphereRim * 1.2;

    vec3 n = normalize(hitPoint - center);
    nextDir = reflect(currentDir, n);
    nextOrigin = hitPoint + nextDir * 0.03;
    next2 = hit2;

    return col;
}

// Visible Part 2 explanation scene: analytic ray-sphere tracing + reflected/path rays.
// The lines are intentionally visible so the professor can immediately see ray tracing.
vec3 sceneRayPathPreview3D(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    vec3 col = vec3(0.0);

    vec3 origin0 = vec3(-1.85, 0.10, 2.35);
    vec3 dir0 = normalize(vec3(-0.35, 0.22, 0.20) - origin0);
    vec2 last0 = project3DTo2D(origin0);

    vec3 origin1;
    vec3 dir1;
    vec2 last1;
    col += rayBounceSphereStep(p, origin0, dir0, vec3(-0.35, 0.22, 0.20), 0.28, 0.0, last0, origin1, dir1, last1);

    vec3 origin2;
    vec3 dir2;
    vec2 last2;
    col += rayBounceSphereStep(p, origin1, dir1, vec3(0.70, -0.10, -0.45), 0.22, 1.0, last1, origin2, dir2, last2);

    vec3 origin3;
    vec3 dir3;
    vec2 last3;
    col += rayBounceSphereStep(p, origin2, dir2, vec3(0.05, -0.55, -0.95), 0.18, 2.0, last2, origin3, dir3, last3);

    // Final outgoing path ray, representing a path-tracing bounce continuing into space.
    vec2 end2 = last3 + normalize(project3DTo2D(origin3 + dir3 * 2.0) - last3) * 1.1;
    col += vec3(0.75, 0.95, 1.0) * lineSegment2D(p, last3, end2, 0.010) * 1.5;
    col += vec3(0.35, 0.70, 1.0) * lineSegment2D(p, last3, end2, 0.050) * 0.25;

    // Small stars behind the ray diagram.
    col += starLayer(uv, t + 30.0, 55.0, 0.006, 0.20);
    col += nebulaField(uv + vec2(t * 0.01, 0.0), t + 50.0) * 0.20;

    float appear = smoothstep(0.0, 2.0, t) * (1.0 - smoothstep(10.0, 13.0, t));
    return col * appear;
}

vec3 sceneBlackHole(vec2 uv, float t);

vec3 sceneBlackHoleZoomIntoInfinity(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    // Zoom factor pulls UV coordinates into the event horizon instead of just overlaying the tunnel.
    float zoom = mix(1.0, 4.8, smoothstep(0.0, 11.5, t));
    vec2 zoomUV = (p / zoom);
    zoomUV.x /= iResolution.x / iResolution.y;
    zoomUV = zoomUV * 0.5 + 0.5;

    vec3 col = sceneBlackHole(zoomUV, t);

    float pull = smoothstep(3.0, 12.0, t);
    float coreDark = smoothstep(0.60, 0.02, r) * pull;
    col = mix(col, vec3(0.0), coreDark * 0.65);

    float streaks = 0.0;
    float angle = atan(p.y, p.x);
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float phase = fract(r * (2.5 + fi * 0.8) - t * (0.9 + fi * 0.16));
        float radialLine = smoothstep(0.080, 0.0, abs(phase - 0.08));
        float angularGate = 0.5 + 0.5 * sin(angle * (8.0 + fi * 2.0) + t * (1.2 + fi));
        streaks += radialLine * smoothstep(0.25, 1.0, angularGate);
    }

    col += mix(vec3(0.2, 0.55, 1.0), vec3(1.0, 0.42, 0.08), pull) * streaks * pull * 0.25;

    float centerFlash = smoothstep(0.95, 0.0, r) * smoothstep(9.5, 12.0, t);
    col += vec3(0.75, 0.90, 1.0) * centerFlash * 0.25;

    return col;
}

vec3 solarFumesAndFires(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);
    float a = atan(p.y, p.x);

    float n1 = fbm(vec2(a * 2.6 + t * 0.45, r * 4.5 - t * 1.05));
    float n2 = fbm(p * 3.2 + vec2(-t * 0.18, t * 0.25));
    float fireMask = smoothstep(0.18, 0.90, n1 * n2 * 1.6);

    float radial = smoothstep(1.45, 0.20, r) * smoothstep(0.08, 0.55, r);
    float tongues = smoothstep(0.55, 1.0, sin(a * 9.0 + n1 * 5.0 + t * 3.0) * 0.5 + 0.5);

    vec3 smoke = vec3(0.08, 0.10, 0.16) * n2 * radial * 0.55;
    vec3 solar = mix(vec3(1.0, 0.28, 0.04), vec3(1.0, 0.85, 0.20), n1);
    vec3 plasma = mix(solar, vec3(0.25, 0.65, 1.0), smoothstep(0.75, 1.0, n2));

    return smoke + plasma * fireMask * tongues * radial * 0.65;
}

vec3 sceneInfinityTunnelWithFumes3D(vec2 uv, float t) {
    vec3 col = sceneInfinityTunnel3D(uv, t);
    col += solarFumesAndFires(uv, t) * smoothstep(0.0, 1.5, t);

    vec2 p = aspectUV(uv);
    float center = smoothstep(0.75, 0.0, length(p));
    float flare = pow(center, 4.0) * (0.8 + 0.2 * sin(t * 8.0));
    col += vec3(1.0, 0.65, 0.22) * flare * 0.55;

    return col;
}

vec3 whiteVoidTransition(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float blast = smoothstep(0.0, 0.45, t);
    float hold = 1.0 - smoothstep(2.2, 3.0, t);
    float edge = smoothstep(1.4, 0.0, r);

    vec3 white = vec3(1.0);
    vec3 blueEdge = vec3(0.75, 0.90, 1.0) * (1.0 - edge) * 0.10;
    return white * max(blast, hold) + blueEdge;
}

// -----------------------------------------------------
// SCENE 1: DEEP SPACE AWAKENING
// 0s - 15s
// -----------------------------------------------------

vec3 sceneDeepSpace(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 col = vec3(0.002, 0.004, 0.014);

    col += vec3(0.010, 0.018, 0.055) * (1.0 - length(p) * 0.35);

    float nebulaAppear = smoothstep(2.0, 12.0, t);
    col += nebulaField(uv, t) * nebulaAppear;

    col += starLayer(uv, t, 42.0, 0.003, 0.90);
    col += starLayer(uv * 1.35 + 0.13, t, 75.0, 0.008, 0.60);
    col += starLayer(uv * 1.90 - 0.27, t, 120.0, 0.014, 0.42);

    col += shootingStar(
        uv,
        t,
        0.0,
        vec2(-1.25, 0.78),
        vec2(1.6, -0.65),
        vec3(0.45, 0.70, 1.0)
    ) * smoothstep(4.0, 9.0, t);

    float d = length(p);
    float awakening = smoothstep(9.0, 15.0, t);
    float glow = 0.008 / (d + 0.04);

    col += vec3(0.15, 0.35, 1.0) * glow * awakening;

    return col;
}

// -----------------------------------------------------
// SCENE 2: PARTICLE AWAKENING
// 15s - 30s
// -----------------------------------------------------

vec3 sceneParticlesAwakening(vec2 uv, float t) {
    vec2 p = aspectUV(uv);

    vec3 col = sceneDeepSpace(uv, 15.0 + t);

    float build = smoothstep(0.0, 15.0, t);

    float d = length(p);
    float core = 0.020 / (d + 0.020);
    float pulse = 0.65 + 0.35 * sin(t * 4.5);

    vec3 coreColor = mix(
        vec3(0.15, 0.45, 1.0),
        vec3(1.0, 0.35, 0.08),
        smoothstep(7.0, 15.0, t)
    );

    col += coreColor * core * pulse * build;
    col += vibratingParticles(uv, t, build);

    float ring = abs(sin(d * 32.0 - t * 4.0));
    ring = smoothstep(0.94, 1.0, ring);
    ring *= smoothstep(5.0, 15.0, t);

    col += vec3(0.3, 0.7, 1.0) * ring * 0.35;

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
// SCENE 3: COSMIC REACTION
// 30s - 48s
// -----------------------------------------------------

vec3 sceneCosmicReaction(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float d = length(p);

    vec3 col = sceneParticlesAwakening(uv, 15.0);

    float build = smoothstep(0.0, 8.0, t);
    float finalFlash = smoothstep(11.0, 14.5, t);

    col *= mix(1.0, 0.45, build);

    float corePulse = 0.65 + 0.35 * sin(t * 8.0);
    float core = 0.050 / (d + 0.025);
    vec3 coreColor = mix(
        vec3(0.15, 0.55, 1.0),
        vec3(1.0, 0.32, 0.04),
        smoothstep(3.0, 10.0, t)
    );

    col += coreColor * core * corePulse * build;

    float innerCore = smoothstep(0.10, 0.0, d);
    col += vec3(1.0, 0.85, 0.45) * innerCore * build * 1.8;

    float r1 = smoothstep(0.020, 0.0, abs(d - t * 0.055));
    float r2 = smoothstep(0.018, 0.0, abs(d - (t * 0.075 - 0.25)));
    float r3 = smoothstep(0.016, 0.0, abs(d - (t * 0.095 - 0.55)));

    col += vec3(1.0, 0.55, 0.10) * r1 * 2.2;
    col += vec3(0.20, 0.65, 1.0) * r2 * 1.5;
    col += vec3(1.0, 0.25, 0.05) * r3 * 1.2;

    col += energyRays(uv, t, build * 0.95);
    col += explosionParticles(uv, t, build);
    col += vibratingParticles(uv, t * 1.6, build) * 1.6;

    col += vec3(1.0, 0.75, 0.35) * finalFlash * 0.9;

    float focus = smoothstep(1.4, 0.15, d);
    col *= mix(0.75, 1.25, focus);

    return col;
}

// -----------------------------------------------------
// SCENE 4: BLACK HOLE
// 48s - 65s
// -----------------------------------------------------

vec3 sceneBlackHole(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float enter = smoothstep(0.0, 5.0, t);
    float intensity = smoothstep(3.0, 13.0, t);

    vec3 col = vec3(0.002, 0.003, 0.010);

    col += nebulaField(uv, t + 48.0) * 0.25;
    col += gravitationalStarBending(uv, t) * enter;

    vec3 disk = blackHoleAccretionDisk(uv, t);
    col += disk * enter;

    float photonRing = smoothstep(0.018, 0.0, abs(r - 0.235));
    col += vec3(1.0, 0.62, 0.20) * photonRing * 2.4 * enter;

    float blueRing = smoothstep(0.035, 0.0, abs(r - 0.39));
    col += vec3(0.15, 0.55, 1.0) * blueRing * 0.95 * intensity;

    float eventHorizon = smoothstep(0.255, 0.185, r);
    col = mix(col, vec3(0.0), eventHorizon);

    float core = smoothstep(0.19, 0.13, r);
    col = mix(col, vec3(0.0), core);

    for (int i = 0; i < 70; i++) {
        float fi = float(i);

        float rnd1 = hash(fi * 13.37);
        float rnd2 = hash(fi * 47.11);
        float rnd3 = hash(fi * 91.23);

        float angle = rnd1 * 6.2831853 + t * (0.45 + rnd2);
        float radius = mix(0.95, 0.20, fract(t * 0.08 + rnd2));

        vec2 pos = vec2(cos(angle), sin(angle)) * radius;
        pos.y *= 0.55;

        float d = length(p - pos);
        float particle = smoothstep(0.018, 0.0, d);

        vec3 particleColor = mix(
            vec3(0.2, 0.65, 1.0),
            vec3(1.0, 0.42, 0.08),
            rnd3
        );

        float fadeNearCore = smoothstep(0.16, 0.35, radius);
        col += particleColor * particle * fadeNearCore * intensity * 1.4;
    }

    float pulse = 0.5 + 0.5 * sin(t * 5.0);
    float glow = 0.018 / (r + 0.035);
    glow *= smoothstep(0.18, 0.38, r);

    col += vec3(0.9, 0.35, 0.08) * glow * pulse * 0.35 * intensity;

    float endSurge = smoothstep(12.0, 16.5, t);
    float surgeRing = smoothstep(0.025, 0.0, abs(r - (0.25 + endSurge * 0.55)));
    col += vec3(0.7, 0.85, 1.0) * surgeRing * 2.0;

    float focus = smoothstep(1.35, 0.12, r);
    col *= mix(0.70, 1.20, focus);

    return col;
}

// -----------------------------------------------------
// SCENE 5: MULTIVERSE SPLIT
// 65s - 82s
// -----------------------------------------------------

vec3 sceneMultiverse(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float open = smoothstep(0.0, 6.0, t);
    float intensity = smoothstep(3.0, 14.0, t);

    vec3 col = vec3(0.002, 0.003, 0.012);

    col += nebulaField(uv, t + 70.0) * 0.25;
    col += starLayer(uv, t + 70.0, 50.0, 0.012, 0.55);

    vec2 centerA = vec2(-0.62,  0.18);
    vec2 centerB = vec2( 0.62,  0.15);
    vec2 centerC = vec2( 0.00, -0.42);
    vec2 centerD = vec2( 0.00,  0.55);

    col += energyConnection(uv, centerA, centerB, t, vec3(0.35, 0.85, 1.0)) * open;
    col += energyConnection(uv, centerA, centerC, t + 1.0, vec3(1.0, 0.42, 0.12)) * open;
    col += energyConnection(uv, centerB, centerC, t + 2.0, vec3(0.75, 0.35, 1.0)) * open;
    col += energyConnection(uv, centerC, centerD, t + 3.0, vec3(0.2, 1.0, 0.65)) * open;

    col += portalUniverse(uv, centerA, 0.38, t,       vec3(0.65, 0.90, 1.35), 1.0)  * open;
    col += portalUniverse(uv, centerB, 0.36, t * 1.1, vec3(1.35, 0.70, 0.45), 4.0)  * open;
    col += portalUniverse(uv, centerC, 0.34, t * 0.9, vec3(0.55, 1.20, 0.75), 8.0)  * open;
    col += portalUniverse(uv, centerD, 0.30, t * 1.3, vec3(0.95, 0.60, 1.35), 12.0) * open * smoothstep(5.0, 12.0, t);

    col += realityFracture(uv, t, intensity);

    float coreGlow = 0.018 / (r + 0.04);
    float pulse = 0.5 + 0.5 * sin(t * 6.0);

    col += vec3(0.7, 0.9, 1.0) * coreGlow * pulse * open * 0.5;

    float endSurge = smoothstep(13.0, 16.5, t);
    float expandingRing = smoothstep(0.030, 0.0, abs(r - endSurge * 1.15));

    col += vec3(1.0, 0.85, 0.45) * expandingRing * 2.0;

    float focus = smoothstep(1.5, 0.15, r);
    col *= mix(0.75, 1.15, focus);

    return col;
}

// -----------------------------------------------------
// SCENE 6: LIFE AND REBIRTH
// 82s - 98s
// -----------------------------------------------------

vec3 sceneLifeAndRebirth(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float appear = smoothstep(0.0, 5.0, t);
    float organize = smoothstep(4.0, 11.0, t);

    vec3 col = vec3(0.002, 0.004, 0.012);

    col += nebulaField(uv, t + 90.0) * 0.22;
    col += starLayer(uv, t + 90.0, 48.0, 0.008, 0.45);

    float atmosphere = smoothstep(0.0, 8.0, t);
    col += vec3(0.02, 0.10, 0.06) * atmosphere;

    col += rebirthParticles(uv, t, appear);
    col += organicCellField(uv, t, organize);
    col += dnaSpiral(uv, t, smoothstep(5.0, 13.0, t) * 0.75);
    col += lifeCore(uv, t, appear);

    float calmMask = smoothstep(12.0, 16.0, t);
    col *= mix(1.0, 0.82, calmMask);

    float rebirthFlash = smoothstep(13.5, 16.0, t);
    col += vec3(0.55, 1.0, 0.65) * rebirthFlash * 0.45;

    float focus = smoothstep(1.45, 0.18, r);
    col *= mix(0.72, 1.18, focus);

    return col;
}

// -----------------------------------------------------
// SCENE 7: FINAL SILENCE
// 98s - 104s
// -----------------------------------------------------

vec3 sceneFinalSilence(vec2 uv, float t) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    vec3 col = vec3(0.0015, 0.0025, 0.010);

    col += finalDustFade(uv, t);
    col += finalStarReturn(uv, t);
    col += fadingCosmicCore(uv, t);

    float tinyCore = smoothstep(0.035, 0.0, r);
    float tinyFade = 1.0 - smoothstep(5.5, 9.0, t);

    col += vec3(0.55, 0.85, 1.0) * tinyCore * tinyFade * 1.2;

    float breath = 0.5 + 0.5 * sin(t * 1.2);
    float softAura = 0.008 / (r + 0.08);
    float auraFade = 1.0 - smoothstep(3.0, 9.0, t);

    col += vec3(0.20, 0.45, 1.0) * softAura * breath * auraFade * 0.35;

    float silence = smoothstep(6.0, 10.0, t);
    col *= mix(1.0, 0.35, silence);

    float focus = smoothstep(1.4, 0.2, r);
    col *= mix(0.80, 1.10, focus);

    return col;
}

// -----------------------------------------------------
// CLARITY MARKERS
// These visual anchors make the story readable.
// -----------------------------------------------------

vec3 awakeningSeed(vec2 uv, float time) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float appear = smoothstep(8.0, 14.0, time);
    float fade = 1.0 - smoothstep(20.0, 26.0, time);

    float pulse = 0.6 + 0.4 * sin(time * 3.0);

    float seed = smoothstep(0.045, 0.0, r);
    float aura = 0.018 / (r + 0.045);

    vec3 col = vec3(0.12, 0.45, 1.0) * seed * 2.0;
    col += vec3(0.10, 0.35, 1.0) * aura * pulse * 0.6;

    return col * appear * fade;
}

vec3 reactionBlastMarker(vec2 uv, float time) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float sceneActive = smoothstep(30.0, 33.0, time) * (1.0 - smoothstep(47.0, 49.0, time));
    float localT = time - 30.0;

    float wave1 = smoothstep(0.030, 0.0, abs(r - localT * 0.055));
    float wave2 = smoothstep(0.022, 0.0, abs(r - (localT * 0.080 - 0.32)));

    float hotCore = 0.018 / (r + 0.025);
    float pulse = beatPulse(time, musicIntensity(time));

    vec3 col = vec3(1.0, 0.40, 0.08) * wave1 * 1.2;
    col += vec3(0.25, 0.65, 1.0) * wave2 * 0.9;
    col += vec3(1.0, 0.65, 0.20) * hotCore * pulse * 0.35;

    return col * sceneActive;
}

vec3 blackHoleClarityMarker(vec2 uv, float time) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float sceneActive = smoothstep(48.0, 51.0, time) * (1.0 - smoothstep(64.0, 66.0, time));

    float horizon = smoothstep(0.24, 0.17, r);
    float photon = smoothstep(0.020, 0.0, abs(r - 0.255));
    float outerLens = smoothstep(0.040, 0.0, abs(r - 0.42));

    vec3 col = vec3(0.0);
    col -= vec3(0.20, 0.18, 0.16) * horizon;
    col += vec3(1.0, 0.55, 0.12) * photon * 1.4;
    col += vec3(0.22, 0.60, 1.0) * outerLens * 0.7;

    return col * sceneActive;
}

vec3 lifeClarityMarker(vec2 uv, float time) {
    vec2 p = aspectUV(uv);
    float r = length(p);

    float sceneActive = smoothstep(82.0, 86.0, time) * (1.0 - smoothstep(97.0, 99.0, time));
    float localT = time - 82.0;

    float pulse = 0.65 + 0.35 * sin(localT * 3.4);
    float core = smoothstep(0.075, 0.0, r);
    float membrane = smoothstep(0.030, 0.0, abs(r - 0.30));

    vec3 col = vec3(0.10, 1.0, 0.55) * core * pulse * 1.2;
    col += vec3(0.45, 0.95, 1.0) * membrane * 0.9;

    float waveRadius = smoothstep(7.0, 15.0, localT) * 1.15;
    float wave = smoothstep(0.025, 0.0, abs(r - waveRadius));

    col += vec3(0.75, 1.0, 0.55) * wave * 0.8;

    return col * sceneActive;
}

vec3 sceneClarityPolish(vec2 uv, float time) {
    vec3 col = vec3(0.0);

    col += awakeningSeed(uv, time);
    col += reactionBlastMarker(uv, time);
    col += blackHoleClarityMarker(uv, time);
    col += lifeClarityMarker(uv, time);

    return col;
}

// -----------------------------------------------------
// MAIN TIMELINE
// -----------------------------------------------------

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    float totalTime = 104.0;

    // FINAL RECORDING:
    float time = mod(iTime, totalTime);

    // TESTING OPTIONS:
    // float time = mod(iTime * 2.5, totalTime);       // fast preview of full film
    // float time = 30.0 + mod(iTime, 18.0);           // test cosmic reaction
    // float time = 48.0 + mod(iTime, 17.0);           // test black hole
    // float time = 65.0 + mod(iTime, 17.0);           // test multiverse
    // float time = 82.0 + mod(iTime, 16.0);           // test life/rebirth
    // float time = 98.0 + mod(iTime, 6.0);            // test final silence

    float intensity = musicIntensity(time);

    vec2 shake = cameraShakeOffset(time, intensity);
    vec2 suv = uv + shake;

    vec3 color;

    float t1 = 15.0;
    float t2 = 30.0;
    float t3 = 48.0;
    float t4 = 65.0;
    float t5 = 82.0;
    float t6 = 98.0;

    float fade = 2.0;

    if (time < t1 - fade) {
        color = sceneDeepSpace(suv, time);
    }
    else if (time < t1) {
        vec3 a = sceneDeepSpace(suv, time);
        vec3 b = sceneParticlesAwakening(suv, time - t1);
        float w = transitionWeight(time, t1 - fade, fade);
        color = crossFade(a, b, w);
    }
    else if (time < t2 - fade) {
        color = sceneParticlesAwakening(suv, time - t1);
    }
    else if (time < t2) {
        vec3 a = sceneParticlesAwakening(suv, time - t1);
        vec3 b = sceneCosmicReaction(suv, time - t2);
        float w = transitionWeight(time, t2 - fade, fade);
        color = crossFade(a, b, w);
    }
    else if (time < t3 - fade) {
        color = sceneCosmicReaction(suv, time - t2);
    }
    else if (time < t3) {
        vec3 a = sceneCosmicReaction(suv, time - t2);
        vec3 b = sceneBlackHole(suv, time - t3);
        float w = transitionWeight(time, t3 - fade, fade);
        color = crossFade(a, b, w);
    }
    else if (time < t4 - fade) {
        color = sceneBlackHole(suv, time - t3);
    }
    else if (time < t4) {
        vec3 a = sceneBlackHole(suv, time - t3);
        vec3 b = sceneMultiverse(suv, time - t4);
        float w = transitionWeight(time, t4 - fade, fade);
        color = crossFade(a, b, w);
    }
    else if (time < t5 - fade) {
        color = sceneMultiverse(suv, time - t4);
    }
    else if (time < t5) {
        vec3 a = sceneMultiverse(suv, time - t4);
        vec3 b = sceneLifeAndRebirth(suv, time - t5);
        float w = transitionWeight(time, t5 - fade, fade);
        color = crossFade(a, b, w);
    }
    else if (time < t6 - fade) {
        color = sceneLifeAndRebirth(suv, time - t5);
    }
    else if (time < t6) {
        vec3 a = sceneLifeAndRebirth(suv, time - t5);
        vec3 b = sceneFinalSilence(suv, time - t6);
        float w = transitionWeight(time, t6 - fade, fade);
        color = crossFade(a, b, w);
    }
    else {
        color = sceneFinalSilence(suv, time - t6);
    }

#if ENABLE_PART2_3D
    // Visible ray/path tracing preparation before the black-hole entrance.
    // This shows rays, analytic sphere hits, reflected rays and a continuing path bounce.
    float rayPreviewAmount = smoothstep(42.0, 45.0, time) * (1.0 - smoothstep(53.5, 56.0, time));
    color += sceneRayPathPreview3D(suv, time - 42.0) * rayPreviewAmount;

    // New clean story structure requested by the professor review:
    // 48-60s: camera zooms into the black hole.
    // 60-66s: full-screen 3D infinite raymarched tunnel, no overlay.
    // 66-69s: full white flash / white void.
    // 69-98s: switch directly into the cell/life rebirth structure.
    if (time >= 48.0 && time < 60.0) {
        color = sceneBlackHoleZoomIntoInfinity(suv, time - 48.0);
    }
    else if (time >= 60.0 && time < 66.0) {
        color = sceneInfinityTunnelWithFumes3D(suv, time - 60.0);
    }
    else if (time >= 66.0 && time < 69.0) {
        color = whiteVoidTransition(uv, time - 66.0);
    }
    else if (time >= 69.0 && time < 98.0) {
        float lifeT = time - 69.0;
        color = sceneLifeAndRebirth(suv, lifeT);
#if ENABLE_REFLECTIVE_CORE
        float core3DAmount = smoothstep(1.5, 6.5, lifeT) * (1.0 - smoothstep(25.0, 29.0, lifeT));
        color += sceneReflectiveLifeCore3D(suv, lifeT) * core3DAmount * 0.85;
#endif
    }
#endif

    // During the full white void, do not add old overlays, otherwise the white hold becomes dirty.
    float whiteHoldMask = smoothstep(66.0, 66.3, time) * (1.0 - smoothstep(68.7, 69.0, time));
    if (whiteHoldMask < 0.5) {
        color += globalIntensityGlow(uv, time, intensity);
        color += sceneClarityPolish(uv, time);

        color += transitionFlash(uv, time, t2, vec3(1.0, 0.45, 0.10), 0.45);
        color += transitionFlash(uv, time, t3, vec3(0.70, 0.85, 1.00), 0.35);
        color += transitionFlash(uv, time, t4, vec3(1.00, 0.75, 0.35), 0.40);
        color += transitionFlash(uv, time, t5, vec3(0.25, 1.00, 0.65), 0.30);
    }

    float pulse = beatPulse(time, intensity);

    if (time > 30.0 && time < 65.0) {
        color += vec3(1.0, 0.45, 0.10) * pulse * 0.18;
    }

    if (time > 48.0 && time < 65.0) {
        color += vec3(0.20, 0.55, 1.0) * pulse * 0.12;
    }

    if (whiteHoldMask > 0.5) {
        color = vec3(1.0);
    } else {
        color = postProcess(color, uv);
    }

    gl_FragColor = vec4(color, 1.0);
}
