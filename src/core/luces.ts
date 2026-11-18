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
 * Dónde poner hasta `cuantos` fuentes de luz de ambiente en una sala: casillas libres (no sólidas y sin objeto) a
 * `distancia` o más (en casillas, en cualquier dirección) de cada entrada y entre sí. Determinista con el mismo azar.
 */
export function lugaresDeLuz(
  sala: {
    ancho: number;
    alto: number;
    solido: readonly boolean[];
    objetos: readonly { x: number; y: number }[];
  },
  salidas: readonly { entrada: readonly [number, number] }[],
  cuantos: number,
  distancia: number,
  azar: () => number,
): [number, number][] {
  const conObjeto = new Set(sala.objetos.map((o) => o.y * sala.ancho + o.x));
  const lejos = (x: number, y: number, p: readonly [number, number]): boolean =>
    Math.max(Math.abs(x - p[0]), Math.abs(y - p[1])) >= distancia;
  const libres: [number, number][] = [];
  for (let y = 0; y < sala.alto; y++)
    for (let x = 0; x < sala.ancho; x++) {
      const i = y * sala.ancho + x;
      if (sala.solido[i] || conObjeto.has(i)) continue;
      if (salidas.every((s) => lejos(x, y, s.entrada))) libres.push([x, y]);
    }
  const elegidas: [number, number][] = [];
  while (elegidas.length < cuantos && libres.length > 0) {
    const [x, y] = libres.splice(Math.floor(azar() * libres.length), 1)[0]!;
    if (elegidas.every((e) => lejos(x, y, e))) elegidas.push([x, y]);
  }
  return elegidas;
}
