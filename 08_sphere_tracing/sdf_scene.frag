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
    // Moving sphere
    vec3 spherePos = vec3(0.0, sin(iTime) * 0.25, 0.0);
    float sphere = sphereSDF(p - spherePos, 1.0);

    // Ground plane
    float ground = planeSDF(p);

    return min(sphere, ground);
}

// ---------- RAY MARCHING ----------

float rayMarch(vec3 ro, vec3 rd) {
    float totalDistance = 0.0;

    for (int i = 0; i < 100; i++) {
        vec3 p = ro + rd * totalDistance;
        float d = mapScene(p);

        if (d < 0.001) {
            return totalDistance;
        }

        totalDistance += d;

        if (totalDistance > 30.0) {
            break;
        }
    }

    return -1.0;
}

// ---------- NORMAL ESTIMATION ----------

vec3 estimateNormal(vec3 p) {
    float eps = 0.001;

    vec3 x = vec3(eps, 0.0, 0.0);
    vec3 y = vec3(0.0, eps, 0.0);
    vec3 z = vec3(0.0, 0.0, eps);

    return normalize(vec3(
        mapScene(p + x) - mapScene(p - x),
        mapScene(p + y) - mapScene(p - y),
        mapScene(p + z) - mapScene(p - z)
    ));
}

// ---------- SOFT SHADOW ----------

float softShadow(vec3 ro, vec3 rd) {
    float shadow = 1.0;
    float t = 0.02;

    for (int i = 0; i < 50; i++) {
        vec3 p = ro + rd * t;
        float h = mapScene(p);

        if (h < 0.001) {
            return 0.0;
        }

        shadow = min(shadow, 10.0 * h / t);
        t += h;

        if (t > 15.0) {
            break;
        }
    }

    return clamp(shadow, 0.0, 1.0);
}

// ---------- BACKGROUND ----------

vec3 background(vec2 uv) {
    vec3 bottom = vec3(0.9, 0.35, 0.12);
    vec3 top    = vec3(0.03, 0.04, 0.12);

    return mix(bottom, top, uv.y);
}

// ---------- MAIN ----------

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    vec2 screen = uv * 2.0 - 1.0;
    screen.x *= iResolution.x / iResolution.y;

    // Camera
    vec3 ro = vec3(0.0, 0.5, 5.0);
    vec3 rd = normalize(vec3(screen.x, screen.y - 0.15, -1.6));

    float dist = rayMarch(ro, rd);

    vec3 color = background(uv);

    if (dist > 0.0) {
        vec3 hitPoint = ro + rd * dist;
        vec3 normal = estimateNormal(hitPoint);

        vec3 lightPos = vec3(3.0, 4.0, 4.0);
        vec3 lightDir = normalize(lightPos - hitPoint);

        float diffuse = max(dot(normal, lightDir), 0.0);
        float shadow = softShadow(hitPoint + normal * 0.01, lightDir);

        // Decide color based on height
        vec3 objectColor;

        if (hitPoint.y < -0.95) {
            // Ground
            objectColor = vec3(0.09, 0.045, 0.035);
        } else {
            // Sphere
            objectColor = vec3(1.0, 0.35, 0.12);
        }

        vec3 ambient = objectColor * 0.18;
        vec3 lighting = objectColor * diffuse * shadow;

        color = ambient + lighting;

        // Distance fog
        float fog = smoothstep(3.0, 12.0, dist);
        color = mix(color, background(uv), fog);
    }

    gl_FragColor = vec4(color, 1.0);
}