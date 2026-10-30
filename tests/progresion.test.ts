import { describe, expect, test } from 'vitest';
import { luchadorDeHeroe } from '../src/core/combate';
import {
  cambiosDeNivel,
  experienciaParaSubir,
  ganarExperiencia,
  instantanea,
  mejorar,
} from '../src/core/progresion';
import type { ReglasProgresion } from '../src/core/types';
import { HEROES as heroes, REGLAS as reglas } from '../src/data/datos';

const r: ReglasProgresion = reglas.experiencia;
const ronin = () => luchadorDeHeroe(heroes.ronin);
const PV = heroes.ronin.estadisticas.pv;

describe('ganarExperiencia', () => {
  test('hacen falta 20 × n PX para pasar del nivel n al siguiente', () => {
    expect([1, 2, 9].map((n) => experienciaParaSubir(n, r))).toEqual([20, 40, 180]);
    const h = ronin();
    expect(ganarExperiencia(h, 19, r)).toEqual([]);
    expect(ganarExperiencia(h, 1, r)).toEqual([2]);
    expect([h.nivel, h.experiencia]).toEqual([2, 0]);
  });

  test('al subir suma el crecimiento de heroes.json, da puntos y recupera el 30 % de PV y PM', () => {
    const h = ronin();
    const e = heroes.ronin.estadisticas;
    const c = heroes.ronin.porNivel;
    h.pv = 10;
    h.pm = 0;
    ganarExperiencia(h, 20, r);
    expect([h.pvMax, h.pmMax, h.ataque, h.magia, h.defensa, h.velocidad]).toEqual([
      e.pv + c.pv,
      e.pm + c.pm,
      e.ataque + c.ataque,
      e.magia + c.magia,
      e.defensa + c.defensa,
      e.velocidad + c.velocidad,
    ]);
    expect(h.puntos).toBe(r.puntosPorNivel);
    expect([h.pv, h.pm]).toEqual([
      10 + Math.round(h.pvMax * r.restaurarAlSubir),
      Math.round(h.pmMax * r.restaurarAlSubir),
    ]);
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

  test('el nivel máximo es 12', () => {
    expect(r.nivelMaximo).toBe(12);
  });

  test('en el nivel máximo no sube más ni acumula experiencia', () => {
    const h = ronin();
    ganarExperiencia(h, 100000, r);
    expect([h.nivel, h.experiencia]).toEqual([12, 0]);
    expect(ganarExperiencia(h, 500, r)).toEqual([]);
    expect([h.nivel, h.experiencia]).toEqual([12, 0]);
  });
});

test('cambiosDeNivel lista las estadísticas que suben y las habilidades nuevas', () => {
  const h = ronin();
  const antes = instantanea(h);
  h.ataque += 4;
  h.nivel = 3;
  expect(cambiosDeNivel(antes, h)).toEqual([
    `Ataque ${antes.ataque} → ${antes.ataque + 4}`,
    'Nueva habilidad: Postura de hierro',
  ]);
});

describe('mejorar', () => {
  test('gasta un punto y suma lo de combate.json; los PV suben también los actuales', () => {
    const h = ronin();
    h.puntos = 2;
    h.pv = 5;
    expect(mejorar(h, 'pv', r)).toBe(true);
    expect([h.pvMax, h.pv, h.puntos]).toEqual([PV + r.mejoras.pv, 5 + r.mejoras.pv, 1]);
    expect(mejorar(h, 'critico', r)).toBe(true);
    expect(h.critico).toBe(r.mejoras.critico);
  });

  test('sin puntos no hace nada', () => {
    const h = ronin();
    const antes = instantanea(h);
    expect(mejorar(h, 'ataque', r)).toBe(false);
    expect(instantanea(h)).toEqual(antes);
  });
});
