// cosmic_shader_film_v2_all_scenes.frag
// -----------------------------------------------------------------------------
// Standalone cinematic cosmic shader film.
// Built from the reference analysis: solar fire/plasma, dust fountain, golden
// explosion, galaxy-eye, blue sci-fi light trails, starfield, comet/impact, HUD.
//
// Expected host-provided uniforms:
//   iResolution : vec3 viewport resolution, e.g. vec3(width,height,1)
//   iTime       : float time in seconds
//
// IMPORTANT for your current shader runner:
// iResolution and iTime are already declared by the host. Do not redeclare them
// here, otherwise the compiler reports a redefinition error.
// -----------------------------------------------------------------------------

#ifdef GL_ES
precision highp float;
#endif

// iResolution and iTime are provided by the shader host.

#define PI      3.14159265358979323846
#define TAU     6.28318530717958647692
#define FAR     10000.0

// -----------------------------------------------------------------------------
// Basic utility
// -----------------------------------------------------------------------------
float sat(float x) { return clamp(x, 0.0, 1.0); }
vec2  sat(vec2  x) { return clamp(x, 0.0, 1.0); }
vec3  sat(vec3  x) { return clamp(x, 0.0, 1.0); }

float remap01(float a, float b, float x) { return sat((x - a) / max(0.0001, b - a)); }
float smoother(float a, float b, float x) { float y = remap01(a, b, x); return y * y * (3.0 - 2.0 * y); }

vec2 rot2(vec2 p, float a)
{
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c) * p;
}

float hash11(float n) { return fract(sin(n) * 43758.5453123); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

vec2 hash22(vec2 p)
{
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
}

float valueNoise(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p)
{
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.62, 1.17, -1.17, 1.62);
    for (int i = 0; i < 6; i++)
    {
        v += a * valueNoise(p);
        p = m * p + 17.31;
        a *= 0.5;
    }
    return v;
}

float fbmHeavy(vec2 p)
{
    float v = 0.0;
    float a = 0.52;
    mat2 m = mat2(1.48, 1.03, -1.03, 1.48);
    for (int i = 0; i < 8; i++)
    {
        v += a * valueNoise(p);
        p = m * p + 21.73;
        a *= 0.52;
    }
    return v;
}

float domainWarp(vec2 p, float t)
{
    vec2 q;
    q.x = fbm(p + vec2(0.0, 0.0) + 0.07 * t);
    q.y = fbm(p + vec2(5.2, 1.3) - 0.05 * t);

    vec2 r;
    r.x = fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.11 * t);
    r.y = fbm(p + 4.0 * q + vec2(8.3, 2.8) - 0.09 * t);

    return fbmHeavy(p + 3.6 * r);
}

vec3 fireRamp(float x)
{
    x = sat(x);
    vec3 c0 = vec3(0.015, 0.004, 0.000);
    vec3 c1 = vec3(0.22,  0.025, 0.000);
    vec3 c2 = vec3(0.95,  0.22,  0.015);
    vec3 c3 = vec3(1.00,  0.66,  0.055);
    vec3 c4 = vec3(1.00,  0.95,  0.58);
    vec3 c = mix(c0, c1, smoother(0.00, 0.25, x));
    c = mix(c, c2, smoother(0.20, 0.52, x));
    c = mix(c, c3, smoother(0.48, 0.78, x));
    c = mix(c, c4, smoother(0.72, 1.00, x));
    return c;
}

vec3 blueRamp(float x)
{
    x = sat(x);
    vec3 c0 = vec3(0.000, 0.010, 0.030);
    vec3 c1 = vec3(0.000, 0.090, 0.160);
    vec3 c2 = vec3(0.040, 0.480, 0.720);
    vec3 c3 = vec3(0.650, 0.950, 1.000);
    vec3 c = mix(c0, c1, smoother(0.00, 0.45, x));
    c = mix(c, c2, smoother(0.35, 0.78, x));
    c = mix(c, c3, smoother(0.70, 1.00, x));
    return c;
}

