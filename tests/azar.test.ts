import { expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';

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
