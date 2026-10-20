import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { colocarMonstruos, seTocan } from '../src/core/monstruos';
import { salidas, type Sala, type Tile } from '../src/core/sala';

describe('seTocan', () => {
  const a = { x: 100, y: 100, ancho: 14, alto: 8 };
  test('cajas que se solapan se tocan', () => {
    expect(seTocan(a, { x: 110, y: 104, ancho: 20, alto: 12 })).toBe(true);
  });
  test('cajas separadas o solo en contacto por el borde no se tocan', () => {
    expect(seTocan(a, { x: 130, y: 100, ancho: 20, alto: 12 })).toBe(false); // 7 + 10 = 17 < 30
    expect(seTocan(a, { x: 117, y: 100, ancho: 20, alto: 12 })).toBe(false); // justo el borde
    expect(seTocan(a, { x: 100, y: 112, ancho: 20, alto: 12 })).toBe(false); // justo debajo
  });
});

describe('colocarMonstruos', () => {
  // Sala de 15×11 sin muros salvo una columna sólida, con un objeto no sólido en (5, 5).
  const tile = { name: 't', index: 0, layer: 'suelo', solid: false, hoja: 0 } as Tile;
  const sala: Sala = {
    ancho: 15,
    alto: 11,
    base: [],
    solido: Array.from({ length: 165 }, (_, i) => i % 15 === 10),
    cajas: [],
    objetos: [{ x: 5, y: 5, inf: tile, sup: null }],
  };
  const lista = salidas(15, 11);

  test('nunca en una casilla sólida, con objeto o cerca de una entrada', () => {
    for (let s = 0; s < 200; s++) {
      for (const [c, f] of colocarMonstruos(sala, lista, 3, 3, crearAzar(s))) {
        expect(sala.solido[f * 15 + c]).toBe(false);
        expect([c, f]).not.toEqual([5, 5]);
        for (const { entrada } of lista) {
          expect(
            Math.max(Math.abs(c - entrada[0]), Math.abs(f - entrada[1])),
          ).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  test('las casillas elegidas son distintas y salen siempre igual con la misma semilla', () => {
    const elegidas = colocarMonstruos(sala, lista, 3, 3, crearAzar(7));
    expect(new Set(elegidas.map(String)).size).toBe(3);
    expect(colocarMonstruos(sala, lista, 3, 3, crearAzar(7))).toEqual(elegidas);
  });
});
