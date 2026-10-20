import { describe, expect, it } from 'vitest';
import { frecuencia, leerVoz } from '../src/core/musica';
import sonido from '../src/data/sonido.json';

describe('musica', () => {
  it('traduce notas a frecuencias', () => {
    expect(frecuencia('A4')).toBeCloseTo(440);
    expect(frecuencia('A5')).toBeCloseTo(880);
    expect(frecuencia('C4')).toBeCloseTo(261.63, 1);
    expect(frecuencia('F#3')).toBeCloseTo(185, 0);
    expect(() => frecuencia('H4')).toThrow();
  });

  it('alarga con ~ y calla con -', () => {
    const { notas, pasos } = leerVoz('C4 ~ - ~ E4');
    expect(pasos).toBe(5);
    expect(notas).toEqual([
      { frecuencia: frecuencia('C4'), inicio: 0, pasos: 2 },
      { frecuencia: frecuencia('E4'), inicio: 4, pasos: 1 },
    ]);
  });

  it('las voces de cada pista se leen y tienen los mismos pasos', () => {
    for (const pista of Object.values(sonido.musica)) {
      const largos = pista.voces.map((v) => leerVoz(v.notas).pasos);
      expect(new Set(largos).size).toBe(1);
    }
  });
});
