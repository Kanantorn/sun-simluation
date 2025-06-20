uniform float u_time;
uniform float u_coronaSize;
uniform float u_coronaIntensity;
uniform float u_pulsationSpeed;
uniform vec3 u_coronaColor;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// Noise function for corona variation
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float n = i.x + i.y * 157.0 + 113.0 * i.z;
    return mix(
        mix(
            mix(fract(sin(n + 0.0) * 43758.5453), fract(sin(n + 1.0) * 43758.5453), f.x),
            mix(fract(sin(n + 157.0) * 43758.5453), fract(sin(n + 158.0) * 43758.5453), f.x),
            f.y
        ),
        mix(
            mix(fract(sin(n + 113.0) * 43758.5453), fract(sin(n + 114.0) * 43758.5453), f.x),
            mix(fract(sin(n + 270.0) * 43758.5453), fract(sin(n + 271.0) * 43758.5453), f.x),
            f.y
        ),
        f.z
    );
}

void main() {
    // Calculate intensity based on view angle (Fresnel effect)
    float intensity = 1.0 - dot(normalize(vNormal), normalize(vViewPosition));
    intensity = pow(intensity, 1.5);
    
    // Complex pulsation using multiple sine waves with different frequencies
    float pulsation = 
        0.8 + 
        0.1 * sin(u_time * u_pulsationSpeed) + 
        0.05 * sin(u_time * u_pulsationSpeed * 2.7) + 
        0.025 * sin(u_time * u_pulsationSpeed * 5.3 + 1.5);
    
    // Add noise variation to the corona
    float noiseVal = noise(vWorldPosition * 0.5 + u_time * 0.1);
    intensity *= pulsation * (0.9 + 0.1 * noiseVal);
    
    // Distance-based color variation
    float distFactor = length(vWorldPosition) / u_coronaSize;
    vec3 innerColor = u_coronaColor;
    vec3 outerColor = vec3(1.0, 0.6, 0.1); // Slightly more yellow at the edges
    vec3 finalColor = mix(innerColor, outerColor, pow(distFactor, 2.0));
    
    // Create glow color with intensity
    vec3 glow = finalColor * intensity * u_coronaIntensity;
    
    // Fade out at the edges
    float alpha = intensity * 0.5 * u_coronaIntensity;
    
    gl_FragColor = vec4(glow, alpha);
} 