vec3 goldRamp(float x)
{
    x = sat(x);
    vec3 c0 = vec3(0.01, 0.006, 0.00);
    vec3 c1 = vec3(0.55, 0.18,  0.01);
    vec3 c2 = vec3(1.00, 0.63,  0.08);
    vec3 c3 = vec3(1.00, 0.92,  0.45);
    return mix(mix(c0, c1, smoother(0.05, 0.42, x)), mix(c2, c3, smoother(0.65, 1.0, x)), smoother(0.36, 0.95, x));
}

// -----------------------------------------------------------------------------
// Shared visual components
// -----------------------------------------------------------------------------
float softCircle(vec2 uv, vec2 c, float r, float blur)
{
    return 1.0 - smoothstep(r, r + blur, length(uv - c));
}

float sharpStar(vec2 p, float size)
{
    float d = length(p);
    float core = exp(-d * d / max(0.00001, size));
    float cross = exp(-abs(p.x) / (size * 9.0)) * exp(-abs(p.y) / (size * 60.0));
    cross += exp(-abs(p.y) / (size * 9.0)) * exp(-abs(p.x) / (size * 60.0));
    return core + 0.18 * cross;
}

vec3 starLayer(vec2 uv, float scale, float threshold, float twinkle, float t)
{
    vec2 gridUv = uv * scale;
    vec2 cell = floor(gridUv);
    vec2 f = fract(gridUv) - 0.5;
    vec2 rnd = hash22(cell);
    vec2 off = rnd - 0.5;
    float seed = hash21(cell + 19.0);
    float starMask = step(threshold, seed);
    float blink = 0.65 + 0.35 * sin(t * twinkle + seed * TAU);
    float star = sharpStar(f - 0.42 * off, 0.0025 + 0.006 * rnd.x) * starMask * blink;
    vec3 tint = mix(vec3(0.65, 0.82, 1.0), vec3(1.0, 0.72, 0.36), rnd.y);
    return tint * star;
}

vec3 starField(vec2 uv, float t)
{
    vec2 p = uv;
    vec3 col = vec3(0.0);
    col += starLayer(p + vec2(0.010 * t, 0.004 * t),  58.0, 0.972, 2.1, t) * 0.7;
    col += starLayer(p + vec2(-0.006 * t, 0.007 * t), 96.0, 0.982, 3.7, t) * 0.55;
    col += starLayer(p + vec2(0.002 * t, -0.010 * t), 155.0, 0.990, 5.0, t) * 0.35;

    float neb = fbm(uv * 2.7 + vec2(0.05 * t, -0.02 * t));
    neb *= fbm(uv * 5.1 - vec2(0.03 * t, 0.02 * t));
    col += blueRamp(neb) * neb * 0.22;
    return col;
}

float dustParticleLayer(vec2 uv, float t, float scale, float speed, float spread)
{
    vec2 p = uv;
    p.x += 0.12 * sin(t * 0.23 + p.y * 4.0);
    p.y += t * speed;
    vec2 g = p * scale;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 rnd = hash22(id);
    float localLife = fract(t * 0.06 + rnd.y);
    f += (rnd - 0.5) * spread;
    f.y += localLife * 0.42;
    float d = length(f);
    float body = exp(-d * d * (70.0 + 120.0 * rnd.x));
    float gate = smoothstep(0.0, 0.18, localLife) * (1.0 - smoothstep(0.70, 1.0, localLife));
    return body * gate * smoothstep(0.36, 1.0, rnd.x);
}

vec3 particleFountain(vec2 uv, float t)
{
    vec2 p = uv;
    float plume = exp(-abs(p.x) * 5.5) * smoothstep(-0.86, -0.05, p.y) * (1.0 - smoothstep(0.74, 1.2, p.y));
    plume *= 0.45 + 0.55 * fbm(vec2(p.x * 6.0, p.y * 2.0 - t * 0.6));

    float sparks = 0.0;
    sparks += dustParticleLayer(p * vec2(0.75, 1.0), t, 36.0, -0.30, 0.35) * 0.8;
    sparks += dustParticleLayer(p * vec2(0.85, 1.0), t + 9.1, 58.0, -0.42, 0.52) * 0.7;
    sparks += dustParticleLayer(p * vec2(0.95, 1.0), t + 3.7, 90.0, -0.55, 0.70) * 0.45;
    sparks *= plume * 2.2;

    vec3 col = goldRamp(sparks * 2.1) * sparks * 2.5;
    col += vec3(1.0, 0.25, 0.03) * plume * 0.16;
    return col;
}

