import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path when served in development or production.
  base: '/', 
  server: {
    // Open the browser automatically when the dev server starts
    open: true,
    host: true, // Listen on all interfaces
    port: 5173
  },
  build: {
    // Output directory for production build
    outDir: 'dist', 
    // Make sure assets are correctly referenced in the build
    assetsDir: 'assets' 
  }
}); 