import { defineConfig } from 'vite';

// Rutas relativas para que el build funcione en GitHub Pages (/nenufar/) sin configurar nada más.
export default defineConfig({
  base: './',
});
