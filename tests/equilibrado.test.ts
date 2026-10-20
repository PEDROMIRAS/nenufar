import { expect, test } from 'vitest';
import { DIFICULTADES, HEROES } from '../src/data/datos';
import { pct, simular, type Cuenta } from './simulador';

// Equilibrado (decisión de Pedro): porcentaje de partidas jugadas con cabeza que llegan al final en
// cada dificultad, y ninguna heroína a más de 5 puntos de la otra. Si falla, se ajustan los JSON,
// nunca las fórmulas.
const OBJETIVO: Record<keyof typeof DIFICULTADES, [number, number]> = {
  facil: [85, 90],
  normal: [70, 75],
  dificil: [50, 55],
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
      console.log(
        `${clave} · ${nombre}: partidas completas ${r.completas}%\n  combate real: ${linea(r.reales)}\n  jefes:        ${linea(r.jefes)}`,
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
