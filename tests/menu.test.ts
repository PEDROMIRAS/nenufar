import { describe, expect, test } from 'vitest';
import { efectoToque, filaTocada, type Rect } from '../src/core/menu';

const caja: Rect = { x: 8, y: 201, ancho: 210, alto: 144 };

describe('menús en lista', () => {
  test('la fila bajo el toque', () => {
    expect(filaTocada(20, 201, caja, 24, 6)).toBe(0);
    expect(filaTocada(20, 225, caja, 24, 6)).toBe(1);
    expect(filaTocada(20, 344, caja, 24, 6)).toBe(5);
  });

  test('fuera de la lista no se elige nada', () => {
    expect(filaTocada(7, 210, caja, 24, 6)).toBe(-1);
    expect(filaTocada(219, 210, caja, 24, 6)).toBe(-1);
    expect(filaTocada(20, 200, caja, 24, 6)).toBe(-1);
  });

  test('bajo la última fila no se elige nada', () => {
    expect(filaTocada(20, 300, caja, 24, 3)).toBe(-1);
  });

  test('con dos toques, el primero elige y el segundo usa', () => {
    expect(efectoToque(0, 0, true)).toBe('usar');
    expect(efectoToque(0, 2, true)).toBe('elegir');
    expect(efectoToque(0, 2, false)).toBe('usar');
  });
});
