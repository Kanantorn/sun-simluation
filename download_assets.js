const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

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

async function downloadAssets() {
  // Skybox texture URLs (Space/Milky Way skybox)
  const skyboxUrls = {
    'px.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_px.jpg',
    'nx.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nx.jpg',
    'py.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_py.jpg',
    'ny.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_ny.jpg',
    'pz.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_pz.jpg',
    'nz.png': 'https://threejs.org/examples/textures/cube/MilkyWay/dark-s_nz.jpg'
  };
  
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
  
  // Download skybox textures
  console.log("Downloading skybox textures...");
  const skyboxPromises = Object.entries(skyboxUrls).map(([filename, url]) => {
    const destination = path.join('./textures/skybox', filename);
    return downloadFile(url, destination);
  });
  
  // Download planet textures
  console.log("Downloading planet textures...");
  const planetPromises = Object.entries(planetUrls).map(([filename, url]) => {
    const destination = path.join('./textures', filename);
    return downloadFile(url, destination);
  });
  
  // Wait for all downloads to complete
  try {
    await Promise.all([...skyboxPromises, ...planetPromises]);
    console.log("All assets downloaded successfully!");
  } catch (error) {
    console.error("Error downloading assets:", error);
  }
}

// Run the download
downloadAssets(); 