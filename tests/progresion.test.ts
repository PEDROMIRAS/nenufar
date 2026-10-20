import { describe, expect, test } from 'vitest';
import { luchadorDeHeroe } from '../src/core/combate';
import { experienciaParaSubir, ganarExperiencia } from '../src/core/progresion';
import type { ReglasProgresion } from '../src/core/types';
import { HEROES as heroes, REGLAS as reglas } from '../src/data/datos';

const r: ReglasProgresion = reglas.experiencia;
const ronin = () => luchadorDeHeroe(heroes.ronin);

describe('ganarExperiencia', () => {
  test('hacen falta 20 × n PX para pasar del nivel n al siguiente', () => {
    expect([1, 2, 9].map((n) => experienciaParaSubir(n, r))).toEqual([20, 40, 180]);
    const h = ronin();
    expect(ganarExperiencia(h, 19, r)).toEqual([]);
    expect(ganarExperiencia(h, 1, r)).toEqual([2]);
    expect([h.nivel, h.experiencia]).toEqual([2, 0]);
  });

  test('al subir suma el crecimiento de heroes.json y recupera el 30 % de PV y PM', () => {
    const h = ronin();
    h.pv = 10;
    h.pm = 0;
    ganarExperiencia(h, 20, r);
    // Ronin: +8 PV, +1 PM, +2 Ataque…; recupera round(50 × 0,3) = 15 PV y round(9 × 0,3) = 3 PM.
    expect([h.pvMax, h.pmMax, h.ataque, h.magia, h.defensa, h.velocidad]).toEqual([
      50, 9, 11, 4, 7, 7,
    ]);
    expect([h.pv, h.pm]).toEqual([25, 3]);
  });

  test('mucha experiencia de golpe sube varios niveles y guarda el sobrante', () => {
    const h = ronin();
    // 20 (1→2) + 40 (2→3) = 60; sobran 5.
    expect(ganarExperiencia(h, 65, r)).toEqual([2, 3]);
    expect(h.experiencia).toBe(5);
  });

  test('la recuperación no pasa del máximo', () => {
    const h = ronin();
    ganarExperiencia(h, 20, r);
    expect([h.pv, h.pm]).toEqual([h.pvMax, h.pmMax]);
  });

  test('en el nivel máximo no sube más ni acumula experiencia', () => {
    const h = ronin();
    ganarExperiencia(h, 100000, r);
    expect([h.nivel, h.experiencia]).toEqual([10, 0]);
    expect(ganarExperiencia(h, 500, r)).toEqual([]);
    expect(h.experiencia).toBe(0);
  });
});
