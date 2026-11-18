/**
 * Opacidad de un cartel que lleva `t` segundos a la vista: sube en `fundido` segundos, se queda y baja en
 * otros `fundido` antes de `segundos`. Fuera de ese tiempo, 0. Con menos movimiento, sin fundido.
 */
export function opacidadCartel(
  t: number,
  d: { segundos: number; fundido: number },
  reducido: boolean,
): number {
  if (!(t >= 0 && t < d.segundos)) return 0;
  if (reducido || d.fundido <= 0) return 1;
  return Math.min(1, t / d.fundido, (d.segundos - t) / d.fundido);
}
