import { describe, expect, it } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { compararLuces, lugaresDeLuz } from '../src/core/luces';
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

  it('en una sala toda sólida, ninguna', () => {
    expect(lugaresDeLuz(sala(true), salidas, 2, 3, crearAzar(1))).toEqual([]);
  });

  it('con el mismo azar, las mismas', () => {
    expect(lugaresDeLuz(sala(), salidas, 2, 3, crearAzar(7))).toEqual(
      lugaresDeLuz(sala(), salidas, 2, 3, crearAzar(7)),
    );
  });
});
