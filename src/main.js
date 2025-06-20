import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GUI } from 'lil-gui';

// Import shaders
import sunVertexShader from './shaders/sun.vertex.glsl?raw';
import sunFragmentShader from './shaders/sun.fragment.glsl?raw';
import coronaVertexShader from './shaders/corona.vertex.glsl?raw';
import coronaFragmentShader from './shaders/corona.fragment.glsl?raw';

// Get a reference to the existing loading indicator from enhanced.html
const loadingDiv = document.getElementById('loading');

// Ensure the loadingDiv exists before proceeding, otherwise log an error
if (!loadingDiv) {
    console.error('Loading indicator element with ID "loading" not found in the HTML. The simulation might not load correctly or display errors.');
}

console.log('Sun simulation script is loading...', new Date().toISOString());

// Create global variables to track loading state
window.sunSimulationLoaded = false;
window.sunSimulationError = null;

// Function to initialize Three.js
function initThreeJS() {
    console.log('Initializing Three.js...', new Date().toISOString());
    
    try {
        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000); // Black background for better contrast with the skybox
        console.log('Scene created');

        // Camera
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        console.log('Camera created');

        // Create renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance' // Enable high-performance rendering
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Enable tone mapping for better HDR visuals
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        console.log('Renderer created');
        
        // Append the renderer's canvas to the body
        document.body.appendChild(renderer.domElement);
        console.log('Canvas appended to body');

        // Add OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2;
        controls.maxDistance = 10;
        console.log('Orbit controls added');

        // Lighting for PBR materials
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        scene.add(ambientLight);

        // Point light from the sun
        const sunLight = new THREE.PointLight(0xffffff, 2, 50);
        sunLight.position.set(0, 0, 0);
        scene.add(sunLight);

        // Texture loader
        const textureLoader = new THREE.TextureLoader();

        // Directly load a panoramic Milky Way background instead of cubemap
        const milkyWayTexture = textureLoader.load('textures/skybox/milkyway_panorama.jpg', (texture) => {
            console.log('Milky Way panorama loaded successfully');
            
            // Apply texture settings for better appearance
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            
            // Set anisotropy for sharper appearance at angles
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
            
            // Update the skybox after texture load
            skyboxMesh.material.needsUpdate = true;
            
        }, undefined, (err) => {
            console.error('Error loading Milky Way panorama:', err);
        });
        
        // Set rendering parameters for better space visualization
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.8;
        
        // Create a large sphere for the skybox
        const skyboxGeometry = new THREE.SphereGeometry(400, 60, 40);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            map: milkyWayTexture,
            side: THREE.BackSide,
            color: 0xffd28a,  // Warm golden tint
            transparent: true,
            opacity: 1.0,
        });
        
        const skyboxMesh = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        scene.add(skyboxMesh);
        
        // Add a slight rotation to position the most interesting part of the Milky Way
        skyboxMesh.rotation.y = Math.PI / 4;
        
        // Make the scene background black for better contrast with the skybox
        scene.background = new THREE.Color(0x000000);
        
        // Create a sun sphere instead of a cube
        const sunGeometry = new THREE.SphereGeometry(1, 128, 128); // Higher segment count for smoother sphere
        console.log('Sun geometry created');
        
        // Create a more realistic sun material with emissive properties
        const sunMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_octaves: { value: 6.0 },
                u_lacunarity: { value: 2.0 },
                u_gain: { value: 0.5 },
                u_rotationSpeed: { value: 0.001 },
                u_sunspotIntensity: { value: 0.5 },
                u_baseColor: { value: new THREE.Vector3(1.0, 0.6, 0.0) }, // Orange-yellow color
                u_spotColor: { value: new THREE.Vector3(0.4, 0.1, 0.0) } // Dark spot color
            },
            vertexShader: sunVertexShader,
            fragmentShader: sunFragmentShader
        });
        console.log('Sun material created');
        
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        scene.add(sun);
        console.log('Sun added to scene');

        // Create a subtle corona effect around the sun
        const coronaGeometry = new THREE.SphereGeometry(1.2, 64, 64);
        const coronaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0.0 },
                u_coronaSize: { value: 1.2 },
                u_coronaIntensity: { value: 1.0 },
                u_pulsationSpeed: { value: 0.5 },
                u_coronaColor: { value: new THREE.Vector3(1.0, 0.4, 0.0) }
            },
            vertexShader: coronaVertexShader,
            fragmentShader: coronaFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.FrontSide,
            depthWrite: false // Important for additive blending effects
        });
        console.log('Corona material created');
        
        const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
        scene.add(corona);
        console.log('Corona added to scene');

        // Define planet properties
        const planetsData = [
            { name: 'Mercury', radius: 0.05, orbitalRadius: 1.5, orbitalSpeed: 0.048, eccentricity: 0.205, color: 0xAAAAAA, rotationSpeed: 0.005, texture: 'textures/mercury.jpg' },
            { name: 'Venus', radius: 0.08, orbitalRadius: 2.0, orbitalSpeed: 0.035, eccentricity: 0.007, color: 0xE6B800, rotationSpeed: 0.003, texture: 'textures/venus_surface.jpg' },
            { name: 'Earth', radius: 0.09, orbitalRadius: 2.8, orbitalSpeed: 0.0298, eccentricity: 0.017, color: 0x0077BE, rotationSpeed: 0.02, texture: 'textures/earth.jpg' },
            { name: 'Mars', radius: 0.06, orbitalRadius: 3.5, orbitalSpeed: 0.024, eccentricity: 0.094, color: 0xCC0000, rotationSpeed: 0.015, texture: 'textures/mars.jpg' },
            { name: 'Jupiter', radius: 0.4, orbitalRadius: 6.0, orbitalSpeed: 0.013, eccentricity: 0.049, color: 0xC48F57, rotationSpeed: 0.03, texture: 'textures/jupiter.jpg' },
            { name: 'Saturn', radius: 0.35, orbitalRadius: 7.5, orbitalSpeed: 0.009, eccentricity: 0.057, color: 0xDAA520, rotationSpeed: 0.028, texture: 'textures/saturn.jpg' },
            { name: 'Uranus', radius: 0.2, orbitalRadius: 9.0, orbitalSpeed: 0.006, eccentricity: 0.046, color: 0xADD8E6, rotationSpeed: 0.01, texture: 'textures/uranus.jpg' },
            { name: 'Neptune', radius: 0.19, orbitalRadius: 10.5, orbitalSpeed: 0.005, eccentricity: 0.011, color: 0x4169E1, rotationSpeed: 0.009, texture: 'textures/neptune.jpg' }
        ];

        // Create planets
        const planets = [];
        planetsData.forEach(data => {
            // Try to load the texture if available
            let material;

            if (data.texture) {
                try {
                    const texture = textureLoader.load(data.texture);
                    
                    // Create PBR material with texture
                    material = new THREE.MeshStandardMaterial({
                        map: texture,
                        metalness: 0.0,  // Non-metallic
                        roughness: 0.7,  // Slightly rough surface
                    });
                    
                    // Add special maps for certain planets
                    if (data.name === 'Earth') {
                        // Earth only has normal map now
                        try {
                            const normalMap = textureLoader.load('textures/earth_normal.jpg');
                            material.normalMap = normalMap;
                            material.normalScale = new THREE.Vector2(0.85, 0.85);
                        } catch (e) {
                            console.warn('Could not load Earth normal map');
                        }
                    }
                    
                } catch (e) {
                    console.warn(`Could not load texture for ${data.name}, using fallback material`);
                    material = new THREE.MeshStandardMaterial({ 
                        color: data.color,
                        metalness: 0.0,
                        roughness: 0.7
                    });
                }
            } else {
                // Fallback to basic material with color
                material = new THREE.MeshStandardMaterial({ 
                    color: data.color,
                    metalness: 0.0,
                    roughness: 0.7
                });
            }

            const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
            const planet = new THREE.Mesh(geometry, material);
            scene.add(planet);
            
            // Add ring for Saturn
            if (data.name === 'Saturn') {
                try {
                    // Ring geometry
                    const innerRadius = data.radius * 1.2;
                    const outerRadius = data.radius * 2.0;
                    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
                    
                    // Ring material with transparency
                    const ringTexture = textureLoader.load('textures/saturn_ring_alpha.png');
                    let ringMaterial;

                    try {
                        const ringColorTexture = textureLoader.load('textures/saturn_ring_color.jpg');
                        ringMaterial = new THREE.MeshStandardMaterial({
                            map: ringColorTexture,
                            alphaMap: ringTexture,
                            transparent: true,
                            side: THREE.DoubleSide,
                            roughness: 0.85,
                            metalness: 0.0
                        });
                    } catch (e) {
                        console.warn('Could not load Saturn ring color texture, using fallback');
                        ringMaterial = new THREE.MeshStandardMaterial({
                            color: 0xA79D7E,
                            alphaMap: ringTexture,
                            transparent: true,
                            side: THREE.DoubleSide,
                            roughness: 0.85,
                            metalness: 0.0
                        });
                    }
                    
                    // Create the ring mesh
                    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                    ring.rotation.x = Math.PI / 2 + 0.15; // Tilt the ring slightly
                    planet.add(ring); // Attach to planet
                    
                    console.log('Saturn rings added');
                } catch (e) {
                    console.warn('Could not load Saturn ring textures', e);
                }
            }
            
            // Add Moon to Earth
            if (data.name === 'Earth') {
                try {
                    // Moon parameters
                    const moonRadius = data.radius * 0.27; // Moon is about 27% of Earth's size
                    const moonOrbitalRadius = data.radius * 2.5;
                    const moonOrbitalSpeed = 0.015; // Orbit speed
                    const moonRotationSpeed = 0.005;
                    
                    // Create moon with texture
                    const moonGeometry = new THREE.SphereGeometry(moonRadius, 24, 24);
                    let moonMaterial;
                    
                    try {
                        const moonTexture = textureLoader.load('textures/moon.jpg');
                        moonMaterial = new THREE.MeshStandardMaterial({
                            map: moonTexture,
                            metalness: 0.0,
                            roughness: 0.9 // Moon is rougher than planets
                        });
                    } catch (e) {
                        console.warn('Could not load Moon texture, using fallback');
                        moonMaterial = new THREE.MeshStandardMaterial({
                            color: 0xCCCCAA,
                            metalness: 0.0,
                            roughness: 0.9
                        });
                    }
                    
                    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
                    
                    // Create an orbit object to hold the moon
                    const moonOrbit = new THREE.Object3D();
                    moonOrbit.add(moon);
                    moon.position.x = moonOrbitalRadius;
                    
                    // Add moon orbit to planet
                    planet.add(moonOrbit);
                    
                    // Store moon data for animation
                    planets.push({ 
                        object: moon, 
                        orbit: moonOrbit,
                        data: {
                            name: 'Moon',
                            radius: moonRadius,
                            orbitalRadius: moonOrbitalRadius,
                            orbitalSpeed: moonOrbitalSpeed,
                            rotationSpeed: moonRotationSpeed
                        }
                    });
                    
                    console.log('Moon added to Earth');
                } catch (e) {
                    console.warn('Error creating Moon', e);
                }
            }
            
            planets.push({ object: planet, data });
        });

        // Create stars for the background
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.2, // Increased size for bigger stars
            sizeAttenuation: true // Stars appear smaller when farther away
        });

        const starVertices = [];
        const numStars = 10000; // Number of stars
        const starFieldRadius = 500; // Radius of the star field

        for (let i = 0; i < numStars; i++) {
            const x = (Math.random() - 0.5) * 2 * starFieldRadius;
            const y = (Math.random() - 0.5) * 2 * starFieldRadius;
            const z = (Math.random() - 0.5) * 2 * starFieldRadius;
            starVertices.push(x, y, z);
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);
        console.log('Stars added to scene');

        // Shooting Stars
        const shootingStars = [];
        const numShootingStars = 10; // Number of shooting stars
        const shootingStarSpeed = 250; // Increased speed for more dynamic movement
        const shootingStarSize = 1.5; // Increased size for more prominent main star
        const shootingStarLife = 2.5; // Life increased slightly to allow for longer tail
        const trailLength = 100; // Increased number of points in the tail for continuity

        function createShootingStar() {
            const material = new THREE.PointsMaterial({
                color: 0xFFFFFF,
                size: shootingStarSize,
                sizeAttenuation: true,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending // Ensure blending for glow
            });
            const geometry = new THREE.BufferGeometry();
            const star = new THREE.Points(geometry, material);
            scene.add(star);

            // Create trail geometry and material
            const trailMaterial = new THREE.PointsMaterial({
                color: 0xFFFFFF, // White for the trail
                size: shootingStarSize * 0.5, // Increased size for trail particles
                sizeAttenuation: true,
                transparent: true,
                opacity: 0.8, // Increased base opacity for a brighter trail
                blending: THREE.AdditiveBlending // Additive blending for glow effect
            });
            const trailGeometry = new THREE.BufferGeometry();
            const trail = new THREE.Points(trailGeometry, trailMaterial);
            scene.add(trail);

            shootingStars.push({
                object: star,
                trail: trail,
                trailPositions: [], // Store historical positions for the tail
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 0,
                originalPosition: new THREE.Vector3()
            });
            resetShootingStar(shootingStars[shootingStars.length - 1]);
        }

        function resetShootingStar(starObj) {
            // Start from one side of the screen and move across
            const startX = -starFieldRadius * 1.2; // Start off-screen left
            const startY = (Math.random() - 0.5) * 2 * starFieldRadius; // Random Y position
            const startZ = (Math.random() - 0.5) * 2 * starFieldRadius; // Random Z position

            starObj.object.position.set(startX, startY, startZ);
            starObj.originalPosition.copy(starObj.object.position);

            // Direct movement towards the right side of the screen
            const targetX = starFieldRadius * 1.2; // End off-screen right
            const targetY = (Math.random() - 0.5) * 2 * starFieldRadius; // Random target Y
            const targetZ = (Math.random() - 0.5) * 2 * starFieldRadius; // Random target Z

            const direction = new THREE.Vector3(targetX, targetY, targetZ).sub(starObj.object.position).normalize();
            starObj.velocity.copy(direction).multiplyScalar(shootingStarSpeed);

            starObj.life = 0;
            starObj.maxLife = shootingStarLife * (0.8 + Math.random() * 0.4); // Vary life slightly
            starObj.object.material.opacity = 1.0; // Ensure main star is visible

            // Clear and reset trail positions
            starObj.trailPositions = [];
            starObj.trail.geometry.setFromPoints([]);
            starObj.trail.material.opacity = 0;
        }

        for (let i = 0; i < numShootingStars; i++) {
            createShootingStar();
        }
        console.log('Shooting stars initialized');

        // Set up layer system for selective bloom
        // Layer 0: Default - everything
        // Layer 1: Objects that get bloom effect (sun, planets, stars)
        const BLOOM_LAYER = 1;
        
        // Set sun, planets, and stars to the bloom layer
        sun.layers.enable(BLOOM_LAYER);
        corona.layers.enable(BLOOM_LAYER);
        stars.layers.enable(BLOOM_LAYER);
        
        // Set planets to the bloom layer
        planets.forEach(planetObj => {
            planetObj.object.layers.enable(BLOOM_LAYER);
            
            // If this is Earth, also set the Moon to bloom layer
            if (planetObj.data.name === 'Earth' && planetObj.object.children.length > 0) {
                // Handle moon orbit and moon
                planetObj.object.children[0].traverse((child) => {
                    child.layers.enable(BLOOM_LAYER);
                });
            }
            
            // For Saturn, set rings to bloom layer
            if (planetObj.data.name === 'Saturn' && planetObj.object.children.length > 0) {
                planetObj.object.children[0].layers.enable(BLOOM_LAYER);
            }
        });
        
        // Make sure all shooting stars are on the bloom layer
        shootingStars.forEach(starObj => {
            starObj.object.layers.enable(BLOOM_LAYER);
            starObj.trail.layers.enable(BLOOM_LAYER);
        });
        
        // Set up post-processing with bloom that only affects selected layers
        const renderScene = new RenderPass(scene, camera);
        
        // Bloom pass with stronger settings for sun/planets only
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            3.0, // Bloom strength
            1.0, // Bloom radius
            0.05 // Bloom threshold
        );
        
        // Setup darkMaterial for non-bloomed objects
        const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 });
        let materials = {};
        
        // Function to set all non-bloom objects to dark material
        function darkenNonBloomed(obj) {
            if (!obj.isMesh && !obj.isPoints) return;
            
            // Fix for the layers testing - proper way to test if an object is in a layer
            if (obj.layers.isEnabled(BLOOM_LAYER)) return;
            
            // Store original material
            materials[obj.uuid] = obj.material;
            
            // Set to dark material
            if (obj.isMesh) {
                obj.material = darkMaterial;
            }
        }
        
        // Function to restore original materials
        function restoreMaterials() {
            for (const id in materials) {
                const obj = scene.getObjectByProperty('uuid', id);
                if (obj) {
                    obj.material = materials[id];
                }
            }
            materials = {};
        }
        
        // Initialize the base renderers with proper sizes
        const renderTarget = new THREE.WebGLRenderTarget(
            window.innerWidth * renderer.getPixelRatio(),
            window.innerHeight * renderer.getPixelRatio()
        );
        
        // Step 1: Initialize bloom composer with explicit render target
        const bloomComposer = new EffectComposer(renderer, renderTarget.clone());
        bloomComposer.renderToScreen = false;
        bloomComposer.addPass(new RenderPass(scene, camera));
        bloomComposer.addPass(bloomPass);
        
        // Force bloom composer to initialize its targets
        bloomComposer.render(0);
        
        // Step 2: Create final composer and add regular scene pass
        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        
        // Create shader material for final pass
        const finalPassShader = new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D bloomTexture;
                varying vec2 vUv;
                void main() {
                    vec4 base = texture2D(baseTexture, vUv);
                    vec4 bloom = texture2D(bloomTexture, vUv);
                    gl_FragColor = base + bloom;
                }
            `,
            defines: {}
        });
        
        // Add final pass to the composer
        const finalPass = new ShaderPass(finalPassShader, "baseTexture");
        finalPass.needsSwap = true;
        composer.addPass(finalPass);
        console.log('Post-processing with selective bloom initialized');

        // GUI controls
        const gui = new GUI();
        
        // Initial parameters for GUI
        const params = {
            // Sun parameters
            octaves: sunMaterial.uniforms.u_octaves.value,
            lacunarity: sunMaterial.uniforms.u_lacunarity.value,
            gain: sunMaterial.uniforms.u_gain.value,
            rotationSpeed: sunMaterial.uniforms.u_rotationSpeed.value,
            sunspotIntensity: sunMaterial.uniforms.u_sunspotIntensity.value,
            sunBaseColor: [sunMaterial.uniforms.u_baseColor.value.x * 255, sunMaterial.uniforms.u_baseColor.value.y * 255, sunMaterial.uniforms.u_baseColor.value.z * 255],
            sunSpotColor: [sunMaterial.uniforms.u_spotColor.value.x * 255, sunMaterial.uniforms.u_spotColor.value.y * 255, sunMaterial.uniforms.u_spotColor.value.z * 255],
            
            // Corona parameters
            coronaSize: coronaMaterial.uniforms.u_coronaSize.value,
            coronaIntensity: coronaMaterial.uniforms.u_coronaIntensity.value,
            pulsationSpeed: coronaMaterial.uniforms.u_pulsationSpeed.value,
            coronaColor: [coronaMaterial.uniforms.u_coronaColor.value.x * 255, coronaMaterial.uniforms.u_coronaColor.value.y * 255, coronaMaterial.uniforms.u_coronaColor.value.z * 255],

            // Bloom parameters
            bloomStrength: bloomPass.strength,
            bloomRadius: bloomPass.radius,
            bloomThreshold: bloomPass.threshold,

            // General settings
            cameraDistance: camera.position.z,
            ambientLightIntensity: ambientLight.intensity,
            pointLightIntensity: sunLight.intensity,
            backgroundIntensity: [0, 0, 0], // Changed to a dark blue color

            // Quality settings (adjust segments)
            sunSegments: sunGeometry.parameters.widthSegments,
            coronaSegments: coronaGeometry.parameters.widthSegments,
            
            // Planet settings
            showAllPlanets: true,
            planetScale: 1.0,
            
            // Milky Way settings
            milkyWayIntensity: 1.0,
            milkyWayColor: [255, 210, 138], // Golden color (0xffd28a)
            milkyWayRotation: 0
        };

        // Sun controls
        const sunFolder = gui.addFolder('Sun');
        sunFolder.add(params, 'octaves', 1, 10, 1).onChange(value => sunMaterial.uniforms.u_octaves.value = value);
        sunFolder.add(params, 'lacunarity', 1.0, 3.0, 0.1).onChange(value => sunMaterial.uniforms.u_lacunarity.value = value);
        sunFolder.add(params, 'gain', 0.1, 0.9, 0.05).onChange(value => sunMaterial.uniforms.u_gain.value = value);
        sunFolder.add(params, 'rotationSpeed', 0.0, 0.01, 0.0005).onChange(value => sunMaterial.uniforms.u_rotationSpeed.value = value);
        sunFolder.add(params, 'sunspotIntensity', 0.0, 1.0, 0.05).onChange(value => sunMaterial.uniforms.u_sunspotIntensity.value = value);
        sunFolder.addColor(params, 'sunBaseColor').onChange(value => sunMaterial.uniforms.u_baseColor.value.set(value[0] / 255, value[1] / 255, value[2] / 255));
        sunFolder.addColor(params, 'sunSpotColor').onChange(value => sunMaterial.uniforms.u_spotColor.value.set(value[0] / 255, value[1] / 255, value[2] / 255));
        
        // Corona controls
        const coronaFolder = gui.addFolder('Corona');
        coronaFolder.add(params, 'coronaSize', 1.1, 2.0, 0.05).onChange(value => {
            params.coronaSize = value;
            coronaMaterial.uniforms.u_coronaSize.value = value;
            corona.scale.set(value, value, value);
        });
        coronaFolder.add(params, 'coronaIntensity', 0.1, 2.0, 0.1).onChange(value => coronaMaterial.uniforms.u_coronaIntensity.value = value);
        coronaFolder.add(params, 'pulsationSpeed', 0.0, 2.0, 0.1).onChange(value => coronaMaterial.uniforms.u_pulsationSpeed.value = value);
        coronaFolder.addColor(params, 'coronaColor').onChange(value => coronaMaterial.uniforms.u_coronaColor.value.set(value[0] / 255, value[1] / 255, value[2] / 255));
        
        // Bloom effect controls
        const bloomFolder = gui.addFolder('Bloom Effect');
        bloomFolder.add(params, 'bloomStrength', 0.0, 5.0, 0.1).name('Strength').onChange(value => {
            bloomPass.strength = value;
        });
        bloomFolder.add(params, 'bloomRadius', 0.0, 1.0, 0.01).name('Radius').onChange(value => {
            bloomPass.radius = value;
        });
        bloomFolder.add(params, 'bloomThreshold', 0.0, 1.0, 0.01).name('Threshold').onChange(value => {
            bloomPass.threshold = value;
        });
        
        // Bloom Layer controls to toggle which objects get bloom
        const bloomLayerFolder = gui.addFolder('Bloom Objects');
        
        // Add a toggle for sun bloom
        const bloomObjects = {
            sunBloom: true,
            planetBloom: true,
            starsBloom: true,
            shootingStarsBloom: true
        };
        
        bloomLayerFolder.add(bloomObjects, 'sunBloom').name('Sun & Corona').onChange(value => {
            sun.layers.enable(BLOOM_LAYER);
            corona.layers.enable(BLOOM_LAYER);
            
            if (!value) {
                sun.layers.disable(BLOOM_LAYER);
                corona.layers.disable(BLOOM_LAYER);
            }
        });
        
        bloomLayerFolder.add(bloomObjects, 'planetBloom').name('Planets').onChange(value => {
            planets.forEach(planetObj => {
                if (value) {
                    planetObj.object.layers.enable(BLOOM_LAYER);
                    
                    // For Earth and Saturn, handle children
                    if (['Earth', 'Saturn'].includes(planetObj.data.name) && planetObj.object.children.length > 0) {
                        planetObj.object.children.forEach(child => {
                            child.traverse(c => c.layers.enable(BLOOM_LAYER));
                        });
                    }
                } else {
                    planetObj.object.layers.disable(BLOOM_LAYER);
                    
                    // For Earth and Saturn, handle children
                    if (['Earth', 'Saturn'].includes(planetObj.data.name) && planetObj.object.children.length > 0) {
                        planetObj.object.children.forEach(child => {
                            child.traverse(c => c.layers.disable(BLOOM_LAYER));
                        });
                    }
                }
            });
        });
        
        bloomLayerFolder.add(bloomObjects, 'starsBloom').name('Background Stars').onChange(value => {
            if (value) {
                stars.layers.enable(BLOOM_LAYER);
            } else {
                stars.layers.disable(BLOOM_LAYER);
            }
        });
        
        bloomLayerFolder.add(bloomObjects, 'shootingStarsBloom').name('Shooting Stars').onChange(value => {
            shootingStars.forEach(starObj => {
                if (value) {
                    starObj.object.layers.enable(BLOOM_LAYER);
                    starObj.trail.layers.enable(BLOOM_LAYER);
                } else {
                    starObj.object.layers.disable(BLOOM_LAYER);
                    starObj.trail.layers.disable(BLOOM_LAYER);
                }
            });
        });

        // General settings
        const generalFolder = gui.addFolder('General Settings');
        generalFolder.add(params, 'cameraDistance', 2.0, 10.0, 0.1).onChange(value => camera.position.z = value);
        generalFolder.add(params, 'ambientLightIntensity', 0.0, 1.0, 0.01).onChange(value => {
            ambientLight.intensity = value;
        });
        generalFolder.add(params, 'pointLightIntensity', 0.0, 5.0, 0.1).onChange(value => sunLight.intensity = value);
        generalFolder.addColor(params, 'backgroundIntensity').onChange(value => {
            // Only update if the background is a color, not a skybox
            if (scene.background instanceof THREE.Color) {
                scene.background.setRGB(value[0] / 255, value[1] / 255, value[2] / 255);
            }
        });

        // Quality settings
        const qualityFolder = gui.addFolder('Quality');
        qualityFolder.add(params, 'sunSegments', [32, 64, 128, 256]).onChange(value => {
            sunGeometry.dispose();
            sun.geometry = new THREE.SphereGeometry(1, value, value);
        });
        qualityFolder.add(params, 'coronaSegments', [16, 32, 64, 128]).onChange(value => {
            coronaGeometry.dispose();
            corona.geometry = new THREE.SphereGeometry(params.coronaSize, value, value);
        });
        
        // Planet Controls folder
        const planetFolder = gui.addFolder('Planet Controls');
        
        // Add planet scale slider
        planetFolder.add(params, 'planetScale', 0.1, 3.0, 0.1).name('Planet Size Scale').onChange(value => {
            planets.forEach(planetObj => {
                // Skip the sun
                if (planetObj.data.name !== 'Sun') {
                    // Apply scale based on original radius
                    planetObj.object.scale.set(value, value, value);
                }
            });
        });
        
        // Add planet visibility toggles
        planetFolder.add(params, 'showAllPlanets').name('Show All Planets').onChange(value => {
            // Create planet toggles if they don't exist
            if (!window.planetToggles) {
                window.planetToggles = {};
                planetsData.forEach(data => {
                    window.planetToggles[data.name] = true;
                });
                window.planetToggles['Moon'] = true;
            }
            
            // Update all individual toggles
            Object.keys(window.planetToggles).forEach(planetName => {
                window.planetToggles[planetName] = value;
                
                // Update planet visibility
                const planetObj = planets.find(p => p.data.name === planetName);
                if (planetObj) {
                    planetObj.object.visible = value;
                }
            });
        });
        
        // Create planet toggles if they don't exist
        if (!window.planetToggles) {
            window.planetToggles = {};
            planetsData.forEach(data => {
                window.planetToggles[data.name] = true;
            });
            window.planetToggles['Moon'] = true;
        }
        
        // Add individual planet toggles
        Object.keys(window.planetToggles).forEach(planetName => {
            planetFolder.add(window.planetToggles, planetName).name(`Show ${planetName}`).onChange(value => {
                const planetObj = planets.find(p => p.data.name === planetName);
                if (planetObj) {
                    planetObj.object.visible = value;
                }
                
                // Check if all planets have the same visibility
                const allSameValue = Object.values(window.planetToggles).every(v => v === value);
                if (allSameValue) {
                    // Update the "Show All Planets" control
                    params.showAllPlanets = value;
                }
            });
        });

        // Milky Way controls
        const milkyWayFolder = gui.addFolder('Milky Way');
        milkyWayFolder.add(params, 'milkyWayIntensity', 0.1, 2.0, 0.1).name('Intensity').onChange(value => {
            skyboxMaterial.opacity = value;
        });
        milkyWayFolder.addColor(params, 'milkyWayColor').name('Tint Color').onChange(value => {
            skyboxMaterial.color.setRGB(value[0]/255, value[1]/255, value[2]/255);
        });
        milkyWayFolder.add(params, 'milkyWayRotation', 0, Math.PI * 2, 0.1).name('Rotation').onChange(value => {
            skyboxMesh.rotation.y = value;
        });

        // Open all folders by default
        sunFolder.open();
        coronaFolder.open();
        bloomFolder.open();
        bloomLayerFolder.open();
        planetFolder.open();
        generalFolder.open();
        qualityFolder.open();
        milkyWayFolder.open();
        
        console.log('GUI controls set up');

        // Animation loop
        const clock = new THREE.Clock(); // Add Three.js Clock for delta time
        function animate() {
            requestAnimationFrame(animate);
            
            // Update controls
            controls.update();
            
            // Rotate the sun slowly
            sun.rotation.y += 0.005;
            sun.rotation.x += 0.001;
            
            // Rotate the corona in the opposite direction for effect
            corona.rotation.y -= 0.002;
            corona.rotation.z += 0.001;
            
            // Update shader time uniform
            const time = performance.now() * 0.001; // Convert milliseconds to seconds
            sunMaterial.uniforms.u_time.value = time;
            coronaMaterial.uniforms.u_time.value = time;
            
            // Rotate the star field for dynamic effect
            stars.rotation.y += 0.0001; 

            // Animate shooting stars
            const deltaTime = clock.getDelta();
            shootingStars.forEach(starObj => {
                // Update main star position
                starObj.object.position.addScaledVector(starObj.velocity, deltaTime);
                starObj.life += deltaTime;

                // Add current position to trail history
                starObj.trailPositions.push(starObj.object.position.clone());

                // Trim trail history to desired length
                if (starObj.trailPositions.length > trailLength) {
                    starObj.trailPositions.shift();
                }

                // Update trail geometry with positions and colors for fading effect
                const positions = [];
                const colors = [];
                const baseColor = new THREE.Color(0xFFFFFF);
                for (let i = 0; i < starObj.trailPositions.length; i++) {
                    positions.push(starObj.trailPositions[i].x, starObj.trailPositions[i].y, starObj.trailPositions[i].z);
                    const trailOpacity = (i / trailLength) * (1.0 - (starObj.life / starObj.maxLife)); // Fade from transparent to opaque along the tail
                    colors.push(baseColor.r, baseColor.g, baseColor.b, trailOpacity);
                }
                starObj.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                starObj.trail.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
                starObj.trail.material.vertexColors = true; // Enable vertex colors for fading

                // Fade out main star and trail based on life
                const opacity = 1.0 - (starObj.life / starObj.maxLife);
                starObj.object.material.opacity = opacity; // Main star fades linearly
                
                // Reset if out of view or fully faded
                if (starObj.life > starObj.maxLife || starObj.object.position.x > starFieldRadius * 1.5 || starObj.object.position.x < -starFieldRadius * 1.5 ||
                    starObj.object.position.y > starFieldRadius * 1.5 || starObj.object.position.y < -starFieldRadius * 1.5 ||
                    starObj.object.position.z > starFieldRadius * 1.5 || starObj.object.position.z < -starFieldRadius * 1.5) {
                    resetShootingStar(starObj);
                }
            });

            // Animate planets with elliptical orbits
            const currentTime = performance.now() * 0.001; // Get current time in seconds
            planets.forEach(planetObj => {
                const { object, data, orbit } = planetObj;

                // Special case for Moon orbiting around Earth
                if (data.name === 'Moon' && orbit) {
                    // Rotate moon around its own axis
                    object.rotation.y += data.rotationSpeed;
                    
                    // Rotate moon orbit around Earth
                    orbit.rotation.y += data.orbitalSpeed;
                    return;
                }
                
                // Regular planet calculation
                if (!orbit) {
                    // Calculate elliptical orbit position
                    const angle = currentTime * data.orbitalSpeed;
                    const a = data.orbitalRadius; // Semi-major axis
                    const e = data.eccentricity || 0; // Eccentricity
                    const b = a * Math.sqrt(1 - e * e); // Semi-minor axis
                    
                    // Parametric form of ellipse
                    const x = a * Math.cos(angle);
                    const z = b * Math.sin(angle);
                    
                    // Apply orbital tilt randomly but consistently for each planet
                    const planetSeed = data.name.charCodeAt(0); // Use first character as seed
                    const tiltAngle = (planetSeed % 20) * 0.01; // Small tilt between 0 and 0.19
                    
                    // Apply position with orbital tilt
                    object.position.set(
                        x,
                        Math.sin(angle) * Math.sin(tiltAngle) * a * 0.05, // Small y-offset for tilt
                        z
                    );
                }
                
                // Rotate on its own axis
                object.rotation.y += data.rotationSpeed;
            });

            try {
                // First render scene with selective bloom
                // Store all objects' original materials
                materials = {};
                scene.traverse(darkenNonBloomed);
                
                // Render bloom only
                bloomComposer.render();
                
                // Restore original materials
                restoreMaterials();
                
                // Final render with combined bloom
                composer.render();
            } catch (error) {
                // Fallback to standard rendering if something goes wrong
                console.error("Error in rendering pipeline:", error);
                renderer.render(scene, camera);
            }
        }

        console.log('Starting animation loop...');
        animate();
        console.log('Animation loop started');

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            
            // Update renderer and composers
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            
            // Update main composer
            composer.setSize(window.innerWidth, window.innerHeight);
            
            // Update bloom composer
            bloomComposer.setSize(window.innerWidth, window.innerHeight);
            
            // Update bloom pass resolution
            bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        });
        console.log('Resize event listener added');
        
        // Remove loading indicator
        if (loadingDiv) {
        document.body.removeChild(loadingDiv);
        }
        
        // Set global loading state
        window.sunSimulationLoaded = true;
        
    } catch (error) {
        console.error('Error initializing Three.js:', error);
        window.sunSimulationError = error;
        
        // Update loading indicator to show error
        if (loadingDiv) {
        loadingDiv.innerHTML = `
            <h2 style="margin-top: 0;">Error Loading Sun Simulation</h2>
            <p>${error.message}</p>
            <p>Please check the console for more details.</p>
        `;
        loadingDiv.style.background = 'rgba(255, 0, 0, 0.7)';
        }
    }
}

// Try different initialization approaches
if (document.readyState === 'loading') {
    console.log('Document still loading, waiting for DOMContentLoaded event...');
    document.addEventListener('DOMContentLoaded', initThreeJS);
} else {
    console.log('Document already loaded, initializing immediately...');
    initThreeJS();
}

// Fallback initialization after a short delay
setTimeout(() => {
    if (!window.sunSimulationLoaded && !window.sunSimulationError) {
        console.log('Fallback initialization after timeout...');
        initThreeJS();
    }
}, 1000);