// -----------------------------------------------------------------------------
// Scene 1: fire nebula / solar plasma with dust fountain
// -----------------------------------------------------------------------------
vec3 sceneFireNebula(vec2 uv, float t)
{
    vec2 p = uv;
    p.x *= 1.08;
    vec3 col = starField(uv * 0.9, t) * 0.18;

    vec2 q = p;
    q.x += 0.18 * sin(q.y * 2.2 + t * 0.25);
    q = rot2(q, 0.08 * sin(t * 0.2));

    float radial = 1.0 - sat(length(q - vec2(0.22, -0.12)) / 1.35);
    float w = domainWarp(q * 2.3 + vec2(-0.12 * t, 0.035 * t), t);
    float cloud = sat((w * 1.35 + radial * 0.75) - 0.55);
    float smoke = fbmHeavy(q * 4.8 + vec2(0.04 * t, -0.07 * t));
    cloud *= smoothstep(0.18, 0.88, smoke + radial * 0.7);

    vec3 fire = fireRamp(cloud * 1.25);
    float hot = pow(sat(cloud), 3.0);
    col += fire * (cloud * 1.65 + hot * 2.2);

    // dark turbulent holes, similar to the black/orange plasma in the reference
    float holes = smoothstep(0.50, 0.86, fbmHeavy(q * 7.3 + vec2(t * 0.05, -t * 0.02)));
    col *= 1.0 - holes * cloud * 0.42;

    col += particleFountain(uv + vec2(-0.35, 0.10), t) * 1.10;
    col += vec3(1.0, 0.42, 0.08) * softCircle(uv, vec2(-0.66, -0.50), 0.33, 0.55) * 0.24;
    return col;
}

// -----------------------------------------------------------------------------
// Scene 2: full golden radial explosion / outward sparks
// -----------------------------------------------------------------------------
float radialRays(vec2 p, float t)
{
    float r = length(p);
    float a = atan(p.y, p.x);
    float stripes = 0.5 + 0.5 * sin(a * 80.0 + fbm(vec2(a * 2.4, r * 6.0 - t * 2.0)) * 16.0);
    stripes = pow(stripes, 10.0);
    float front = smoothstep(0.08, 0.35, r) * (1.0 - smoothstep(1.35, 1.95, r));
    float blast = exp(-r * 2.2) + 0.50 * exp(-abs(r - 0.25 - t * 0.08) * 7.0);
    return stripes * front * blast;
}

vec3 sceneGoldenBurst(vec2 uv, float t)
{
    vec2 p = uv;
    p = rot2(p, 0.04 * t);

    vec3 col = vec3(0.0);
    float r = length(p);
    float core = exp(-r * r * 7.5);
    float rays = radialRays(p, t);

    // flying granular particles
    float sparks = 0.0;
    vec2 pp = p / max(0.18, r);
    for (int i = 0; i < 36; i++)
    {
        float fi = float(i);
        float seed = hash11(fi * 17.19);
        float ang = seed * TAU + 0.25 * sin(t * 0.7 + fi);
        float dist = fract(t * (0.08 + 0.07 * hash11(fi + 2.0)) + seed) * 1.65;
        vec2 pos = vec2(cos(ang), sin(ang)) * dist;
        float size = mix(0.004, 0.020, hash11(fi + 7.0));
        sparks += exp(-dot(p - pos, p - pos) / size) * (1.0 - smoothstep(1.15, 1.7, dist));
    }

    col += goldRamp(core + rays * 1.7 + sparks * 0.5) * (core * 2.3 + rays * 3.0 + sparks * 0.4);
    col += vec3(1.0, 0.80, 0.40) * exp(-r * 4.0) * 0.75;
    col += starField(uv, t) * (1.0 - sat(core * 1.2));
    return col;
}

