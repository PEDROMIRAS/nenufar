import { describe, expect, it } from 'vitest';
import { dispositivo, fijarDispositivo, usarDispositivo } from '../src/input/dispositivo';

describe('último dispositivo', () => {
  it('empieza en teclado y cambia con el uso', () => {
    expect(dispositivo()).toBe('teclado');
    usarDispositivo('mando');
    expect(dispositivo()).toBe('mando');
    usarDispositivo('tactil');
    expect(dispositivo()).toBe('tactil');
  });

  it('fijado, el uso no lo cambia', () => {
    fijarDispositivo('mando');
    usarDispositivo('teclado');
    expect(dispositivo()).toBe('mando');
  });
});
