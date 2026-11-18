/** Cámara del combate: durante un ataque, la escena se acerca un poco a quien ataca y a quien recibe. */
export interface CamaraCombateJson {
  /** Cuánto se acerca como mucho (0,1 = un 10 % más grande). */
  zoom: number;
  /** Segundos en llegar, que sigue cerca tras el golpe y en volver. */
  entrada: number;
  mantener: number;
  salida: number;
}

const suave = (x: number): number => x * x * (3 - 2 * x);

/**
 * Escala de la escena a los `t` segundos de empezar un ataque cuyo golpe llega a los `golpe` segundos: sube con
 * suavidad, se queda hasta un rato después del golpe y vuelve a 1. Antes de empezar o con datos sin zoom, 1.
 */
export function zoomAtaque(t: number, golpe: number, d: CamaraCombateJson): number {
  if (!(t >= 0) || d.zoom <= 0) return 1;
  const fin = Math.max(golpe, d.entrada) + d.mantener;
  let f: number;
  if (t < d.entrada) f = suave(t / d.entrada);
  else if (t < fin) f = 1;
  else if (t < fin + d.salida) f = 1 - suave((t - fin) / d.salida);
  else f = 0;
  return 1 + d.zoom * f;
}
