import { describe, expect, test } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { fijarDireccion } from '../src/core/direccion';

function mover(x: number, y: number, zonaMuerta = 0): [number, number] {
  const a = crearAcciones();
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

describe('fijarDireccion con diagonales más estrechas', () => {
  const dir = (grados: number, ancho: number): [number, number] => {
    const a = crearAcciones();
    const r = (grados * Math.PI) / 180;
    fijarDireccion(a, Math.cos(r), Math.sin(r), 0, ancho);
    return [Math.round(a.moverX * 100) / 100, Math.round(a.moverY * 100) / 100];
  };
  const d = Math.round(Math.SQRT1_2 * 100) / 100;

  test('con 45 grados, las 8 direcciones a partes iguales (como siempre)', () => {
    expect(dir(25, 45)).toEqual([d, d]);
    expect(dir(20, 45)).toEqual([1, 0]);
  });

  test('con 30 grados, un stick algo torcido sigue siendo recto', () => {
    expect(dir(25, 30)).toEqual([1, 0]);
    expect(dir(115, 30)).toEqual([0, 1]);
    expect(dir(40, 30)).toEqual([d, d]);
    expect(dir(-80, 30)).toEqual([0, -1]);
  });

  test('las diagonales exactas del teclado siguen siendo diagonales', () => {
    const a = crearAcciones();
    fijarDireccion(a, -1, 1, 0, 30);
    expect([a.moverX, a.moverY]).toEqual([-Math.SQRT1_2, Math.SQRT1_2]);
  });
});