// -----------------------------------------------------------------------------
// Scene 3: galaxy-eye / bright white core with golden cloudy ring
// -----------------------------------------------------------------------------
vec3 sceneGalaxyEye(vec2 uv, float t)
{
    vec2 p = uv;
    p.x *= 1.05;
    float r = length(p);
    float a = atan(p.y, p.x);

    vec2 swirl = vec2(a / TAU * 3.0 + 0.08 * t, log(r + 0.08) * 1.7 - 0.05 * t);
    float n = domainWarp(swirl * 2.8, t);
    float ring = exp(-abs(r - 0.46 - 0.035 * sin(a * 5.0 + t)) * 7.5);
    float halo = exp(-r * 2.0);
    float core = exp(-r * r * 18.0);
    float lens = exp(-abs(p.y) * 9.0) * exp(-p.x * p.x * 1.2);

    vec3 col = starField(uv * 1.2, t) * 0.32;
    col += blueRamp(halo) * halo * 0.28;
    col += goldRamp(n * ring * 1.2) * ring * (1.4 + 1.2 * n);
    col += vec3(1.0, 0.85, 0.45) * lens * 0.22;
    col += vec3(1.0, 0.97, 0.86) * core * 2.9;
    col += vec3(0.40, 0.68, 1.00) * exp(-abs(r - 0.60) * 10.0) * 0.20;

    // subtle rotating debris around the ring
    for (int i = 0; i < 24; i++)
    {
        float fi = float(i);
        float seed = hash11(fi * 31.7);
        float ang = seed * TAU + t * (0.06 + 0.03 * hash11(fi + 5.0));
        float rr = 0.33 + 0.35 * hash11(fi + 13.0);
        vec2 pos = vec2(cos(ang), sin(ang)) * rr;
        float speck = exp(-dot(p - pos, p - pos) / 0.00042);
        col += vec3(1.0, 0.62, 0.20) * speck * 0.38;
    }
    return col;
}

// -----------------------------------------------------------------------------
// Scene 4: blue sci-fi light trails / fiber optic curves
// -----------------------------------------------------------------------------
float curveGlow(vec2 p, float y, float width)
{
    float d = abs(p.y - y);
    return exp(-d * d / max(0.000001, width));
}

vec3 sceneLightTrails(vec2 uv, float t)
{
    vec2 p = uv;
    p.x *= 1.25;
    vec3 col = starField(uv + vec2(0.02 * t, 0.0), t) * 0.22;

    // main sweeping strands
    for (int i = 0; i < 13; i++)
    {
        float fi = float(i);
        float phase = fi * 0.51 + t * (0.36 + 0.02 * fi);
        float baseY = -0.20 + fi * 0.035;
        float y = baseY + 0.18 * sin(p.x * 1.9 + phase) + 0.06 * sin(p.x * 4.3 - phase * 0.7);
        float g = curveGlow(p, y, 0.0008 + 0.0005 * hash11(fi + 7.2));
        float head = smoothstep(-1.25, 0.95, p.x + 0.65 * sin(t * 0.22 + fi));
        float fade = 1.0 - smoothstep(0.70, 1.42, abs(p.y));
        vec3 tint = mix(vec3(0.04, 0.40, 0.75), vec3(0.70, 1.00, 1.00), hash11(fi * 4.0));
        col += tint * g * fade * head * 1.3;
        col += tint * curveGlow(p, y, 0.012) * fade * 0.07;
    }

    // fast turquoise dust flying through the scene
    float shards = 0.0;
    vec2 adv = vec2(p.x * 1.6 + t * 1.2, p.y * 6.0 + 0.20 * sin(t + p.x));
    vec2 cell = floor(adv * 13.0);
    vec2 f = fract(adv * 13.0) - 0.5;
    for (int j = 0; j < 2; j++)
    {
        vec2 id = cell + vec2(float(j), 0.0);
        vec2 rnd = hash22(id);
        vec2 q = f - (rnd - 0.5);
        q.x *= 0.15;
        shards += exp(-dot(q, q) * 75.0) * step(0.78, rnd.x);
    }
    col += blueRamp(shards) * shards * 0.55;

    col += vec3(0.10, 0.70, 1.00) * softCircle(uv, vec2(-0.95, 0.14), 0.06, 0.55) * 0.55;
    return col;
}

