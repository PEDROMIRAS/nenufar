import { expect, test } from 'vitest';
import { crearAzar, elegirConPeso } from '../src/core/azar';

test('la misma semilla repite la secuencia y otra semilla la cambia', () => {
  const a = crearAzar(42);
  const b = crearAzar(42);
  const serie = [a(), a(), a()];
  expect([b(), b(), b()]).toEqual(serie);
  expect(crearAzar(43)()).not.toBe(serie[0]);
});

test('los valores quedan en [0, 1)', () => {
  const azar = crearAzar(7);
  for (let i = 0; i < 1000; i++) {
    const v = azar();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  }
});

test('elegirConPeso reparte según los pesos y no elige nada en una lista vacía', () => {
  const lista = [
    { nombre: 'a', peso: 1 },
    { nombre: 'b', peso: 3 },
  ];
  expect(elegirConPeso(lista, () => 0.2)?.nombre).toBe('a'); // 0,2 × 4 = 0,8 < 1
  expect(elegirConPeso(lista, () => 0.3)?.nombre).toBe('b'); // 1,2 ≥ 1
  expect(elegirConPeso([], () => 0.5)).toBeUndefined();
  const azar = crearAzar(3);
  let b = 0;
  for (let i = 0; i < 4000; i++) if (elegirConPeso(lista, azar)?.nombre === 'b') b++;
  expect(b / 4000).toBeCloseTo(0.75, 1);
});
