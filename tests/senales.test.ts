import { describe, expect, test } from 'vitest';
import { escalaSigno, opacidadSigno, pisada } from '../src/core/senales';
import { HD2D, MAPA_VIVO } from '../src/data/datos';
import sonido from '../src/data/sonido.json';

const { alerta } = MAPA_VIVO;

describe('escalaSigno', () => {
  test('aparece algo más grande y se asienta en su tamaño', () => {
    expect(escalaSigno(0, alerta, false)).toBe(1.35);
    expect(escalaSigno(alerta.aparicion, alerta, false)).toBe(1);
    expect(escalaSigno(0.5, alerta, false)).toBe(1);
  });
  test('con menos movimiento, siempre a su tamaño', () => {
    expect(escalaSigno(0, alerta, true)).toBe(1);
  });
});

describe('opacidadSigno', () => {
  test('se ve entero y se desvanece en el último cuarto de segundo', () => {
    expect(opacidadSigno(0, alerta)).toBe(1);
    expect(opacidadSigno(alerta.duracion - 0.25, alerta)).toBe(1);
    expect(opacidadSigno(alerta.duracion - 0.125, alerta)).toBeCloseTo(0.5);
    expect(opacidadSigno(alerta.duracion, alerta)).toBe(0);
    expect(opacidadSigno(5, alerta)).toBe(0);
  });
});

describe('pisada', () => {
  const p = (a: number, b: number): boolean => pisada(a, b, 8, 4, [0, 2]);
  test('suena al entrar en los fotogramas 0 y 2, no en 1 ni 3', () => {
    expect(p(0.1, 0.13)).toBe(false);
    expect(p(0.24, 0.26)).toBe(true);
    expect(p(0.36, 0.38)).toBe(false);
    expect(p(0.49, 0.51)).toBe(true);
  });
  test('salto de varios fotogramas', () => {
    expect(p(0.1, 0.3)).toBe(true);
    expect(p(0.26, 0.49)).toBe(false);
  });
  test('al echar a andar (la animación se reinicia) suena el primer apoyo, el fotograma 0', () => {
    expect(p(0.5, 0.01)).toBe(true);
    // Si el primer fotograma no es de apoyo, no.
    expect(pisada(0.5, 0.01, 8, 4, [1, 3])).toBe(false);
  });
});

describe('datos del mapa vivo', () => {
  test('todo sonido nombrado existe y cada zona tiene paso y polvo', () => {
    const efectos = sonido.efectos as Record<string, unknown>;
    const variacion = sonido.variacion as Record<string, number>;
    expect(efectos).toHaveProperty(alerta.sonido!);
    for (const zona of Object.keys(HD2D.zonas)) {
      expect(efectos).toHaveProperty(`paso_${zona}`);
      expect(MAPA_VIVO.polvo.colores[zona]).toMatch(/^#[0-9a-f]{6}$/);
      expect(variacion[`paso_${zona}`]).toBeGreaterThanOrEqual(0.05);
      expect(variacion[`paso_${zona}`]).toBeLessThanOrEqual(0.1);
    }
  });
});
