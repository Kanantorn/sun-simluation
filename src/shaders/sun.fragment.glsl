uniform float u_time;
uniform float u_octaves;
uniform float u_lacunarity;
uniform float u_gain;
uniform float u_rotationSpeed;
uniform float u_sunspotIntensity;
uniform vec3 u_baseColor;
uniform vec3 u_spotColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Improved hash function for better randomness
vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p.zxy, p.yxz + 19.27);
    return fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z));
}

// Quintic interpolation function (smoother than smoothstep)
float quintic(float t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Enhanced noise function with quintic interpolation
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // Quintic interpolation
    vec3 u = vec3(quintic(f.x), quintic(f.y), quintic(f.z));
    
    // 8 corners of the cube
    float a = dot(hash33(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0));
    float b = dot(hash33(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
    float c = dot(hash33(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
    float d = dot(hash33(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
    float e = dot(hash33(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
    float f1 = dot(hash33(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
    float g = dot(hash33(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
    float h = dot(hash33(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
    
    // Trilinear interpolation
    float x1 = mix(a, b, u.x);
    float x2 = mix(c, d, u.x);
    float y1 = mix(x1, x2, u.y);
    
    float x3 = mix(e, f1, u.x);
    float x4 = mix(g, h, u.x);
    float y2 = mix(x3, x4, u.y);
    
    return mix(y1, y2, u.z) * 0.5 + 0.5;
}

// Domain warping function for more complex patterns
vec3 domainWarp(vec3 p, float strength) {
    vec3 q = vec3(
        noise(p + vec3(5.2, 1.3, 2.8)),
        noise(p + vec3(1.7, 9.2, 3.1)),
        noise(p + vec3(8.3, 2.8, 5.6))
    );
    
    return p + q * strength;
}

// Advanced Fractal Brownian Motion with variable lacunarity and gain
float fBm(vec3 p, float octaves, float lacunarity, float gain) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    // Create rotation matrices for animation
    float angle = u_rotationSpeed * u_time;
    mat3 rotx = mat3(
        1.0, 0.0, 0.0,
        0.0, cos(angle), -sin(angle),
        0.0, sin(angle), cos(angle)
    );
    mat3 roty = mat3(
        cos(angle * 0.5), 0.0, sin(angle * 0.5),
        0.0, 1.0, 0.0,
        -sin(angle * 0.5), 0.0, cos(angle * 0.5)
    );
    mat3 rotz = mat3(
        cos(angle * 0.3), -sin(angle * 0.3), 0.0,
        sin(angle * 0.3), cos(angle * 0.3), 0.0,
        0.0, 0.0, 1.0
    );
    
    // Apply domain warping for more complex patterns
    p = domainWarp(p, 0.3);
    
    // Apply multiple octaves of noise
    for (float i = 0.0; i < 10.0; i++) {
        if (i >= octaves) break;
        
        value += amplitude * noise(p);
        
        // Apply per-octave rotation for more natural patterns
        p = rotx * roty * rotz * p * lacunarity;
        amplitude *= gain;
    }
    
    return value;
}

// Sunspot simulation function
float sunspot(vec3 p, float threshold, float sharpness) {
    // Generate large-scale noise pattern for sunspot placement
    float spotPattern = noise(p * 0.5);
    
    // Apply threshold with adjustable sharpness
    return 1.0 - smoothstep(threshold, threshold + sharpness, spotPattern);
}

// Temperature mapping function (converts noise value to realistic sun color)
vec3 temperatureMap(float value, float spotFactor) {
    // Base colors for different temperatures
    vec3 coolColor = vec3(0.8, 0.3, 0.0);   // Dark orange/red (cooler regions)
    vec3 midColor = vec3(1.0, 0.6, 0.0);    // Bright orange/yellow (mid temperature)
    vec3 hotColor = vec3(1.0, 0.9, 0.7);    // Almost white (hottest regions)
    vec3 spotColor = vec3(0.4, 0.1, 0.0);   // Dark spot color
    
    // Mix between temperature colors based on noise value
    vec3 baseColor = mix(coolColor, midColor, value);
    baseColor = mix(baseColor, hotColor, pow(value, 2.0));
    
    // Apply sunspot darkening
    return mix(baseColor, spotColor, spotFactor * u_sunspotIntensity);
}

// Granulation effect (simulates convection cells on sun's surface)
float granulation(vec3 p, float scale) {
    // Use higher frequency noise for small-scale granulation
    return noise(p * scale) * 0.2;
}

void main() {
    vec3 p = vPosition;
    
    // Apply fractal noise for surface texture with user-controlled parameters
    float mainNoise = fBm(p, u_octaves, u_lacunarity, u_gain);
    
    // Generate sunspots
    float spotFactor = sunspot(p, 0.6, 0.1);
    
    // Add granulation effect
    float grain = granulation(p, 20.0);
    mainNoise = mix(mainNoise, mainNoise * (1.0 - grain), 0.3);
    
    // Calculate final color with temperature mapping
    vec3 color = temperatureMap(mainNoise, spotFactor);
    
    // Add glow effect using Fresnel
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
    color += vec3(1.0, 0.6, 0.3) * fresnel * 0.5;
    
    gl_FragColor = vec4(color, 1.0);
} 