import { defineConfig } from 'vite';

// Relative base so the build works when served from a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  // three.js alone is ~550 kB minified; splitting it buys nothing yet.
  build: { chunkSizeWarningLimit: 800 },
});
