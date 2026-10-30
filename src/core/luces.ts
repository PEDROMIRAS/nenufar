import type { LuzHd2d } from './types';

/**
 * Orden de las luces de una sala para repartir los pocos huecos de luz puntual que hay: primero las que hacen
 * sombra y después las más fuertes. Con 7 candelabros en la sala de la Cripta, el portal (que aparece al vencer al
 * jefe y se añade el último) se quedaba sin luz.
 */
export function compararLuces(p: LuzHd2d, q: LuzHd2d): number {
  return Number(q.sombra) - Number(p.sombra) || q.intensidad - p.intensidad;
}
