import { describe, expect, it } from 'vitest';
import { letrasEnAncho } from '../src/core/disposicion';
import controles from '../src/data/controles.json';

describe('línea de la portada sobre el mando', () => {
  it('dice exactamente que se juega con teclado, dedo o mando', () => {
    expect(controles.mando.texto).toBe('Juega con teclado, dedo o mando');
  });

  it('cabe en una línea en la interfaz alta más estrecha (320 de ancho, margen 8)', () => {
    expect(controles.mando.texto.length).toBeLessThanOrEqual(letrasEnAncho(320 - 2 * 8));
  });
});
