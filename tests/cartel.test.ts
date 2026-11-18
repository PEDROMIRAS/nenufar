import { describe, expect, it } from 'vitest';
import { opacidadCartel } from '../src/core/cartel';
import controles from '../src/data/controles.json';

const d = controles.mando.aviso;

describe('opacidadCartel', () => {
  it('antes y después no se ve', () => {
    expect(opacidadCartel(-0.1, d, false)).toBe(0);
    expect(opacidadCartel(2.5, d, false)).toBe(0);
    expect(opacidadCartel(Infinity, d, false)).toBe(0);
  });

  it('aparece y se va con fundido', () => {
    expect(opacidadCartel(0, d, false)).toBe(0);
    expect(opacidadCartel(0.15, d, false)).toBeCloseTo(0.5);
    expect(opacidadCartel(1, d, false)).toBe(1);
    expect(opacidadCartel(2.35, d, false)).toBeCloseTo(0.5);
  });

  it('con menos movimiento no funde', () => {
    expect(opacidadCartel(0, d, true)).toBe(1);
    expect(opacidadCartel(2.4, d, true)).toBe(1);
  });
});
