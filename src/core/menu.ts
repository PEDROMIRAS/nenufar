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

/**
 * Si al entrar en Ajustes se enfoca su primer control HTML. Con mando no: el mando no mueve deslizadores
 * ni marca casillas, y el foco lo dejaría atrapado sin cursor en la lista.
 */
export function enfocarAjustes(conMando: boolean, yaEnfocado: boolean): boolean {
  return !conMando && !yaEnfocado;
}

/**
 * Foco de la portada tras una flecha (`dx`, `dy` en -1, 0, 1, solo una distinta de 0). Focos: 0 controles, 1 empezar,
 * 2 extras, 3 reto. En horizontal, controles y extras van arriba a los lados, el reto sobre el aviso: ← → recorren
 * controles, empezar y extras; ↑ lleva de empezar al reto y del reto a extras; ↓ vuelve a empezar. En vertical, de
 * arriba abajo: el reto, controles y extras lado a lado y empezar (el aviso).
 */
export function focoPortada(foco: number, dx: number, dy: number, alta: boolean): number {
  if (!alta) {
    if (dx !== 0) return foco === 3 ? (dx < 0 ? 0 : 2) : Math.min(2, Math.max(0, foco + dx));
    if (dy > 0) return 1;
    if (dy < 0) return foco === 1 ? 3 : foco === 3 ? 2 : foco;
    return foco;
  }
  // Controles y extras están lado a lado; desde empezar, ← y → van a uno u otro.
  if (dx !== 0) return foco === 3 ? 3 : dx < 0 ? 0 : 2;
  if (dy < 0) return foco === 1 ? 0 : 3;
  if (dy > 0) return foco === 3 ? 0 : 1;
  return foco;
}
