import { describe, expect, test } from 'vitest';
import { normalesDeSprite } from '../src/core/relieve';

// Imagen de 7×7 con un cuadrado opaco de 5×5 en medio (de (1,1) a (5,5)).
function cuadrado(): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(7 * 7 * 4);
  for (let y = 1; y <= 5; y++)
    for (let x = 1; x <= 5; x++) {
      const i = (y * 7 + x) * 4;
      rgba.set([100, 100, 100, 255], i);
    }
  return rgba;
}
const o = { radio: 3, detalle: 0, fuerza: 2 };
const en = (n: Uint8ClampedArray, x: number, y: number): number[] => [
  ...n.subarray((y * 7 + x) * 4, (y * 7 + x) * 4 + 4),
];

describe('normalesDeSprite', () => {
  test('el centro mira de frente', () => {
    const [x, y, z] = en(normalesDeSprite(cuadrado(), 7, 7, o), 3, 3);
    expect(Math.abs(x! - 128)).toBeLessThanOrEqual(1);
    expect(Math.abs(y! - 128)).toBeLessThanOrEqual(1);
    expect(z).toBeGreaterThan(250);
  });

  test('el borde izquierdo mira a la izquierda y el de arriba, hacia arriba', () => {
    const n = normalesDeSprite(cuadrado(), 7, 7, o);
    expect(en(n, 1, 3)[0]).toBeLessThan(128);
    expect(en(n, 3, 1)[1]).toBeGreaterThan(128);
  });

  test('lo transparente sigue transparente', () => {
    expect(en(normalesDeSprite(cuadrado(), 7, 7, o), 0, 0)[3]).toBe(0);
  });

  test('sin fuerza, todo de frente', () => {
    const n = normalesDeSprite(cuadrado(), 7, 7, { ...o, fuerza: 0 });
    for (let y = 1; y <= 5; y++)
      for (let x = 1; x <= 5; x++) expect(en(n, x, y).slice(0, 3)).toEqual([128, 128, 255]);
  });
});
