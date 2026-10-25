import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { aplicarPuertas, chocarConElipse, construirSala, crearCatalogo } from '../src/core/sala';
import { N, O } from '../src/core/zona';
import type { TileJson } from '../src/core/types';

const tile = (
  name: string,
  layer: TileJson['layer'],
  solid: boolean,
  weight?: number,
): TileJson => ({
  name,
  index: 0,
  layer,
  solid,
  weight,
});

const zona = {
  tileSize: 32,
  tiles: [
    tile('suelo_liso', 'suelo', false, 1),
    tile('muro_a', 'muro', true),
    tile('muro_b', 'muro', true),
    tile('puerta_norte_abierta', 'muro', false),
    tile('arbol_sup', 'dosel', false),
    tile('arbol_inf', 'objeto', true),
    tile('roca', 'objeto', true),
  ],
};
const autotiles = {
  tileSize: 32,
  tiles: Array.from({ length: 16 }, (_, m) => tile(`camino_${m}`, 'suelo', false)),
};
const plantillas = {
  leyenda: { '#': 'muro', '.': 'suelo', D: 'puerta_norte_abierta', T: 'arbol', r: 'roca' },
  autotiles: { ':': 'camino' },
};
const catalogo = crearCatalogo([zona, autotiles]);
const montar = (mapa: string[]) => construirSala(mapa, plantillas, catalogo, crearAzar(1));

describe('construirSala', () => {
  test('el camino conecta con sus vecinos, con la puerta y con el borde', () => {
    const sala = montar(['#D#', '#:.', '#:#']);
    // centro: N es puerta (enlaza), S es camino, E suelo y O muro no conectan → N|S = 5
    expect(sala.base[4]?.name).toBe('camino_5');
    // abajo: N camino y S fuera del mapa → 5
    expect(sala.base[7]?.name).toBe('camino_5');
  });

  test('las variantes de muro se eligen entre muro_a y muro_b', () => {
    const sala = montar(['###', '#.#', '###']);
    for (const i of [0, 1, 2, 3, 5, 6, 7, 8]) expect(sala.base[i]?.name).toMatch(/^muro_[ab]$/);
  });

  test('un objeto alto pone suelo debajo y lleva su parte superior', () => {
    const sala = montar(['...', '.T.', '...']);
    expect(sala.base[4]?.name).toBe('suelo_liso');
    expect(sala.objetos).toEqual([
      {
        x: 1,
        y: 1,
        inf: expect.objectContaining({ name: 'arbol_inf' }),
        sup: expect.objectContaining({ name: 'arbol_sup' }),
      },
    ]);
  });

  test('la colisión sale del fondo y de los objetos', () => {
    const sala = montar(['#D#', '.r.']);
    expect(sala.solido).toEqual([true, false, true, false, true, false]);
  });

  test('la misma semilla da la misma sala', () => {
    const mapa = ['###', '#.#', '###'];
    const nombres = (s: ReturnType<typeof montar>) => s.base.map((t) => t.name);
    expect(nombres(montar(mapa))).toEqual(nombres(montar(mapa)));
  });

  test('un símbolo sin leyenda falla con un mensaje claro', () => {
    expect(() => montar(['.?.'])).toThrow("Símbolo desconocido '?' en (1, 0)");
  });
});

describe('aplicarPuertas', () => {
  const abierta = ['###:###', 'NNNDNNN', '#.....#', ':.....:', '#.....#', '###:###'];

  test('tapia los lados sin puerta y deja los demás', () => {
    expect(aplicarPuertas(abierta, N | O)).toEqual([
      '###:###',
      'NNNDNNN',
      '#.....#',
      ':.....#',
      '#.....#',
      '#######',
    ]);
  });

  test('sin puertas la puerta norte pasa a ser muro norte', () => {
    expect(aplicarPuertas(abierta, 0).slice(0, 2)).toEqual(['#######', 'NNNNNNN']);
  });
});

describe('chocarConElipse', () => {
  test('rehace las casillas de su recuadro según lo que toca la elipse', () => {
    const sala = { ancho: 5, alto: 3, solido: Array(15).fill(true), cajas: Array(15).fill(null) };
    // Elipse centrada en (2,5; 1,5), más ancha que alta: llega de x = 1,3 a 3,7.
    chocarConElipse(sala, 32, 2.5, 1.5, 1.2, 0.6);
    expect(sala.solido[7]).toBe(true);
    expect(sala.cajas[7]).toBeNull(); // la casilla del centro queda entera dentro
    expect(sala.solido[5]).toBe(true); // fuera de su recuadro no toca nada
    expect(sala.solido[6]).toBe(true);
    const [x0, , x1] = sala.cajas[6] ?? [];
    expect(x0).toBeGreaterThan(0); // la de la izquierda solo choca por su lado derecho
    expect(x1).toBe(32);
  });
});
