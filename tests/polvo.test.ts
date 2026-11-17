import { describe, expect, test } from 'vitest';
import { crearAnillo, progresoNube, soltarNube, vaciarAnillo } from '../src/core/polvo';

describe('anillo de nubes de polvo', () => {
  test('una nube vive su vida y después se apaga', () => {
    const a = crearAnillo(3);
    const i = soltarNube(a, 10);
    expect(progresoNube(a, i, 10.2, 0.4)).toBeCloseTo(0.5);
    expect(progresoNube(a, i, 10.5, 0.4)).toBe(-1);
  });
  test('reutiliza la más vieja', () => {
    const a = crearAnillo(2);
    expect([soltarNube(a, 1), soltarNube(a, 2), soltarNube(a, 3)]).toEqual([0, 1, 0]);
  });
  test('vaciado, ninguna nube vuelve a salir aunque el reloj nuevo pase por su momento', () => {
    const a = crearAnillo(3);
    const i = soltarNube(a, 300);
    vaciarAnillo(a);
    expect(progresoNube(a, i, 300.1, 0.45)).toBe(-1);
  });
});
