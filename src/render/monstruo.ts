import type { Direccion } from '../core/types';

/** Dirección del sprite más cercana a un vector. */
export function direccionDe(dx: number, dy: number): Direccion {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy < 0 ? 'up' : 'down';
}
