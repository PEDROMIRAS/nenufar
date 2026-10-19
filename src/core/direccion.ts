import type { Acciones } from './acciones';

const D = Math.SQRT1_2;
// Las 8 direcciones como vectores unitarios exactos, empezando en la derecha y girando hacia abajo (y crece hacia abajo).
const OCHO_X = [1, D, 0, -D, -1, -D, 0, D];
const OCHO_Y = [0, D, 1, D, 0, -D, -1, -D];

/**
 * Convierte un vector de entrada en una de las 8 direcciones (longitud 1) y la escribe en MOVER.
 * Si el vector es más corto que `zonaMuerta`, no toca `acciones`.
 */
export function fijarDireccion(acciones: Acciones, x: number, y: number, zonaMuerta: number): void {
  const largo = Math.hypot(x, y);
  if (largo === 0 || largo < zonaMuerta) return;
  const sector = (Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8;
  acciones.moverX = OCHO_X[sector] ?? 0;
  acciones.moverY = OCHO_Y[sector] ?? 0;
}
