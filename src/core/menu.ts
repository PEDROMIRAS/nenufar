/** Lógica de los menús en lista (combate e inventario): qué fila se toca y qué hace el toque. */

export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Fila de una lista de `n` filas de `altoFila` que empieza arriba de `caja`, bajo (x, y); -1 si ninguna. */
export function filaTocada(x: number, y: number, caja: Rect, altoFila: number, n: number): number {
  if (x < caja.x || x >= caja.x + caja.ancho || y < caja.y || y >= caja.y + caja.alto) return -1;
  const fila = Math.floor((y - caja.y) / altoFila);
  return fila < n ? fila : -1;
}

/**
 * Qué hace un toque en la fila `tocada` cuando está elegida `elegida`. Con dos toques (lo que gasta
 * PM u objetos), el primero solo elige, para ver qué hace, y el segundo la usa.
 */
export function efectoToque(
  elegida: number,
  tocada: number,
  dobleToque: boolean,
): 'elegir' | 'usar' {
  return dobleToque && tocada !== elegida ? 'elegir' : 'usar';
}