// -----------------------------------------------------------------------------
// Scene 5: deep star dust / calm blue nebula
// -----------------------------------------------------------------------------
vec3 sceneBlueDust(vec2 uv, float t)
{
    vec2 p = uv;
    vec3 col = vec3(0.0);
    col += starField(p * 1.15 + vec2(0.02 * sin(t * 0.1), -0.015 * t), t) * 0.95;

    float b1 = fbmHeavy(p * 2.2 + vec2(0.03 * t, -0.015 * t));
    float b2 = fbmHeavy(p * 5.0 - vec2(0.02 * t, 0.04 * t));
    float neb = pow(sat(b1 * b2 * 1.6), 1.2);
    col += blueRamp(neb) * neb * 0.40;

    // bokeh-like soft particles
    for (int i = 0; i < 42; i++)
    {
        float fi = float(i);
        vec2 rnd = hash22(vec2(fi, fi * 2.3));
        vec2 pos = rnd * 2.4 - 1.2;
        pos.x += 0.08 * sin(t * (0.05 + rnd.x * 0.07) + fi);
        pos.y += 0.05 * cos(t * (0.04 + rnd.y * 0.05) + fi * 0.7);
        float d = length(p - pos);
        float b = exp(-d * d / (0.002 + 0.018 * rnd.x));
        col += vec3(0.15, 0.55, 0.95) * b * 0.025 * rnd.y;
    }
    return col;
}

// -----------------------------------------------------------------------------
// Scene 6: comet / solar surface / impact approach
// -----------------------------------------------------------------------------
vec3 sceneCometSurface(vec2 uv, float t)
{
    vec2 p = uv;
    vec3 col = vec3(0.0);

    // glowing solar surface from the upper-left / full frame plasma
    vec2 s = p + vec2(0.55, -0.05);
    float surf = 1.0 - smoothstep(0.35, 1.25, length(s));
    float plasma = domainWarp(s * 2.4 + vec2(-0.10 * t, 0.06 * t), t);
    col += fireRamp(plasma * surf * 1.55) * surf * (0.55 + 1.9 * plasma);

    // comet core moving diagonally, inspired by the bright object in the reference
    vec2 cometPos = vec2(0.80 - fract(t * 0.08) * 1.9, -0.55 + fract(t * 0.08) * 0.95);
    vec2 d = p - cometPos;
    d = rot2(d, -0.45);
    float core = exp(-dot(d, d) * 68.0);
    float tail = exp(-abs(d.y) * 9.0) * smoothstep(-1.1, 0.0, -d.x) * exp(d.x * 1.9);
    float smoke = fbmHeavy(d * 4.2 + vec2(-t * 0.5, t * 0.1));
    tail *= 0.55 + smoke * 0.9;
    col += vec3(1.0, 0.92, 0.55) * core * 2.0;
    col += fireRamp(tail) * tail * 1.5;

    col += starField(uv, t) * (1.0 - surf * 0.65);
    return col;
}

// -----------------------------------------------------------------------------
// Scene 7: technical dark HUD replacement for the real equipment shot
// -----------------------------------------------------------------------------
float segmentDigit(vec2 p, vec2 a, vec2 b, float w)
{
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = sat(dot(pa, ba) / dot(ba, ba));
    float d = length(pa - ba * h);
    return 1.0 - smoothstep(w, w + 0.012, d);
}

