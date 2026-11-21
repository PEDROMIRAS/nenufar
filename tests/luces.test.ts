import { describe, expect, it } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { compararLuces, cuantasDeAmbiente, lugaresDeLuz } from '../src/core/luces';
import { HD2D } from '../src/data/datos';

describe('orden de las luces de una sala', () => {
  const luz = (nombre: string) => ({ nombre, luz: HD2D.luces[nombre]! });
  const ordenar = (nombres: string[]) =>
    nombres
      .map(luz)
      .sort((p, q) => compararLuces(p.luz, q.luz))
      .map((l) => l.nombre);

  it('el portal, que se añade el último, queda por delante de los candelabros', () => {
    const sala = [...Array<string>(7).fill('candelabro'), 'portal'];
    const dentro = ordenar(sala).slice(0, 4);
    expect(dentro).toContain('portal');
  });

  it('las que hacen sombra van primero', () => {
    expect(ordenar(['portal', 'hoguera'])[0]).toBe('hoguera');
  });

  it('la luz de un altar, un desafío o un mercader entra aunque haya muchos braseros o candelabros', () => {
    for (const evento of ['altar', 'desafio', 'mercader']) {
      expect(ordenar([...Array<string>(6).fill('brasero'), evento]).slice(0, 4)).toContain(evento);
      expect(ordenar([...Array<string>(7).fill('candelabro'), evento]).slice(0, 4)).toContain(
        evento,
      );
    }
  });

  it('con la misma fuerza se respeta el orden en que se añadieron', () => {
    expect(ordenar(['candelabro', 'candelabro'])).toEqual(['candelabro', 'candelabro']);
  });
});

describe('lugaresDeLuz', () => {
  const sala = (solida = false) => ({
    ancho: 21,
    alto: 13,
    solido: new Array<boolean>(21 * 13).fill(solida),
    objetos: [{ x: 4, y: 4 }],
  });
  const salidas = [{ entrada: [10, 1] as const }];
  const lejos = (a: readonly [number, number], b: readonly [number, number], d: number): boolean =>
    Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) >= d;

  it('da casillas libres, lejos de las entradas y entre sí', () => {
    const lugares = lugaresDeLuz(sala(), salidas, 2, 3, crearAzar(1));
    expect(lugares).toHaveLength(2);
    const [a, b] = lugares as [[number, number], [number, number]];
    expect(lejos(a, [10, 1], 3) && lejos(b, [10, 1], 3)).toBe(true);
    expect(lejos(a, b, 3)).toBe(true);
    for (const l of lugares) expect(l).not.toEqual([4, 4]);
  });

  it('no pone ninguna bajo la copa de un objeto alto (la casilla de encima de su base)', () => {
    // Un árbol en cada columna, con la copa en la fila 5: esa fila no puede tener luz.
    const conArboles = {
      ...sala(),
      objetos: Array.from({ length: 21 }, (_, x) => ({ x, y: 6, sup: {} })),
    };
    for (let semilla = 1; semilla <= 30; semilla++)
      for (const [, y] of lugaresDeLuz(conArboles, salidas, 3, 2, crearAzar(semilla)))
        expect(y === 5 || y === 6).toBe(false);
  });

  it('ninguna pegada a algo sólido ni al borde de la sala', () => {
    // Muro en la columna 8: ni la 7, ni la 8, ni la 9 pueden tener luz; tampoco la primera y la última fila o columna.
    const conMuro = sala();
    for (let y = 0; y < 13; y++) conMuro.solido[y * 21 + 8] = true;
    for (let semilla = 1; semilla <= 30; semilla++)
      for (const [x, y] of lugaresDeLuz(conMuro, salidas, 3, 2, crearAzar(semilla))) {
        expect(x >= 7 && x <= 9).toBe(false);
        expect(x === 0 || y === 0 || x === 20 || y === 12).toBe(false);
      }
  });

  it('ninguna sobre un autotile (camino, agua, lava)', () => {
    // Un camino en cruz: la fila 6 y la columna 10.
    const conCamino = {
      ...sala(),
      base: Array.from({ length: 21 * 13 }, (_, i) => ({
        name: i % 21 === 10 || Math.floor(i / 21) === 6 ? 'lecho_5' : 'suelo',
      })),
    };
    for (let semilla = 1; semilla <= 30; semilla++)
      for (const [x, y] of lugaresDeLuz(conCamino, salidas, 3, 2, crearAzar(semilla))) {
        expect(x === 10 || y === 6).toBe(false);
      }
  });

  it('en una sala toda sólida, ninguna', () => {
    expect(lugaresDeLuz(sala(true), salidas, 2, 3, crearAzar(1))).toEqual([]);
  });

  it('con el mismo azar, las mismas', () => {
    expect(lugaresDeLuz(sala(), salidas, 2, 3, crearAzar(7))).toEqual(
      lugaresDeLuz(sala(), salidas, 2, 3, crearAzar(7)),
    );
  });
});

describe('cuantasDeAmbiente', () => {
  const amb = { min: 1, max: 2 };

  it('una sala con luces propias no lleva ninguna de ambiente', () => {
    for (let semilla = 1; semilla <= 20; semilla++)
      expect(cuantasDeAmbiente(3, amb, crearAzar(semilla))).toBe(0);
  });

  it('con conLuces, también las lleva una sala con luces propias', () => {
    for (let semilla = 1; semilla <= 20; semilla++) {
      const n = cuantasDeAmbiente(3, { ...amb, conLuces: true }, crearAzar(semilla));
      expect(n >= amb.min && n <= amb.max).toBe(true);
    }
  });

  it('la Cripta y el Cauce ponen su luz de ambiente también en salas con candelabros o braseros', () => {
    expect(HD2D.zonas.cripta?.ambiente?.conLuces).toBe(true);
    expect(HD2D.zonas.cauce?.ambiente?.conLuces).toBe(true);
  });

  it('sin luces propias, entre min y max, y salen las dos cifras', () => {
    const vistas = new Set<number>();
    for (let semilla = 1; semilla <= 50; semilla++) {
      const n = cuantasDeAmbiente(0, amb, crearAzar(semilla));
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(2);
      vistas.add(n);
    }
    expect([...vistas].sort()).toEqual([1, 2]);
  });
});
