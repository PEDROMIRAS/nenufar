import type { SpriteJson } from './types';

/** Píxeles de la hoja que ocupa un píxel del juego (1 si la hoja no lo dice). */
export function escalaHoja(datos: SpriteJson): number {
  return datos.scale ?? 1;
}
