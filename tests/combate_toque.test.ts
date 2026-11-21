import { expect, test } from 'vitest';
import { filaDeToque } from '../src/core/menu';

const zona = { x: 92, y: 200, ancho: 168, alto: 80 };

test('el toque elige la fila de la lista, contando las desplazadas', () => {
  expect(filaDeToque(100, 205, zona, 16, 0, 5, 7)).toBe(0);
  expect(filaDeToque(100, 205, zona, 16, 2, 5, 7)).toBe(2);
  expect(filaDeToque(100, 279, zona, 16, 0, 5, 7)).toBe(4);
});

test('fuera de la lista no elige nada', () => {
  expect(filaDeToque(300, 205, zona, 16, 0, 5, 7)).toBe(-1);
  expect(filaDeToque(100, 199, zona, 16, 0, 5, 7)).toBe(-1);
});

test('una fila sin opción (lista más corta que el sitio) no elige nada', () => {
  expect(filaDeToque(100, 260, zona, 16, 0, 5, 3)).toBe(-1);
});
