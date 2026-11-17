import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { defineConfig } from 'vite';
import { SALIDA } from './rutas.ts';

// Build solo para grabar: con los atajos de desarrollo activos (hay que compilar con NODE_ENV=development,
// así import.meta.env.DEV es true), servida con `vite preview`, que carga de golpe y no vigila archivos
// (en modo desarrollo el juego tardaba ~20 s en cargar y se recargaba si algo tocaba un archivo).
export default defineConfig({
  root: fileURLToPath(new URL('../..', import.meta.url)),
  base: './',
  build: { outDir: join(SALIDA, 'juego'), emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  preview: { port: 5173, strictPort: true },
});