float sevenSeg(vec2 p, int digit)
{
    // local p roughly in [-0.5,0.5]
    float a = segmentDigit(p, vec2(-0.23,  0.38), vec2(0.23,  0.38), 0.035);
    float b = segmentDigit(p, vec2( 0.28,  0.32), vec2(0.28,  0.03), 0.035);
    float c = segmentDigit(p, vec2( 0.28, -0.03), vec2(0.28, -0.32), 0.035);
    float d = segmentDigit(p, vec2(-0.23, -0.38), vec2(0.23, -0.38), 0.035);
    float e = segmentDigit(p, vec2(-0.28, -0.03), vec2(-0.28,-0.32), 0.035);
    float f = segmentDigit(p, vec2(-0.28,  0.32), vec2(-0.28, 0.03), 0.035);
    float g = segmentDigit(p, vec2(-0.21,  0.00), vec2(0.21,  0.00), 0.035);

    float on = 0.0;
    if (digit == 0) on = max(max(max(max(max(a,b),c),d),e),f);
    if (digit == 1) on = max(b,c);
    if (digit == 2) on = max(max(max(max(a,b),g),e),d);
    if (digit == 3) on = max(max(max(max(a,b),c),d),g);
    if (digit == 4) on = max(max(max(f,g),b),c);
    if (digit == 5) on = max(max(max(max(a,f),g),c),d);
    if (digit == 6) on = max(max(max(max(max(a,f),g),c),d),e);
    if (digit == 7) on = max(max(a,b),c);
    if (digit == 8) on = max(max(max(max(max(max(a,b),c),d),e),f),g);
    if (digit == 9) on = max(max(max(max(max(a,b),c),d),f),g);
    return on;
}

vec3 sceneCosmicHUD(vec2 uv, float t)
{
    vec2 p = uv;
    vec3 col = starField(p, t) * 0.14;

    // dark panel body
    float panel = smoothstep(0.92, 0.88, abs(p.x)) * smoothstep(0.42, 0.38, abs(p.y + 0.02));
    float edge = smoothstep(0.92, 0.88, abs(p.x)) * (1.0 - smoothstep(0.38, 0.44, abs(p.y + 0.02)));
    edge += smoothstep(0.42, 0.38, abs(p.y + 0.02)) * (1.0 - smoothstep(0.88, 0.94, abs(p.x)));
    col += vec3(0.015, 0.020, 0.025) * panel;
    col += vec3(0.02, 0.35, 0.55) * edge * 0.25;

    // red LED digits, abstract but similar mood to the equipment frame
    int baseDigit = int(mod(floor(t * 1.6), 10.0));
    for (int i = 0; i < 5; i++)
    {
        float fi = float(i);
        vec2 dp = p - vec2(-0.48 + fi * 0.24, 0.12);
        dp /= vec2(0.18, 0.30);
        int dig = int(mod(float(baseDigit + i * 3), 10.0));
        float seg = sevenSeg(dp, dig);
        col += vec3(1.0, 0.04, 0.015) * seg * 1.5;
        col += vec3(1.0, 0.07, 0.02) * exp(-length(dp) * 4.0) * seg * 0.3;
    }

    // scanning line and dust
    float scan = exp(-abs(p.y - (0.28 * sin(t * 0.7))) * 70.0);
    col += vec3(0.05, 0.70, 0.90) * scan * panel * 0.20;
    col += sceneLightTrails(uv * 0.9 + vec2(0.0, -0.45), t) * 0.18;
    return col;
}

// -----------------------------------------------------------------------------
// Transitions and post process
// -----------------------------------------------------------------------------
float sceneWindow(float t, float a, float b)
{
    return smoother(a, a + 0.9, t) * (1.0 - smoother(b - 0.9, b, t));
}

float transitionPulse(float localTime, float duration)
{
    float x = localTime / max(0.001, duration);
    return exp(-pow((x - 0.5) * 3.0, 2.0));
}

