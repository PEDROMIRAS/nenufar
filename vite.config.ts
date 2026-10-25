import { defineConfig } from 'vite';

// Rutas relativas para que el build funcione en GitHub Pages (/nenufar/) sin configurar nada más.
export default defineConfig({
  base: './',
  // Three.js con el posprocesado lleva el paquete a ~690 KB (~186 KB comprimido): es lo esperado desde el HD-2D.
  build: { chunkSizeWarningLimit: 800 },
});
