import { describe, expect, test } from 'vitest';
import { generarZona, type AjustesZona, type SalaZona } from '../src/core/zona';
import { EVENTOS } from '../src/data/datos';
import datos from '../src/data/zonas.json';

type ClaveZona = keyof typeof datos.zonas;
const CLAVES = Object.keys(datos.zonas) as ClaveZona[];
const ajustes = (zona: ClaveZona, extra: Partial<AjustesZona> = {}): AjustesZona => ({
  ...datos.generacion,
  salas: datos.zonas[zona].salas,
  violeta: 'quiza',
  probabilidadVioleta: datos.violetas.probabilidad,
  probabilidadTrampa: datos.violetas.probabilidadTrampa,
  ...extra,
});
const unaPuerta = (s: SalaZona) => s.puertas !== 0 && (s.puertas & (s.puertas - 1)) === 0;

describe.each(CLAVES)('zona %s', (clave) => {
  // Que el trazado de siempre no cambia lo guardan las huellas de tests/violetas_zona.test.ts.
  test('con probabilidad 0 o sin el campo no hay eventos', () => {
    for (let s = 0; s < 300; s++) {
      for (const extra of [{}, { probabilidadEvento: 0 }]) {
        expect(generarZona(ajustes(clave, extra), s).salas.some((x) => x.tipo === 'evento')).toBe(
          false,
        );
      }
    }
  });

  test('con probabilidad 1 casi siempre hay un evento en un callejón libre, sin quitar la violeta ni la trampa', () => {
    let con = 0;
    for (let s = 0; s < 300; s++) {
      const base = generarZona(ajustes(clave), s);
      const zona = generarZona(ajustes(clave, { probabilidadEvento: 1 }), s);
      const eventos = zona.salas.filter((x) => x.tipo === 'evento');
      expect(eventos.length).toBeLessThanOrEqual(1);
      con += eventos.length;
      for (const e of eventos) expect([e.evento, unaPuerta(e)]).toEqual(['altar', true]);
      const cuenta = (z: typeof zona, f: (x: SalaZona) => boolean) => z.salas.filter(f).length;
      expect(cuenta(zona, (x) => x.tipo === 'violeta')).toBe(
        cuenta(base, (x) => x.tipo === 'violeta'),
      );
      expect(cuenta(zona, (x) => !!x.trampa)).toBe(cuenta(base, (x) => !!x.trampa));
    }
    expect(con).toBeGreaterThan(250);
  });
});

test('la probabilidad de eventos de eventos.json es una probabilidad', () => {
  expect(EVENTOS.probabilidad).toBeGreaterThan(0);
  expect(EVENTOS.probabilidad).toBeLessThan(1);
});
