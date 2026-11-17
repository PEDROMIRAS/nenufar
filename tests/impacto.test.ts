import { describe, expect, test } from 'vitest';
import type { Evento, Luchador } from '../src/core/combate';
import {
  decaerTrauma,
  desplazamiento,
  factorTemblor,
  faseEntrada,
  franja,
  juntarPausa,
  pesoDe,
  sumarTrauma,
  type FaseEntrada,
} from '../src/core/impacto';
import type { MonstruoJson } from '../src/core/types';
import { IMPACTO } from '../src/data/datos';
import sonido from '../src/data/sonido.json';

const heroina = { nombre: 'Rana', esHeroina: true, monstruo: null } as unknown as Luchador;
const limo = {
  nombre: 'Limo',
  esHeroina: false,
  monstruo: { jefe: false } as MonstruoJson,
} as unknown as Luchador;
const jefe = {
  nombre: 'Gólem',
  esHeroina: false,
  monstruo: { jefe: true } as MonstruoJson,
} as unknown as Luchador;

function golpe(origen: Luchador, objetivo: Luchador, critico = false, cargado = false): Evento {
  return { tipo: 'danio', origen, objetivo, cantidad: 5, critico, cargado };
}

describe('pesoDe', () => {
  test('un golpe normal es leve, lo dé o lo reciba la heroína', () => {
    expect(pesoDe(golpe(limo, heroina))).toBe('leve');
    expect(pesoDe(golpe(heroina, limo))).toBe('leve');
  });
  test('el crítico y los golpes con un jefe son fuertes', () => {
    expect(pesoDe(golpe(heroina, limo, true))).toBe('fuerte');
    expect(pesoDe(golpe(heroina, jefe))).toBe('fuerte');
    expect(pesoDe(golpe(jefe, heroina))).toBe('fuerte');
  });
  test('el golpe cargado es máximo, también si además es crítico', () => {
    expect(pesoDe(golpe(limo, heroina, false, true))).toBe('maximo');
    expect(pesoDe(golpe(limo, heroina, true, true))).toBe('maximo');
  });
  test('muertes: monstruo normal fuerte, jefe y heroína máximo', () => {
    expect(pesoDe({ tipo: 'muerte', objetivo: limo })).toBe('fuerte');
    expect(pesoDe({ tipo: 'muerte', objetivo: jefe })).toBe('maximo');
    expect(pesoDe({ tipo: 'muerte', objetivo: heroina })).toBe('maximo');
  });
  test('el daño por estado, las curas y la defensa no tienen peso', () => {
    expect(
      pesoDe({ tipo: 'danioEstado', objetivo: heroina, cantidad: 3, estado: 'Veneno' } as Evento),
    ).toBeNull();
    expect(pesoDe({ tipo: 'cura', objetivo: heroina, cantidad: 3 } as Evento)).toBeNull();
    expect(pesoDe({ tipo: 'defensa', actor: heroina, pm: 0 })).toBeNull();
  });
});

describe('trauma', () => {
  test('trauma con tope en 1', () => {
    expect(sumarTrauma(0.9, IMPACTO.pesos.maximo)).toBe(1);
    expect(sumarTrauma(0, IMPACTO.pesos.leve)).toBe(0.25);
  });
  test('decae 1,6 por segundo sin bajar de 0', () => {
    expect(decaerTrauma(0.5, 1, IMPACTO)).toBe(0);
    expect(decaerTrauma(1, 0.25, IMPACTO)).toBeCloseTo(0.6);
  });
});

describe('desplazamiento', () => {
  const salida = { x: 0, y: 0 };
  const maxX = (trauma: number): number => {
    let m = 0;
    for (let i = 0; i < 100; i++)
      m = Math.max(m, Math.abs(desplazamiento(trauma, i * 0.013, 1, IMPACTO, salida).x));
    return m;
  };
  test('sin trauma no se mueve', () => {
    expect(desplazamiento(0, 0.3, 1, IMPACTO, salida)).toEqual({ x: 0, y: 0 });
  });
  test('con trauma 1 no pasa de 6 px en x ni de 4 en y', () => {
    for (let i = 0; i < 100; i++) {
      const d = desplazamiento(1, i * 0.013, 1, IMPACTO, salida);
      expect(Math.abs(d.x)).toBeLessThanOrEqual(6);
      expect(Math.abs(d.y)).toBeLessThanOrEqual(4);
    }
    expect(maxX(1)).toBeGreaterThan(2);
  });
  test('crece con el cuadrado del trauma', () => {
    expect(maxX(0.5)).toBeLessThanOrEqual(maxX(1) / 4 + 1e-9);
  });
  test('con factor 0 no se mueve', () => {
    for (let i = 0; i < 20; i++) {
      const d = desplazamiento(1, i * 0.05, 0, IMPACTO, salida);
      expect(Math.abs(d.x) + Math.abs(d.y)).toBe(0);
    }
  });
  test('escribe en el objeto que recibe', () => {
    expect(desplazamiento(0.7, 0.2, 1, IMPACTO, salida)).toBe(salida);
  });
});

describe('pausa y ajuste', () => {
  test('pausas solapadas: manda la mayor', () => {
    expect(juntarPausa(0.1, 0.04)).toBe(0.1);
    expect(juntarPausa(0.02, 0.12)).toBe(0.12);
  });
  test('factorTemblor', () => {
    expect(factorTemblor(0.5, false)).toBe(0.5);
    expect(factorTemblor(1, true)).toBe(0);
    expect(factorTemblor(1.4, false)).toBe(1);
  });
});

describe('entrada al combate', () => {
  const fase: FaseEntrada = { destello: 0, barrido: 0, terminada: false };
  test('destello al empezar que se apaga a los 0,08 s', () => {
    expect(faseEntrada(0, IMPACTO, fase)).toEqual({ destello: 0.7, barrido: 0, terminada: false });
    expect(faseEntrada(0.08, IMPACTO, fase).destello).toBe(0);
  });
  test('barrido de 0,08 a 0,5 s', () => {
    expect(faseEntrada(0.29, IMPACTO, fase).barrido).toBeCloseTo(0.5);
    const fin = faseEntrada(0.5, IMPACTO, fase);
    expect(fin.barrido).toBe(1);
    expect(fin.terminada).toBe(true);
    expect(faseEntrada(0.9, IMPACTO, fase).barrido).toBe(1);
  });
  test('escribe en el objeto que recibe', () => {
    expect(faseEntrada(0.2, IMPACTO, fase)).toBe(fase);
  });
  test('franjas escalonadas', () => {
    expect(franja(0, 7, 0)).toBe(0);
    expect(franja(0, 7, 0.5)).toBe(1);
    expect(franja(6, 7, 0.5)).toBe(0);
    expect(franja(6, 7, 1)).toBe(1);
  });
});

describe('sonidos del impacto', () => {
  test('todo sonido de un peso existe', () => {
    const nombres = Object.values(IMPACTO.pesos)
      .map((p) => p.sonido)
      .filter((s): s is string => s !== null);
    for (const n of [...nombres, 'encuentro']) expect(sonido.efectos).toHaveProperty(n);
  });
  test('toda variación nombra un efecto', () => {
    const variacion = (sonido as { variacion?: Record<string, number> }).variacion;
    expect(variacion).toBeDefined();
    for (const [n, v] of Object.entries(variacion ?? {})) {
      expect(sonido.efectos).toHaveProperty(n);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(0.1);
    }
  });
});
