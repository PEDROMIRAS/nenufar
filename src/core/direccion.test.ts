import { describe, expect, test } from 'vitest';
import type { Acciones } from './acciones';
import { fijarDireccion } from './direccion';

function mover(x: number, y: number, zonaMuerta = 0): [number, number] {
  const a: Acciones = { moverX: 0, moverY: 0, confirmar: false, cancelar: false, menu: false };
  fijarDireccion(a, x, y, zonaMuerta);
  return [a.moverX, a.moverY];
}

describe('fijarDireccion', () => {
  test('los ejes dan vectores exactos', () => {
    expect(mover(1, 0)).toEqual([1, 0]);
    expect(mover(-1, 0)).toEqual([-1, 0]);
    expect(mover(0, 1)).toEqual([0, 1]);
    expect(mover(0, -1)).toEqual([0, -1]);
  });

  test('una diagonal de teclado no va más rápida que un eje', () => {
    expect(mover(1, 1)).toEqual([Math.SQRT1_2, Math.SQRT1_2]);
    expect(Math.hypot(...mover(-1, -1))).toBeCloseTo(1);
  });

  test('un joystick casi horizontal se ajusta al eje', () => {
    expect(mover(0.9, 0.2)).toEqual([1, 0]);
    expect(mover(-0.9, -0.2)).toEqual([-1, 0]);
  });

  test('dentro de la zona muerta no se mueve', () => {
    expect(mover(0.1, 0.1, 0.25)).toEqual([0, 0]);
    expect(mover(0, 0)).toEqual([0, 0]);
  });
});
