import type { Acciones } from './acciones';

const D = Math.SQRT1_2;
// Las 8 direcciones como vectores unitarios exactos, empezando en la derecha y girando hacia abajo (y crece hacia abajo).
const OCHO_X = [1, D, 0, -D, -1, -D, 0, D];
const OCHO_Y = [0, D, 1, D, 0, -D, -1, -D];

/**
 * Convierte un vector de entrada en una de las 8 direcciones (longitud 1) y la escribe en MOVER.
 * Si el vector es más corto que `zonaMuerta`, no toca `acciones`. `anchoDiagonal` son los grados que ocupa cada
 * diagonal (45: las 8 direcciones a partes iguales; menos: las rectas se cogen más fácil, para que un stick un poco
 * torcido en un menú no mueva también en horizontal).
 */
export function fijarDireccion(
  acciones: Acciones,
  x: number,
  y: number,
  zonaMuerta: number,
  anchoDiagonal = 45,
): void {
  const largo = Math.hypot(x, y);
  if (largo === 0 || largo < zonaMuerta) return;
  const grados = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const enDiagonal = Math.abs((grados % 90) - 45) <= anchoDiagonal / 2;
  const sector = enDiagonal
    ? (Math.floor(grados / 90) * 2 + 1) % 8
    : (Math.round(grados / 90) * 2) % 8;
  acciones.moverX = OCHO_X[sector] ?? 0;
  acciones.moverY = OCHO_Y[sector] ?? 0;
}
