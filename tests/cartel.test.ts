import { describe, expect, it } from 'vitest';
import { avisoNuevo, crearEstadoCartel, opacidadCartel, reiniciarCartel } from '../src/core/cartel';
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

describe('avisoNuevo', () => {
  it('una conexión ocurrida mientras cargaba la portada también se avisa', () => {
    const estado = crearEstadoCartel();
    // El evento llegó durante la carga: la cuenta ya es 1 en el primer paso.
    expect(avisoNuevo(estado, 1)).toBe(true);
    expect(avisoNuevo(estado, 1)).toBe(false);
    expect(avisoNuevo(estado, 2)).toBe(true);
  });

  it('sin conexiones no avisa', () => {
    expect(avisoNuevo(crearEstadoCartel(), 0)).toBe(false);
  });
});

describe('reiniciarCartel', () => {
  it('si no se ve, empieza de cero (con su fundido de entrada)', () => {
    expect(reiniciarCartel(Infinity, d)).toBe(0);
    expect(reiniciarCartel(d.segundos, d)).toBe(0);
  });

  it('si ya se ve, no vuelve a fundir: sigue entero y vuelve a durar lo de siempre', () => {
    const t = reiniciarCartel(1.5, d);
    expect(opacidadCartel(t, d, false)).toBe(1);
    expect(d.segundos - t).toBeCloseTo(d.segundos - d.fundido);
    // A media entrada sigue subiendo desde donde iba, sin bajar a 0.
    expect(reiniciarCartel(0.1, d)).toBe(0.1);
  });
});

it('reiniciarCartel durante el fundido de salida sigue desde la misma opacidad, subiendo', () => {
  const t = d.segundos - d.fundido / 2; // a media salida: opacidad 0,5
  const nuevo = reiniciarCartel(t, d);
  expect(opacidadCartel(nuevo, d, false)).toBeCloseTo(opacidadCartel(t, d, false));
  expect(opacidadCartel(nuevo + 0.01, d, false)).toBeGreaterThan(opacidadCartel(nuevo, d, false));
});
