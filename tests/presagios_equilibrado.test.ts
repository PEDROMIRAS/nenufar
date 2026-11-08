import { describe, expect, test } from 'vitest';
import { DIFICULTADES, HEROES } from '../src/data/datos';
import { simular, type Cuenta } from './simulador';

const jugados = (t: Record<string, Cuenta>): number =>
  Object.values(t).reduce((suma, c) => suma + c.jugados, 0);

describe('el simulador con presagios', () => {
  test.each(Object.keys(HEROES))(
    '%s: con probabilidad 0 sale exactamente lo mismo que sin presagios',
    (nombre) => {
      const sin = simular(nombre, 100, DIFICULTADES.normal);
      const con = simular(nombre, 100, DIFICULTADES.normal, undefined, { probabilidad: 0 });
      expect(con).toEqual(sin);
    },
  );

  test('forzar la manada hace más combates por partida', () => {
    const sin = simular('ronin', 100, DIFICULTADES.normal);
    const con = simular('ronin', 100, DIFICULTADES.normal, undefined, { forzado: 'manada' });
    expect(jugados(con.reales)).toBeGreaterThan(jugados(sin.reales));
  });
});
