import { expect, test } from 'vitest';
import {
  CONDICIONES,
  CASILLAS_BESTIARIO,
  entradasBestiario,
  logrosNuevos,
  monstruosDelMundo,
} from '../src/core/logros';

import { MONSTRUOS } from '../src/data/datos';
import {
  actualizarRecords,
  anotarLogros,
  anotarVencidos,
  RECORDS_VACIOS,
  type Resumen,
} from '../src/core/records';
import logros from '../src/data/logros.json';

const mundo = { heroes: ['ronin', 'maga'], monstruos: ['limo', 'golem'] };
const partida = (cambios: Partial<Resumen> = {}): Resumen => ({
  victoria: true,
  heroina: 'Kero',
  nivel: 8,
  zona: 'Cripta',
  vencidos: 30,
  segundos: 900,
  dificultad: 'normal',
  heroe: 'ronin',
  objetosUsados: 2,
  contraHeredada: false,
  ...cambios,
});
/** Los logros nuevos de una partida jugada sobre `r`, como hace el juego. */
const jugar = (r = RECORDS_VACIOS, s = partida()) =>
  logrosNuevos(actualizarRecords(r, s), s, mundo, logros.logros);

test('cada logro de logros.json tiene su condición', () => {
  for (const l of logros.logros) expect(CONDICIONES, l.clave).toHaveProperty(l.clave);
});

test('la primera victoria da su logro y los demás piden lo suyo', () => {
  expect(jugar()).toEqual(['primera']);
  expect(jugar(RECORDS_VACIOS, partida({ victoria: false }))).toEqual([]);
  expect(jugar(RECORDS_VACIOS, partida({ dificultad: 'dificil', objetosUsados: 0 }))).toEqual([
    'primera',
    'dificil',
    'sin_objetos',
  ]);
  expect(jugar(RECORDS_VACIOS, partida({ contraHeredada: true }))).toContain('ciclo');
});

test('dos caminos pide haber ganado con las dos ranas, aunque sea en partidas distintas', () => {
  const tras = actualizarRecords(RECORDS_VACIOS, partida({ heroe: 'ronin' }));
  expect(jugar(tras, partida({ heroe: 'ronin' }))).not.toContain('dos_ranas');
  expect(jugar(tras, partida({ heroe: 'maga' }))).toContain('dos_ranas');
});

test('el bestiario completo cuenta aunque se pierda, y un logro no se repite', () => {
  const visto = anotarVencidos(RECORDS_VACIOS, ['limo', 'golem', 'limo']);
  expect(visto.bestiario).toEqual(['limo', 'golem']);
  expect(jugar(visto, partida({ victoria: false }))).toEqual(['bestiario']);
  expect(jugar(anotarLogros(visto, ['bestiario', 'primera']))).toEqual([]);
});

test('el bestiario del logro no cuenta los monstruos ocultos (jefes violetas y cofres trampa)', () => {
  const claves = monstruosDelMundo(MONSTRUOS);
  expect(claves.length).toBeGreaterThan(0);
  for (const k of claves) expect(MONSTRUOS[k]!.oculto, k).toBeUndefined();
  expect(claves).not.toContain('arbol_maldito');
  // Con todos los que no están ocultos vencidos, el logro sale sin haber vencido a ningún oculto.
  const visto = { ...RECORDS_VACIOS, bestiario: claves };
  expect(
    logrosNuevos(visto, partida(), { heroes: [], monstruos: claves }, logros.logros),
  ).toContain('bestiario');
});

test('el bestiario con todo vencido cabe en su rejilla y los dragones y cofres trampa van en una ficha', () => {
  const todos = Object.keys(MONSTRUOS);
  const entradas = entradasBestiario(MONSTRUOS, todos);
  const nombres = entradas.map((e) => MONSTRUOS[e.clave]!.nombre);
  expect(new Set(nombres).size).toBe(nombres.length);
  expect(entradas.length).toBeLessThanOrEqual(CASILLAS_BESTIARIO);
  expect(entradas.every((e) => e.visto)).toBe(true);
});

test('el bestiario no enseña los ocultos sin vencer y sí los normales sin vencer', () => {
  const entradas = entradasBestiario(MONSTRUOS, ['limo']);
  expect(entradas.map((e) => e.clave)).toEqual(monstruosDelMundo(MONSTRUOS));
  expect(entradas.find((e) => e.clave === 'limo')?.visto).toBe(true);
  const conDragon = entradasBestiario(MONSTRUOS, ['dragon_negro_ruinas']);
  expect(conDragon.filter((e) => MONSTRUOS[e.clave]!.nombre === 'Dragón negro')).toEqual([
    { clave: 'dragon_negro_ruinas', visto: true },
  ]);
});
