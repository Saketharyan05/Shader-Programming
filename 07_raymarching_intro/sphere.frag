#ifdef GL_ES
precision mediump float;
#endif

// Signed Distance Function for a sphere
float sphereSDF(vec3 p, float radius) {
    return length(p) - radius;
}

// Scene distance function
float mapScene(vec3 p) {
    return sphereSDF(p, 1.0);
}

// Ray marching function
float rayMarch(vec3 rayOrigin, vec3 rayDirection) {
    float totalDistance = 0.0;

    for (int i = 0; i < 80; i++) {
        vec3 currentPosition = rayOrigin + rayDirection * totalDistance;

        float distanceToScene = mapScene(currentPosition);

        if (distanceToScene < 0.001) {
            return totalDistance;
        }

        totalDistance += distanceToScene;

        if (totalDistance > 20.0) {
            break;
        }
    }

    return -1.0;
}

// Estimate normal using small distance samples
vec3 estimateNormal(vec3 p) {
    float eps = 0.001;

    float dx = mapScene(vec3(p.x + eps, p.y, p.z)) - mapScene(vec3(p.x - eps, p.y, p.z));
    float dy = mapScene(vec3(p.x, p.y + eps, p.z)) - mapScene(vec3(p.x, p.y - eps, p.z));
    float dz = mapScene(vec3(p.x, p.y, p.z + eps)) - mapScene(vec3(p.x, p.y, p.z - eps));

    return normalize(vec3(dx, dy, dz));
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    // Convert from 0..1 to -1..1
    vec2 screen = uv * 2.0 - 1.0;
    screen.x *= iResolution.x / iResolution.y;

    // Camera
    vec3 rayOrigin = vec3(0.0, 0.0, 4.0);
    vec3 rayDirection = normalize(vec3(screen, -1.5));

    // Ray march
    float distance = rayMarch(rayOrigin, rayDirection);

    vec3 color = vec3(0.02, 0.025, 0.05);

    if (distance > 0.0) {
        vec3 hitPoint = rayOrigin + rayDirection * distance;
        vec3 normal = estimateNormal(hitPoint);

        vec3 lightDirection = normalize(vec3(1.0, 1.0, 2.0));

        float diffuse = max(dot(normal, lightDirection), 0.0);

        vec3 sphereColor = vec3(0.9, 0.35, 0.12);
        color = sphereColor * diffuse;

        // Add a little ambient light
        color += sphereColor * 0.15;
    }

    gl_FragColor = vec4(color, 1.0);
}