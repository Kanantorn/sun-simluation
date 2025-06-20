const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { exec } = require('child_process');

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const execPromise = promisify(exec);

// Helper function to download file
function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    
    https.get(url, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${destination}`);
        resolve();
      });
      
      file.on('error', err => {
        fs.unlink(destination, () => {}); // Delete the file if there was an error
        reject(err);
      });
    }).on('error', err => {
      fs.unlink(destination, () => {}); // Delete the file if there was an error
      reject(err);
    });
  });
}

async function ensureDirectoryExists(dir) {
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
}

async function downloadWithCurl(url, destination) {
  try {
    await execPromise(`curl -s -o "${destination}" "${url}"`);
    console.log(`Downloaded: ${destination}`);
    return true;
  } catch (error) {
    console.error(`Failed to download ${url} to ${destination}`);
    return false;
  }
}

async function downloadAssets() {
  // Skybox texture URLs - High-quality Milky Way with golden/brown tones
  const skyboxUrls = [
    {
      url: 'https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013334/gll_3d_moneyshot.4096x2048.jpg',
      dest: 'milkyway_panorama.jpg'
    },
    {
      url: 'https://cdn.spacetelescope.org/archives/images/large/heic0206d.jpg',
      dest: 'milkyway_core.jpg'
    }
  ];
  
  // Planet texture URLs
  const planetUrls = {
    'mercury.jpg': 'https://www.solarsystemscope.com/textures/download/2k_mercury.jpg',
    'venus_surface.jpg': 'https://www.solarsystemscope.com/textures/download/2k_venus_surface.jpg',
    'earth.jpg': 'https://www.solarsystemscope.com/textures/download/2k_earth_daymap.jpg',
    'earth_normal.jpg': 'https://www.solarsystemscope.com/textures/download/2k_earth_normal_map.jpg',
    'earth_specular.jpg': 'https://www.solarsystemscope.com/textures/download/2k_earth_specular_map.jpg',
    'mars.jpg': 'https://www.solarsystemscope.com/textures/download/2k_mars.jpg',
    'jupiter.jpg': 'https://www.solarsystemscope.com/textures/download/2k_jupiter.jpg',
    'saturn.jpg': 'https://www.solarsystemscope.com/textures/download/2k_saturn.jpg',
    'saturn_ring_alpha.png': 'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png',
    'uranus.jpg': 'https://www.solarsystemscope.com/textures/download/2k_uranus.jpg',
    'neptune.jpg': 'https://www.solarsystemscope.com/textures/download/2k_neptune.jpg',
    // Additional textures for PBR
    'moon.jpg': 'https://www.solarsystemscope.com/textures/download/2k_moon.jpg',
    'saturn_ring_color.jpg': 'https://www.solarsystemscope.com/textures/download/2k_saturn_ring_trans.png'
  };
  
  // Ensure directories exist
  await ensureDirectoryExists('./textures/skybox');
  await ensureDirectoryExists('./textures');
  
  // Download skybox textures with curl (more reliable for large images)
  console.log("Downloading Milky Way panorama images...");
  for (const item of skyboxUrls) {
    await downloadWithCurl(item.url, `./textures/skybox/${item.dest}`);
  }
  
  // Create cubemap generator script that will convert the panorama to a cubemap
  // This script creates a simple HTML file that uses Three.js to convert a panorama to cubemap faces
  const cubemapGeneratorHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Panorama to Cubemap Converter</title>
  <style>
    body { margin: 0; overflow: hidden; }
    canvas { width: 100%; height: 100%; display: block; }
    #controls { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; }
    button { margin: 5px; }
  </style>
</head>
<body>
  <div id="controls">
    <h3>Panorama to Cubemap Converter</h3>
    <button id="downloadCubeMap">Download Cubemap Images</button>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
  <script>
    // Set up the scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 0);
    
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // The cubemap sizes we'll generate
    const cubeSize = 1024;
    
    // Load the panorama
    const loader = new THREE.TextureLoader();
    loader.load('./textures/skybox/milkyway_panorama.jpg', function(texture) {
      // Create a sphere with the panorama as material
      const geometry = new THREE.SphereGeometry(50, 64, 64);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
      });
      const sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);
      
      // Render
      renderer.render(scene, camera);
      
      // Setup cubemap rendering
      document.getElementById('downloadCubeMap').addEventListener('click', function() {
        generateCubemap();
      });
    });
    
    function generateCubemap() {
      // Create a cube render target
      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(cubeSize);
      const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
      cubeCamera.update(renderer, scene);
      
      // Get the cubemap textures
      const faceNames = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
      const directions = [
        new THREE.Vector3(1, 0, 0),   // right
        new THREE.Vector3(-1, 0, 0),  // left
        new THREE.Vector3(0, 1, 0),   // top
        new THREE.Vector3(0, -1, 0),  // bottom
        new THREE.Vector3(0, 0, 1),   // front
        new THREE.Vector3(0, 0, -1)   // back
      ];
      
      // For each face of the cubemap
      for (let i = 0; i < 6; i++) {
        // Set up a camera looking in this direction
        camera.position.set(0, 0, 0);
        camera.lookAt(directions[i]);
        camera.updateMatrixWorld();
        
        // Render to a canvas
        renderer.render(scene, camera);
        
        // Get the image data
        const imgData = renderer.domElement.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.href = imgData;
        link.download = \`\${faceNames[i]}.png\`;
        link.click();
      }
      
      alert('Cubemap images generated. Download all 6 PNG files, place them in textures/skybox folder, then refresh the simulation.');
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    });
  </script>
</body>
</html>
  `;
  
  // Write the cubemap generator HTML file
  fs.writeFileSync('./cubemap_generator.html', cubemapGeneratorHtml);
  console.log("Created cubemap generator tool: cubemap_generator.html");
  
  // Download planet textures
  console.log("Downloading planet textures...");
  const planetPromises = Object.entries(planetUrls).map(([filename, url]) => {
    const destination = path.join('./textures', filename);
    return downloadFile(url, destination);
  });
  
  // Wait for all planet downloads to complete
  try {
    await Promise.all(planetPromises);
    console.log("All planet textures downloaded successfully!");
    console.log("\n===== INSTRUCTIONS =====");
    console.log("1. Open cubemap_generator.html in your browser");
    console.log("2. Click the 'Download Cubemap Images' button");
    console.log("3. Save all 6 PNG files to your textures/skybox folder");
    console.log("4. Refresh your sun simulation to see the new skybox");
  } catch (error) {
    console.error("Error downloading assets:", error);
  }
}

// Run the download
downloadAssets(); 