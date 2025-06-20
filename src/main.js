import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
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
        scene.background = new THREE.Color(0x0a0a20); // Dark blue background for space
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
        renderer.toneMappingExposure = 1.5;
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

        // Add ambient light to illuminate the scene (now controlled by GUI)
        const ambientLight = new THREE.AmbientLight(0xFFFFFF); // Increased ambient light for better planet visibility
        scene.add(ambientLight);
        console.log('Ambient light added');

        // Add point light at the center to make the sun glow
        const pointLight = new THREE.PointLight(0xffffff, 10, 100);
        pointLight.position.set(0, 0, 0);
        scene.add(pointLight);
        console.log('Point light added');

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
            { name: 'Mercury', radius: 0.05, orbitalRadius: 1.5, orbitalSpeed: 0.048, color: 0xAAAAAA, rotationSpeed: 0.005, texture: 'textures/mercury.jpg' },
            { name: 'Venus', radius: 0.08, orbitalRadius: 2.0, orbitalSpeed: 0.035, color: 0xE6B800, rotationSpeed: 0.003, texture: 'textures/venus_surface.jpg' },
            { name: 'Earth', radius: 0.09, orbitalRadius: 2.8, orbitalSpeed: 0.0298, color: 0x0077BE, rotationSpeed: 0.02, texture: 'textures/earth.jpg' },
            { name: 'Mars', radius: 0.06, orbitalRadius: 3.5, orbitalSpeed: 0.024, color: 0xCC0000, rotationSpeed: 0.015, texture: 'textures/mars.jpg' },
            { name: 'Jupiter', radius: 0.4, orbitalRadius: 6.0, orbitalSpeed: 0.013, color: 0xC48F57, rotationSpeed: 0.03, texture: 'textures/jupiter.jpg' },
            { name: 'Saturn', radius: 0.35, orbitalRadius: 7.5, orbitalSpeed: 0.009, color: 0xDAA520, rotationSpeed: 0.028, texture: 'textures/saturn.jpg' },
            { name: 'Uranus', radius: 0.2, orbitalRadius: 9.0, orbitalSpeed: 0.006, color: 0xADD8E6, rotationSpeed: 0.01, texture: 'textures/uranus.jpg' },
            { name: 'Neptune', radius: 0.19, orbitalRadius: 10.5, orbitalSpeed: 0.005, color: 0x4169E1, rotationSpeed: 0.009, texture: 'textures/neptune.jpg' }
        ];

        const planets = [];

        // Create a texture loader
        const textureLoader = new THREE.TextureLoader();

        // Create and add planets to the scene
        planetsData.forEach(data => {
            const geometry = new THREE.SphereGeometry(data.radius, 32, 32);
            let material;
            if (data.texture) {
                const planetTexture = textureLoader.load(data.texture);
                material = new THREE.MeshBasicMaterial({ map: planetTexture });
            } else {
                material = new THREE.MeshStandardMaterial({
                    color: data.color,
                    emissive: new THREE.Color(data.color),
                    emissiveIntensity: 0.1
                });
            }
            const planet = new THREE.Mesh(geometry, material);
            planet.position.set(data.orbitalRadius, 0, 0); // Initial position
            scene.add(planet);
            planets.push({ object: planet, data: data });

            // Add Saturn's ring
            if (data.name === 'Saturn') {
                const ringGeometry = new THREE.RingGeometry(data.radius * 1.2, data.radius * 2.0, 64);
                const ringTexture = textureLoader.load('textures/saturn_ring_alpha.png');
                const ringMaterial = new THREE.MeshStandardMaterial({
                    map: ringTexture,
                    alphaMap: ringTexture,
                    transparent: true,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                ring.rotation.x = Math.PI / 2; // Rotate to be horizontal
                planet.add(ring); // Add ring as a child of Saturn
                console.log('Saturn\'s ring added with texture');
            }
            console.log(`${data.name} added to scene`);
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

        // Set up post-processing with bloom
        const renderScene = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            3.0, // Further increased strength for shinier stars and shooting stars
            1.0, // Further increased radius
            0.05 // Further decreased threshold to include more stars in bloom
        );
        const composer = new EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
        console.log('Post-processing with bloom set up');

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
            pointLightIntensity: pointLight.intensity,
            backgroundIntensity: [0, 0, 0], // Changed to a dark blue color

            // Quality settings (adjust segments)
            sunSegments: sunGeometry.parameters.widthSegments,
            coronaSegments: coronaGeometry.parameters.widthSegments
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
        bloomFolder.add(params, 'bloomStrength', 0.0, 3.0, 0.1).onChange(value => bloomPass.strength = value);
        bloomFolder.add(params, 'bloomRadius', 0.0, 1.0, 0.01).onChange(value => bloomPass.radius = value);
        bloomFolder.add(params, 'bloomThreshold', 0.0, 1.0, 0.01).onChange(value => bloomPass.threshold = value);

        // General settings
        const generalFolder = gui.addFolder('General Settings');
        generalFolder.add(params, 'cameraDistance', 2.0, 10.0, 0.1).onChange(value => camera.position.z = value);
        generalFolder.add(params, 'ambientLightIntensity', 0.0, 1.0, 0.01).onChange(value => {
            ambientLight.intensity = value;
        });
        generalFolder.add(params, 'pointLightIntensity', 0.0, 5.0, 0.1).onChange(value => pointLight.intensity = value);
        generalFolder.addColor(params, 'backgroundIntensity').onChange(value => scene.background.setRGB(value[0] / 255, value[1] / 255, value[2] / 255));

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

        // Open all folders by default
        sunFolder.open();
        coronaFolder.open();
        bloomFolder.open();
        generalFolder.open();
        qualityFolder.open();

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

            // Animate planets
            const currentTime = performance.now() * 0.001; // Get current time in seconds
            planets.forEach(planetObj => {
                const { object, data } = planetObj;
                // Orbit around the sun
                object.position.x = Math.cos(currentTime * data.orbitalSpeed) * data.orbitalRadius;
                object.position.z = Math.sin(currentTime * data.orbitalSpeed) * data.orbitalRadius;
                
                // Rotate on its own axis
                object.rotation.y += data.rotationSpeed;
            });

            // Render with post-processing
            composer.render();
        }

        console.log('Starting animation loop...');
        animate();
        console.log('Animation loop started');

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            composer.setSize(window.innerWidth, window.innerHeight);
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