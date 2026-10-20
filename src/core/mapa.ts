import type { Cuerpo } from './movimiento';
import type { ObjetoSala, Sala, Salida } from './sala';
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
 * Salida con puerta en alguna de cuyas casillas están los pies en (x, y), o null. La norte cruza un
 * muro de dos filas: salta ya en la de dentro, para no ver a la heroína subida a las copas.
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
    if (!(puertas & s.lado)) continue;
    for (const [sx, sy] of s.celdas) if (sx === col && sy === fila) return s;
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

/**
 * Objeto llamado `nombre` cuya casilla toca la caja de la heroína ampliada `margen` píxeles por cada
 * lado (para usar algo sólido, como la fuente, basta con pegarse a él).
 */
export function objetoAlAlcance(
  sala: Sala,
  nombre: string,
  cuerpo: Cuerpo,
  tam: number,
  margen: number,
): ObjetoSala | null {
  const izq = cuerpo.x - cuerpo.ancho / 2 - margen;
  const der = cuerpo.x + cuerpo.ancho / 2 + margen;
  const arriba = cuerpo.y - cuerpo.alto - margen;
  const abajo = cuerpo.y + margen;
  for (const o of sala.objetos) {
    if (o.inf.name !== nombre) continue;
    const x0 = o.x * tam;
    const y0 = o.y * tam;
    if (izq < x0 + tam && der > x0 && arriba < y0 + tam && abajo > y0) return o;
  }
  return null;
}

/**
 * Cierra las salidas de los `lados` (bits N/E/S/O): vuelve sólidas sus casillas que estaban libres y
 * devuelve cuáles ha tocado, para devolverlas luego con `abrirSalidas` sin abrir nada que ya fuera muro.
 */
export function cerrarSalidas(
  sala: Pick<Sala, 'ancho' | 'solido'>,
  lista: readonly Salida[],
  lados: number,
): number[] {
  const tocadas: number[] = [];
  for (const s of lista) {
    if (!(lados & s.lado)) continue;
    for (const [x, y] of s.celdas) {
      const i = y * sala.ancho + x;
      if (sala.solido[i]) continue;
      sala.solido[i] = true;
      tocadas.push(i);
    }
  }
  return tocadas;
}

export function abrirSalidas(sala: Pick<Sala, 'solido'>, tocadas: readonly number[]): void {
  for (const i of tocadas) sala.solido[i] = false;
}
