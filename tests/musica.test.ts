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

describe('musica del Cauce Seco', () => {
  const pista = (sonido.musica as Record<string, { tempo: number; voces: { notas: string }[] }>)[
    'cauce'
  ];

  it('tiene una pista con tres voces', () => {
    expect(pista?.voces).toHaveLength(3);
  });

  it('es lenta como la Cripta y tiene las notas dentro de la escala frigia de re', () => {
    expect(pista?.tempo).toBeGreaterThanOrEqual(84);
    expect(pista?.tempo).toBeLessThanOrEqual(96);
    const fuera = pista?.voces
      .flatMap((v) => leerVoz(v.notas).notas)
      .filter(
        (n) =>
          ![2, 3, 5, 7, 9, 10, 0].includes(
            Math.round(12 * Math.log2(n.frecuencia / 440) + 9 + 120) % 12,
          ),
      );
    expect(fuera).toEqual([]);
  });
});
