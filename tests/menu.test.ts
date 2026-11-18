import { describe, expect, it, test } from 'vitest';
import { efectoToque, enfocarAjustes, filaTocada, focoPortada, type Rect } from '../src/core/menu';

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

describe('enfocarAjustes', () => {
  it('con mando no enfoca ningún control HTML (el mando no puede usarlos)', () => {
    expect(enfocarAjustes(true, false)).toBe(false);
  });
  it('con teclado o dedo enfoca el primero si no hay ya uno enfocado', () => {
    expect(enfocarAjustes(false, false)).toBe(true);
    expect(enfocarAjustes(false, true)).toBe(false);
  });
});

describe('focoPortada', () => {
  // 0 controles, 1 empezar, 2 extras, 3 reto.
  test('en horizontal: ← → por controles, empezar y extras; ↑ empezar → reto → extras; ↓ a empezar', () => {
    expect(focoPortada(1, -1, 0, false)).toBe(0);
    expect(focoPortada(1, 1, 0, false)).toBe(2);
    expect(focoPortada(1, 0, -1, false)).toBe(3);
    expect(focoPortada(3, 0, -1, false)).toBe(2);
    expect(focoPortada(3, -1, 0, false)).toBe(0);
    expect(focoPortada(2, 0, 1, false)).toBe(1);
  });

  test('en vertical sigue el orden de la pantalla: reto arriba, controles y extras, empezar abajo', () => {
    expect(focoPortada(1, 0, -1, true)).toBe(0);
    expect(focoPortada(0, 0, -1, true)).toBe(3);
    expect(focoPortada(2, 0, -1, true)).toBe(3);
    expect(focoPortada(3, 0, 1, true)).toBe(0);
    expect(focoPortada(0, 0, 1, true)).toBe(1);
    expect(focoPortada(0, 1, 0, true)).toBe(2);
    expect(focoPortada(2, -1, 0, true)).toBe(0);
    expect(focoPortada(3, 1, 0, true)).toBe(3);
    expect(focoPortada(1, 1, 0, true)).toBe(2);
  });
});
