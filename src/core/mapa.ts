import type { Sala, Salida } from './sala';
import { E, N, O, S, type SalaZona, type Zona } from './zona';

const OPUESTO: Record<number, number> = { [N]: S, [E]: O, [S]: N, [O]: E };
const DESPLAZAMIENTO: Record<number, [number, number]> = {
  [N]: [0, -1],
  [E]: [1, 0],
  [S]: [0, 1],
  [O]: [-1, 0],
};

export function opuesto(lado: number): number {
  return OPUESTO[lado] ?? 0;
}

/**
 * Salida con puerta cuya casilla del borde contiene los pies en (x, y), o null.
 * `lista` es `salidas(ancho, alto)` calculada una vez, para no crear arrays en cada paso.
 */
export function salidaPisada(
  lista: readonly Salida[],
  puertas: number,
  tam: number,
  x: number,
  y: number,
): Salida | null {
  const col = Math.floor(x / tam);
  const fila = Math.ceil(y / tam) - 1; // fila de la casilla sobre la que están los pies
  for (const s of lista) {
    const [sx, sy] = s.celdas[0]!;
    if (puertas & s.lado && sx === col && sy === fila) return s;
  }
  return null;
}

export function salaVecina(zona: Zona, sala: SalaZona, lado: number): SalaZona | undefined {
  const [dx, dy] = DESPLAZAMIENTO[lado] ?? [0, 0];
  return zona.salas.find((s) => s.x === sala.x + dx && s.y === sala.y + dy);
}

/** Pies de quien entra por `salida`: centrado en su casilla de entrada. */
export function posicionEntrada(
  salida: Salida,
  tam: number,
  altoCaja: number,
): { x: number; y: number } {
  const [cx, cy] = salida.entrada;
  return { x: cx * tam + tam / 2, y: cy * tam + (tam + altoCaja) / 2 };
}

/** ¿Están los pies en (x, y) sobre la casilla de un portal de la sala? */
export function portalPisado(sala: Sala, tam: number, x: number, y: number): boolean {
  const col = Math.floor(x / tam);
  const fila = Math.ceil(y / tam) - 1;
  for (const o of sala.objetos) {
    if (o.inf.name === 'portal' && o.x === col && o.y === fila) return true;
  }
  return false;
}
