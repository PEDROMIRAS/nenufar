import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { colocarMonstruos, cuantosGrupos, seTocan } from '../src/core/monstruos';
import { salidas, type Sala, type Tile } from '../src/core/sala';
import { MONSTRUOS } from '../src/data/datos';
import historia from '../src/data/historia.json';
import zonas from '../src/data/zonas.json';

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

  test('pidiendo más grupos que casillas libres devuelve las que hay, sin fallar', () => {
    const elegidas = colocarMonstruos(sala, lista, 500, 3, crearAzar(1));
    expect(elegidas.length).toBeGreaterThan(0);
    expect(elegidas.length).toBeLessThan(500);
    expect(new Set(elegidas.map(String)).size).toBe(elegidas.length);
  });
});

describe('cuantosGrupos', () => {
  const ajustes = { min: 2, max: 4 };

  test('sin extra da lo de siempre: entre min y max, con una sola tirada', () => {
    for (let s = 0; s < 200; s++) {
      const azar = crearAzar(s);
      const n = cuantosGrupos(ajustes, 0, azar);
      expect(n).toBe(2 + Math.floor(crearAzar(s)() * 3));
      // Una sola tirada: la siguiente es la segunda del azar de la semilla.
      const igual = crearAzar(s);
      igual();
      expect(azar()).toBe(igual());
    }
  });

  test('con extra suma esos grupos al resultado de siempre', () => {
    for (let s = 0; s < 200; s++) {
      expect(cuantosGrupos(ajustes, 1, crearAzar(s))).toBe(
        cuantosGrupos(ajustes, 0, crearAzar(s)) + 1,
      );
    }
  });
});

describe('jefes violetas y cofres trampa', () => {
  const nombre = (sprite: string) => sprite.split('/').pop()!;
  const jefesVioletas = [
    ...Object.values(zonas.zonas).map((z) => z.jefeVioleta),
    ...Object.values(zonas.violetas.dragon),
  ];
  const cofres = Object.values(zonas.zonas).map((z) => z.cofreTrampa);

  test('cada jefe violeta existe, es jefe y está oculto', () => {
    for (const clave of jefesVioletas) {
      expect(MONSTRUOS[clave], clave).toBeDefined();
      expect([MONSTRUOS[clave]!.jefe, MONSTRUOS[clave]!.oculto], clave).toEqual([true, true]);
    }
  });

  test('cada cofre trampa existe, no es jefe, está oculto y no se mueve', () => {
    for (const clave of cofres) {
      const m = MONSTRUOS[clave]!;
      expect([m.jefe, m.oculto, m.mapa], clave).toEqual([false, true, undefined]);
    }
  });

  test('los dragones comparten nombre y sprite', () => {
    const dragones = Object.values(zonas.violetas.dragon).map((k) => MONSTRUOS[k]!);
    expect(new Set(dragones.map((d) => `${d.nombre}|${d.sprite}`)).size).toBe(1);
  });

  test('cada jefe violeta tiene su frase al aparecer y al caer (los dragones, la misma)', () => {
    for (const clave of jefesVioletas) {
      const frases = (historia.violetas as Record<string, { inicio: string; caida: string }>)[
        nombre(MONSTRUOS[clave]!.sprite)
      ];
      expect(frases?.inicio, clave).toBeTruthy();
      expect(frases?.caida, clave).toBeTruthy();
    }
  });
});
