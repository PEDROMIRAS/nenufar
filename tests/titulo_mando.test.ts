import { describe, expect, it } from 'vitest';
import controles from '../src/data/controles.json';

/** Ancho de letra de la fuente pequeña de la portada (`ANCHO_LETRA` de escenas/titulo.ts). */
const ANCHO_LETRA = 7.2;

describe('línea de la portada sobre el mando', () => {
  it('dice exactamente que se juega con teclado, dedo o mando', () => {
    expect(controles.mando.texto).toBe('Juega con teclado, dedo o mando');
  });

  it('cabe en una línea en la interfaz alta más estrecha (320 de ancho, margen 8)', () => {
    expect(controles.mando.texto.length).toBeLessThanOrEqual(
      Math.floor((320 - 2 * 8) / ANCHO_LETRA),
    );
  });
});
