import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import type { AjustesVioletas } from '../src/core/types';
import { jefeVioleta, modoVioleta } from '../src/core/violetas';
import { generarZona, type AjustesZona, type SalaZona } from '../src/core/zona';
import datos from '../src/data/zonas.json';

type ClaveZona = keyof typeof datos.zonas;
const CLAVES = Object.keys(datos.zonas) as ClaveZona[];
const VIOLETAS: AjustesVioletas = datos.violetas;

const ajustes = (zona: ClaveZona, extra: Partial<AjustesZona> = {}): AjustesZona => ({
  ...datos.generacion,
  salas: datos.zonas[zona].salas,
  ...extra,
});
const unaPuerta = (s: SalaZona) => s.puertas !== 0 && (s.puertas & (s.puertas - 1)) === 0;

/** Huella FNV-1a de los trazados de 1.000 semillas, calculada con el generador antes de las salas violetas. */
function huella(a: AjustesZona): number {
  let h = 2166136261;
  for (let s = 0; s < 1000; s++) {
    const zona = generarZona(a, s);
    const t =
      zona.semilla +
      ';' +
      zona.salas.map((x) => `${x.x},${x.y},${x.tipo},${x.puertas},${x.distancia}`).join('|');
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}
const HUELLAS: Record<ClaveZona, number> = {
  bosque: 960764497,
  ruinas: 335081783,
  cripta: 3337945880,
};

describe.each(CLAVES)('zona %s', (clave) => {
  test('sin violetas ni trampas, las 1.000 semillas dan el mismo trazado que antes', () => {
    expect(huella(ajustes(clave, { violeta: 'no', probabilidadTrampa: 0 }))).toBe(HUELLAS[clave]);
  });

  test('con sala violeta segura, siempre hay exactamente una y es un callejón', () => {
    for (let s = 0; s < 1000; s++) {
      const violetas = generarZona(ajustes(clave, { violeta: 'seguro' }), s).salas.filter(
        (x) => x.tipo === 'violeta',
      );
      expect(violetas).toHaveLength(1);
      expect(unaPuerta(violetas[0]!)).toBe(true);
    }
  });

  test('nunca más de una violeta ni más de un tesoro trampa, y la trampa es un tesoro de más', () => {
    const a = ajustes(clave, {
      violeta: 'quiza',
      probabilidadVioleta: VIOLETAS.probabilidad,
      probabilidadTrampa: VIOLETAS.probabilidadTrampa,
    });
    let trampas = 0;
    for (let s = 0; s < 1000; s++) {
      const salas = generarZona(a, s).salas;
      const trampa = salas.filter((x) => x.trampa);
      expect(salas.filter((x) => x.tipo === 'violeta').length).toBeLessThanOrEqual(1);
      expect(trampa.length).toBeLessThanOrEqual(1);
      for (const t of trampa) expect([t.tipo, unaPuerta(t)]).toEqual(['tesoro', true]);
      expect(salas.filter((x) => x.tipo === 'tesoro' && !x.trampa)).toHaveLength(a.tesoros);
      trampas += trampa.length;
    }
    expect(trampas).toBeGreaterThan(0);
  });
});

test('en el Bosque nunca se rompe la generación y, si hay violeta, no hay trampa', () => {
  const a = ajustes('bosque', {
    violeta: 'quiza',
    probabilidadVioleta: VIOLETAS.probabilidad,
    probabilidadTrampa: 0.99,
  });
  for (let s = 0; s < 1000; s++) {
    const salas = generarZona(a, s).salas;
    if (salas.some((x) => x.tipo === 'violeta')) expect(salas.some((x) => x.trampa)).toBe(false);
  }
});

test('la sala violeta es segura solo en la última zona y si no salió ninguna antes', () => {
  expect(modoVioleta(2, 3, 0)).toBe('seguro');
  expect(modoVioleta(1, 3, 0)).toBe('quiza');
  expect(modoVioleta(2, 3, 1)).toBe('quiza');
});

test('jefeVioleta: el dragón sale a veces y nunca si ya se usó', () => {
  let dragones = 0;
  for (let i = 0; i < 200; i++) {
    const azar = () => (i % 10) / 10;
    expect(jefeVioleta('ruinas', datos.zonas.ruinas, VIOLETAS, true, azar)).toBe(
      'caballero_maldito',
    );
    if (jefeVioleta('ruinas', datos.zonas.ruinas, VIOLETAS, false, azar) === 'dragon_negro_ruinas')
      dragones++;
  }
  expect(dragones).toBeGreaterThan(0);
  expect(dragones).toBeLessThan(200);
});

test('en 1.000 partidas, cada una tiene al menos una sala violeta y como mucho un dragón', () => {
  for (let semilla = 0; semilla < 1000; semilla++) {
    let violetas = 0;
    let dragonUsado = false;
    CLAVES.forEach((clave, i) => {
      const zona = generarZona(
        ajustes(clave, {
          violeta: modoVioleta(i, CLAVES.length, violetas),
          probabilidadVioleta: VIOLETAS.probabilidad,
          probabilidadTrampa: VIOLETAS.probabilidadTrampa,
        }),
        semilla * 3 + i,
      );
      if (!zona.salas.some((s) => s.tipo === 'violeta')) return;
      violetas++;
      const azar = crearAzar(zona.semilla);
      const jefe = jefeVioleta(clave, datos.zonas[clave], VIOLETAS, dragonUsado, azar);
      if (jefe === VIOLETAS.dragon[clave]) {
        expect(dragonUsado).toBe(false);
        dragonUsado = true;
      }
    });
    expect(violetas).toBeGreaterThan(0);
  }
});
