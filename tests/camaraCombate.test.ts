import { expect, test } from 'vitest';
import { zoomAtaque } from '../src/core/camaraCombate';

const d = { zoom: 0.1, entrada: 0.2, mantener: 0.3, salida: 0.4 };

test('se acerca, se queda tras el golpe y vuelve a 1', () => {
  expect(zoomAtaque(0, 0.5, d)).toBe(1);
  expect(zoomAtaque(0.1, 0.5, d)).toBeCloseTo(1.05);
  expect(zoomAtaque(0.5, 0.5, d)).toBeCloseTo(1.1);
  expect(zoomAtaque(0.79, 0.5, d)).toBeCloseTo(1.1);
  expect(zoomAtaque(1.0, 0.5, d)).toBeCloseTo(1.05);
  expect(zoomAtaque(1.3, 0.5, d)).toBe(1);
});

test('sin zoom o con tiempos raros, 1', () => {
  expect(zoomAtaque(0.3, 0.5, { ...d, zoom: 0 })).toBe(1);
  expect(zoomAtaque(-1, 0.5, d)).toBe(1);
  expect(zoomAtaque(Number.NaN, 0.5, d)).toBe(1);
});

test('en un golpe fuerte se acerca más (zoom × fuerte); sin él, igual que antes', () => {
  const f = { ...d, fuerte: 1.6 };
  expect(zoomAtaque(0.5, 0.5, f, true)).toBeCloseTo(1 + 0.1 * 1.6);
  expect(zoomAtaque(0.5, 0.5, f, false)).toBeCloseTo(1.1);
  // Sin el campo, el fuerte no cambia nada.
  expect(zoomAtaque(0.5, 0.5, d, true)).toBeCloseTo(1.1);
});
