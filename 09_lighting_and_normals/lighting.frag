#ifdef GL_ES
precision mediump float;
#endif

// ---------- SDF PRIMITIVES ----------

float sphereSDF(vec3 p, float radius) {
    return length(p) - radius;
}

float planeSDF(vec3 p) {
    return p.y + 1.0;
}

// ---------- SCENE MAP ----------

float mapScene(vec3 p) {
    vec3 spherePos = vec3(0.0, sin(iTime) * 0.20, 0.0);
    float sphere = sphereSDF(p - spherePos, 1.0);

    float ground = planeSDF(p);

    return min(sphere, ground);
}

// ---------- MATERIAL DETECTION ----------

float getMaterial(vec3 p) {
    vec3 spherePos = vec3(0.0, sin(iTime) * 0.20, 0.0);
    float sphere = sphereSDF(p - spherePos, 1.0);
    float ground = planeSDF(p);

    if (sphere < ground) {
        return 1.0; // sphere
    }

    return 2.0; // ground
}

// ---------- RAY MARCHING ----------

float rayMarch(vec3 ro, vec3 rd) {
    float t = 0.0;

    for (int i = 0; i < 120; i++) {
        vec3 p = ro + rd * t;
        float d = mapScene(p);

        if (d < 0.001) {
            return t;
        }

        t += d;

        if (t > 30.0) {
            break;
        }
    }

    return -1.0;
}

// ---------- NORMAL ESTIMATION ----------

vec3 estimateNormal(vec3 p) {
    float eps = 0.001;

    vec2 e = vec2(eps, 0.0);

    return normalize(vec3(
        mapScene(p + e.xyy) - mapScene(p - e.xyy),
        mapScene(p + e.yxy) - mapScene(p - e.yxy),
        mapScene(p + e.yyx) - mapScene(p - e.yyx)
    ));
}

// ---------- SOFT SHADOW ----------

float softShadow(vec3 ro, vec3 rd) {
    float result = 1.0;
    float t = 0.03;

    for (int i = 0; i < 60; i++) {
        vec3 p = ro + rd * t;
        float h = mapScene(p);

        if (h < 0.001) {
            return 0.0;
        }

        result = min(result, 8.0 * h / t);
        t += clamp(h, 0.02, 0.25);

        if (t > 15.0) {
            break;
        }
    }

    return clamp(result, 0.0, 1.0);
}

// ---------- BACKGROUND ----------

vec3 background(vec2 uv) {
    vec3 bottom = vec3(0.95, 0.38, 0.12);
    vec3 top    = vec3(0.025, 0.035, 0.12);

    vec3 col = mix(bottom, top, uv.y);

    // Small sun glow in background
    vec2 sunPos = vec2(0.72, 0.62);
    float d = length(uv - sunPos);
    col += vec3(1.0, 0.35, 0.1) * 0.02 / d;

    return col;
}

// ---------- LIGHTING MODEL ----------

vec3 applyLighting(vec3 p, vec3 normal, vec3 viewDir, vec3 baseColor) {
    vec3 lightPos = vec3(3.5, 4.0, 4.0);
    vec3 lightDir = normalize(lightPos - p);

    // Diffuse light
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Soft shadow
    float shadow = softShadow(p + normal * 0.01, lightDir);

    // Specular highlight
    vec3 reflectDir = reflect(-lightDir, normal);
    float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

    // Fresnel edge glow
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);

    vec3 ambient = baseColor * 0.16;
    vec3 diffuseColor = baseColor * diffuse * shadow;
    vec3 specularColor = vec3(1.0, 0.75, 0.45) * specular * shadow * 0.6;
    vec3 fresnelColor = vec3(1.0, 0.25, 0.08) * fresnel * 0.25;

    return ambient + diffuseColor + specularColor + fresnelColor;
}

// ---------- MAIN ----------

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 screen = uv * 2.0 - 1.0;
    screen.x *= iResolution.x / iResolution.y;

    // Camera
    vec3 ro = vec3(0.0, 0.45, 5.0);
    vec3 rd = normalize(vec3(screen.x, screen.y - 0.10, -1.7));

    float dist = rayMarch(ro, rd);

    vec3 color = background(uv);

    if (dist > 0.0) {
        vec3 p = ro + rd * dist;
        vec3 normal = estimateNormal(p);
        vec3 viewDir = normalize(ro - p);

        float material = getMaterial(p);

        vec3 baseColor;

        if (material < 1.5) {
            // Sphere material
            baseColor = vec3(1.0, 0.32, 0.10);
        } else {
            // Ground material with subtle grid/noise feeling
            float pattern = sin(p.x * 3.0) * sin(p.z * 3.0);
            float groundMix = smoothstep(-0.2, 0.5, pattern);
            baseColor = mix(vec3(0.06, 0.03, 0.025), vec3(0.13, 0.055, 0.04), groundMix);
        }

        color = applyLighting(p, normal, viewDir, baseColor);

        // Distance fog
        float fog = smoothstep(4.0, 13.0, dist);
        color = mix(color, background(uv), fog);
    }

    // Gamma correction
    color = pow(color, vec3(0.4545));

    gl_FragColor = vec4(color, 1.0);
}