import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Dónde va todo lo que se genera (build, tomas, voces, vídeo). Fuera del repositorio: ~/Documents está en
 * iCloud y subiría miles de fotogramas. Se cambia con la variable de entorno SALIDA_VIDEO.
 */
export const SALIDA = process.env.SALIDA_VIDEO ?? join(homedir(), 'tools', 'nenufar-video');
