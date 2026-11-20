import type { LuzHd2d } from './types';

/**
 * Orden de las luces de una sala para repartir los pocos huecos de luz puntual que hay: primero las que hacen
 * sombra y después las más fuertes. Con 7 candelabros en la sala de la Cripta, el portal (que aparece al vencer al
 * jefe y se añade el último) se quedaba sin luz.
 */
export function compararLuces(p: LuzHd2d, q: LuzHd2d): number {
  return Number(q.sombra) - Number(p.sombra) || q.intensidad - p.intensidad;
}

/**
 * Cuántas fuentes de luz de ambiente lleva una sala: ninguna si ya tiene luces propias (candelabros, braseros,
 * hoguera…), y si no, entre `min` y `max` al azar.
 */
export function cuantasDeAmbiente(
  lucesPropias: number,
  ambiente: { min: number; max: number },
  azar: () => number,
): number {
  if (lucesPropias > 0) return 0;
  return ambiente.min + Math.floor(azar() * (ambiente.max - ambiente.min + 1));
}

/**
 * Dónde poner hasta `cuantos` fuentes de luz de ambiente en una sala: casillas libres (no sólidas, sin objeto y sin
 * la parte de arriba de un objeto alto, como la copa de un árbol) que no toquen nada sólido ni el borde (el haz de
 * las Ruinas, inclinado, atravesaba el muro si caía pegado a él), a `distancia` o más (en casillas, en cualquier
 * dirección) de cada entrada y entre sí. Determinista con el mismo azar.
 */
export function lugaresDeLuz(
  sala: {
    ancho: number;
    alto: number;
    solido: readonly boolean[];
    /** `sup`, si lo tiene, ocupa además la casilla de encima (los objetos de dos casillas de alto). */
    objetos: readonly { x: number; y: number; sup?: unknown }[];
  },
  salidas: readonly { entrada: readonly [number, number] }[],
  cuantos: number,
  distancia: number,
  azar: () => number,
): [number, number][] {
  const conObjeto = new Set<number>();
  for (const o of sala.objetos) {
    conObjeto.add(o.y * sala.ancho + o.x);
    if (o.sup && o.y > 0) conObjeto.add((o.y - 1) * sala.ancho + o.x);
  }
  const lejos = (x: number, y: number, p: readonly [number, number]): boolean =>
    Math.max(Math.abs(x - p[0]), Math.abs(y - p[1])) >= distancia;
  const pegada = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= sala.ancho || ny >= sala.alto) return true;
        if (sala.solido[ny * sala.ancho + nx]) return true;
      }
    return false;
  };
  const libres: [number, number][] = [];
  for (let y = 0; y < sala.alto; y++)
    for (let x = 0; x < sala.ancho; x++) {
      const i = y * sala.ancho + x;
      if (conObjeto.has(i) || pegada(x, y)) continue;
      if (salidas.every((s) => lejos(x, y, s.entrada))) libres.push([x, y]);
    }
  const elegidas: [number, number][] = [];
  while (elegidas.length < cuantos && libres.length > 0) {
    const [x, y] = libres.splice(Math.floor(azar() * libres.length), 1)[0]!;
    if (elegidas.every((e) => lejos(x, y, e))) elegidas.push([x, y]);
  }
  return elegidas;
}
