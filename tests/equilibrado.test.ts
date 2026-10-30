import { expect, test } from 'vitest';
import { DIFICULTADES, HEROES } from '../src/data/datos';
import { media, pct, simular, type Cuenta } from './simulador';

// Equilibrado (decisión de Pedro, rangos del 2026-10-30: otros 10 puntos por debajo de los del 26 de
// octubre, para que sea un reto): porcentaje de partidas jugadas con cabeza que llegan al final en cada
// dificultad, y ninguna heroína a más de 5 puntos de la otra. Si falla, se ajustan los JSON, nunca las fórmulas.
const OBJETIVO: Record<keyof typeof DIFICULTADES, [number, number]> = {
  facil: [65, 75],
  normal: [45, 55],
  dificil: [25, 35],
};

test.each(Object.entries(OBJETIVO))(
  '%s: partidas completas en su rango y las heroínas a menos de 5 puntos',
  (clave, [min, max]) => {
    const dificultad = DIFICULTADES[clave as keyof typeof DIFICULTADES];
    const completas: number[] = [];
    for (const nombre of Object.keys(HEROES)) {
      const r = simular(nombre, 300, dificultad);
      const linea = (t: Record<string, Cuenta>): string =>
        Object.entries(t)
          .map(([k, c]) => `${k} ${pct(c)}%`)
          .join(' · ');
      const vida = Object.entries(r.recibido)
        .map(([k, m]) => `${k} ${media(m)}%`)
        .join(' · ');
      console.log(
        `${clave} · ${nombre}: partidas completas ${r.completas}%\n  combate real: ${linea(r.reales)}\n  jefes:        ${linea(r.jefes)}\n  vida que quita un combate: ${vida}`,
      );
      completas.push(r.completas);
    }
    for (const c of completas) {
      expect(c).toBeGreaterThanOrEqual(min);
      expect(c).toBeLessThanOrEqual(max);
    }
    expect(Math.max(...completas) - Math.min(...completas)).toBeLessThanOrEqual(5);
  },
  120_000,
);
