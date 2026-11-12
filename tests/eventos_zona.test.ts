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

  test('el desafío es la fracción de eventos que dice probabilidadDesafio, sin mover el trazado', () => {
    const evento = (extra: Partial<AjustesZona>, s: number) =>
      generarZona(ajustes(clave, { probabilidadEvento: 1, ...extra }), s);
    const tipos = (z: ReturnType<typeof evento>) => z.salas.map((x) => [x.tipo, x.puertas]);
    let altares = 0;
    let desafios = 0;
    for (let s = 0; s < 300; s++) {
      for (const x of evento({ probabilidadDesafio: 1 }, s).salas.filter(
        (e) => e.tipo === 'evento',
      )) {
        expect(x.evento).toBe('desafio');
      }
      for (const x of evento({ probabilidadDesafio: 0 }, s).salas.filter(
        (e) => e.tipo === 'evento',
      )) {
        expect(x.evento).toBe('altar');
      }
      // Qué sala es el evento no depende de cuál sea: solo su nombre.
      expect(tipos(evento({ probabilidadDesafio: 1 }, s))).toEqual(tipos(evento({}, s)));
      for (const x of evento({ probabilidadDesafio: 0.5 }, s).salas) {
        if (x.evento === 'altar') altares++;
        if (x.evento === 'desafio') desafios++;
      }
    }
    expect(altares).toBeGreaterThan(50);
    expect(desafios).toBeGreaterThan(50);
  });

  test('el ermitaño es la fracción de los no desafíos que dice probabilidadErmitano, sin mover el trazado', () => {
    const evento = (extra: Partial<AjustesZona>, s: number) =>
      generarZona(ajustes(clave, { probabilidadEvento: 1, probabilidadDesafio: 0.5, ...extra }), s);
    const tipos = (z: ReturnType<typeof evento>) => z.salas.map((x) => [x.tipo, x.puertas]);
    let altares = 0;
    let ermitanos = 0;
    for (let s = 0; s < 300; s++) {
      for (const x of evento({ probabilidadErmitano: 1 }, s).salas) {
        expect(x.evento).not.toBe('altar');
      }
      expect(tipos(evento({ probabilidadErmitano: 1 }, s))).toEqual(tipos(evento({}, s)));
      for (const x of evento({ probabilidadErmitano: 0.5 }, s).salas) {
        if (x.evento === 'altar') altares++;
        if (x.evento === 'ermitano') ermitanos++;
      }
    }
    expect(altares).toBeGreaterThan(20);
    expect(ermitanos).toBeGreaterThan(20);
  });
});

test('la probabilidad de eventos de eventos.json es una probabilidad', () => {
  expect(EVENTOS.probabilidad).toBeGreaterThan(0);
  expect(EVENTOS.probabilidad).toBeLessThan(1);
});
