import type { Sala, Salida } from './sala';

/** Caja anclada en los pies, como `Cuerpo`: (x, y) es el centro de su borde inferior. */
export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** ¿Se solapan dos cajas? Tocarse solo en el borde no cuenta. */
export function seTocan(a: Caja, b: Caja): boolean {
  return Math.abs(a.x - b.x) * 2 < a.ancho + b.ancho && a.y - a.alto < b.y && b.y - b.alto < a.y;
}

/**
 * Elige `cuantos` casillas distintas para monstruos: libres, sin objetos y a `distanciaMinima`
 * casillas o más (en cualquier dirección) de cada entrada de la sala.
 */
export function colocarMonstruos(
  sala: Sala,
  lista: readonly Salida[],
  cuantos: number,
  distanciaMinima: number,
  azar: () => number,
): [number, number][] {
  const conObjeto = new Set(sala.objetos.map((o) => o.y * sala.ancho + o.x));
  const candidatas: [number, number][] = [];
  for (let f = 0; f < sala.alto; f++) {
    for (let c = 0; c < sala.ancho; c++) {
      const i = f * sala.ancho + c;
      if (sala.solido[i] || conObjeto.has(i)) continue;
      const lejos = lista.every(
        ({ entrada: [ex, ey] }) => Math.max(Math.abs(c - ex), Math.abs(f - ey)) >= distanciaMinima,
      );
      if (lejos) candidatas.push([c, f]);
    }
  }
  // Fisher-Yates parcial: las primeras `cuantos` quedan barajadas.
  for (let i = 0; i < Math.min(cuantos, candidatas.length); i++) {
    const j = i + Math.floor(azar() * (candidatas.length - i));
    [candidatas[i], candidatas[j]] = [candidatas[j]!, candidatas[i]!];
  }
  return candidatas.slice(0, cuantos);
}
