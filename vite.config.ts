import { configDefaults, defineConfig } from 'vitest/config';

// Rutas relativas para que el build funcione en GitHub Pages (/nenufar/) sin configurar nada más.
export default defineConfig({
  base: './',
  // Three.js con el posprocesado lleva el paquete a ~690 KB (~186 KB comprimido): es lo esperado desde el HD-2D.
  build: { chunkSizeWarningLimit: 800 },
  // tools/ tiene sus propios tests (tools/video usa node:test); node_modules.nosync es el enlace de iCloud
  // de este Mac para node_modules.
  test: { exclude: [...configDefaults.exclude, 'tools/**', '**/node_modules.nosync/**'] },
});