vec3 applyPost(vec3 col, vec2 uv, float t)
{
    // simple bloom-like glow curve
    vec3 bloom = max(col - 0.65, 0.0);
    col += bloom * bloom * 0.55;

    // ACES-like filmic tonemap
    col = max(col, 0.0);
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

    // contrast and color grade
    col = pow(sat(col), vec3(0.92));
    col *= vec3(1.04, 0.96, 0.90);

    // vignette
    float vig = 1.0 - dot(uv, uv) * 0.32;
    vig *= smoothstep(1.45, 0.25, length(uv));
    col *= sat(vig);

    // chromatic aberration impression using edge tint only; no texture sampling needed
    float edge = smoothstep(0.35, 1.25, length(uv));
    col.r += edge * 0.012;
    col.b += edge * 0.020;

    // film grain
    float grain = hash21(gl_FragCoord.xy + fract(t) * 719.37) - 0.5;
    col += grain * 0.025;

    return sat(col);
}

vec3 renderTimeline(vec2 uv, float globalTime)
{
    // Full cinematic loop. You can change TOTAL_TIME to make the sequence faster/slower.
    float TOTAL_TIME = 48.0;
    float t = mod(globalTime, TOTAL_TIME);

    // Render all scenes, then blend by windows. This avoids hard if-block artifacts.
    vec3 s0 = sceneFireNebula(uv, t);
    vec3 s1 = sceneGoldenBurst(uv, t - 6.0);
    vec3 s2 = sceneGalaxyEye(uv, t - 12.0);
    vec3 s3 = sceneLightTrails(uv, t - 18.0);
    vec3 s4 = sceneBlueDust(uv, t - 24.0);
    vec3 s5 = sceneCometSurface(uv, t - 30.0);
    vec3 s6 = sceneCosmicHUD(uv, t - 36.0);
    vec3 s7 = sceneFireNebula(rot2(uv, 0.20), t + 18.0) * 0.75 + sceneGalaxyEye(uv * 0.9, t + 7.0) * 0.55;

    float w0 = sceneWindow(t,  0.0,  6.5);
    float w1 = sceneWindow(t,  5.5, 12.5);
    float w2 = sceneWindow(t, 11.5, 18.5);
    float w3 = sceneWindow(t, 17.5, 24.5);
    float w4 = sceneWindow(t, 23.5, 30.5);
    float w5 = sceneWindow(t, 29.5, 36.5);
    float w6 = sceneWindow(t, 35.5, 42.5);
    float w7 = sceneWindow(t, 41.5, 48.0) + (1.0 - smoother(0.0, 0.8, t));

    float sumW = max(0.0001, w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7);
    vec3 col = (s0*w0 + s1*w1 + s2*w2 + s3*w3 + s4*w4 + s5*w5 + s6*w6 + s7*w7) / sumW;

    // white/golden flash at transition moments
    float flash = 0.0;
    flash += transitionPulse(abs(t -  6.0), 1.2);
    flash += transitionPulse(abs(t - 12.0), 1.0);
    flash += transitionPulse(abs(t - 18.0), 1.0) * 0.55;
    flash += transitionPulse(abs(t - 30.0), 1.1) * 0.55;
    flash += transitionPulse(abs(t - 42.0), 1.2) * 0.45;
    col += vec3(1.0, 0.78, 0.38) * flash * 0.11;

    return col;
}

// -----------------------------------------------------------------------------
// Entry points
// -----------------------------------------------------------------------------
void mainImage(out vec4 outColor, in vec2 fragCoord)
{
    vec2 res = max(iResolution.xy, vec2(1.0));
    vec2 uv = (fragCoord - 0.5 * res) / res.y;

    // tiny camera breathing motion, cinematic but not too distracting
    float t = iTime;
    uv *= 1.0 + 0.018 * sin(t * 0.23);
    uv = rot2(uv, 0.006 * sin(t * 0.17));

    vec3 col = renderTimeline(uv, t);
    col = applyPost(col, uv, t);
    outColor = vec4(col, 1.0);
}

void main()
{
    vec4 colorOut;
    mainImage(colorOut, gl_FragCoord.xy);
    gl_FragColor = colorOut;
}
