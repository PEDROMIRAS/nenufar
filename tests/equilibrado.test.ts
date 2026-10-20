import { expect, test } from 'vitest';
import { HEROES } from '../src/data/datos';
import { pct, simular, type Cuenta } from './simulador';

// Equilibrado del documento: entre el 85 % y el 95 % de las partidas jugadas con cabeza llegan al
// final, y ninguna heroína saca más de 5 puntos a la otra. Si falla, se ajustan los JSON, nunca las fórmulas.

test('las partidas completas están entre el 85 y el 95 % y las heroínas, a menos de 5 puntos', () => {
  const completas: number[] = [];
  for (const nombre of Object.keys(HEROES)) {
    const r = simular(nombre);
    const linea = (t: Record<string, Cuenta>): string =>
      Object.entries(t)
        .map(([k, c]) => `${k} ${pct(c)}%`)
        .join(' · ');
    console.log(
      `${nombre}: partidas completas ${r.completas}%
  combate suelto: ${linea(r.sueltos)}
  combate real:   ${linea(r.reales)}
  jefes:          ${linea(r.jefes)}`,
    );
    completas.push(r.completas);
  }
  for (const c of completas) {
    expect(c).toBeGreaterThanOrEqual(85);
    expect(c).toBeLessThanOrEqual(95);
  }
  expect(Math.max(...completas) - Math.min(...completas)).toBeLessThanOrEqual(5);
}, 120_000);
