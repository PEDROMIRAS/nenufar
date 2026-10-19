import { describe, expect, test } from 'vitest';
import { alpha, avanzar, crearReloj, PASO } from './reloj';

describe('reloj de paso fijo', () => {
  test('un fotograma de 60 Hz da un paso', () => {
    expect(avanzar(crearReloj(), PASO)).toBe(1);
  });

  test('un fotograma de 144 Hz acumula hasta completar un paso', () => {
    const reloj = crearReloj();
    expect(avanzar(reloj, 1 / 144)).toBe(0);
    expect(alpha(reloj)).toBeCloseTo(60 / 144);
    expect(avanzar(reloj, 1 / 144)).toBe(0);
    expect(avanzar(reloj, 1 / 144)).toBe(1);
  });

  test('un fotograma lento de 30 Hz da dos pasos', () => {
    expect(avanzar(crearReloj(), 1 / 30)).toBe(2);
  });

  test('un parón largo se recorta a 0,25 s', () => {
    expect(avanzar(crearReloj(), 10)).toBe(15);
  });

  test('un delta negativo no hace retroceder el reloj', () => {
    const reloj = crearReloj();
    expect(avanzar(reloj, -1)).toBe(0);
    expect(alpha(reloj)).toBe(0);
  });
});
