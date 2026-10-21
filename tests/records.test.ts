import { expect, test } from 'vitest';
import {
  actualizarRecords,
  formatearTiempo,
  leerRecords,
  RECORDS_VACIOS,
  textoPorDificultad,
  esNuevoRecord,
  type Resumen,
} from '../src/core/records';

const partida = (
  victoria: boolean,
  segundos: number,
  nivel: number,
  dificultad = 'normal',
): Resumen => ({
  victoria,
  heroina: 'Rana maga',
  nivel,
  zona: 'Cripta',
  vencidos: 30,
  segundos,
  dificultad,
  heroe: 'maga',
  objetosUsados: 0,
  contraHeredada: false,
});

test('los récords cuentan partidas y victorias y guardan el mejor tiempo y el nivel más alto', () => {
  let r = actualizarRecords(RECORDS_VACIOS, partida(false, 300, 4));
  expect(r).toMatchObject({ partidas: 1, victorias: 0, mejorTiempo: null, nivelMaximo: 4 });
  r = actualizarRecords(r, partida(true, 1500, 9));
  r = actualizarRecords(r, partida(true, 1700, 8));
  expect(r).toMatchObject({ partidas: 3, victorias: 2, mejorTiempo: 1500, nivelMaximo: 9 });
});

test('unos récords dañados o de otra versión no rompen el juego', () => {
  expect(leerRecords(null)).toEqual(RECORDS_VACIOS);
  expect(leerRecords('{no es json')).toEqual(RECORDS_VACIOS);
  expect(leerRecords('{"partidas": -3, "victorias": "muchas", "mejorTiempo": 0}')).toEqual(
    RECORDS_VACIOS,
  );
  expect(
    leerRecords('{"partidas": 2, "victorias": 1, "mejorTiempo": 1234, "nivelMaximo": 7}'),
  ).toEqual({
    partidas: 2,
    victorias: 1,
    mejorTiempo: 1234,
    nivelMaximo: 7,
    porDificultad: {},
    ganadasCon: [],
    logros: [],
    bestiario: [],
  });
});

test('formatearTiempo', () => {
  expect([formatearTiempo(754), formatearTiempo(59.9), formatearTiempo(3600)]).toEqual([
    '12:34',
    '0:59',
    '60:00',
  ]);
});

test('cada dificultad guarda sus victorias y su mejor tiempo, y se leen de vuelta', () => {
  let r = actualizarRecords(RECORDS_VACIOS, partida(true, 900, 8, 'facil'));
  r = actualizarRecords(r, partida(true, 1200, 9, 'dificil'));
  r = actualizarRecords(r, partida(true, 800, 9, 'facil'));
  r = actualizarRecords(r, partida(false, 300, 3, 'dificil'));
  expect(r.porDificultad).toEqual({
    facil: { victorias: 2, mejorTiempo: 800 },
    dificil: { victorias: 1, mejorTiempo: 1200 },
  });
  expect(leerRecords(JSON.stringify(r))).toEqual(r);
  const nombres: [string, string][] = [
    ['facil', 'Fácil'],
    ['normal', 'Normal'],
    ['dificil', 'Difícil'],
  ];
  expect(textoPorDificultad(r, nombres)).toBe('Fácil 2 (13:20) · Normal 0 · Difícil 1 (20:00)');
  expect(textoPorDificultad(RECORDS_VACIOS, nombres)).toBe('');
});

test('esNuevoRecord: la primera victoria de una dificultad y las que bajan su mejor tiempo', () => {
  const r = actualizarRecords(RECORDS_VACIOS, partida(true, 900, 8, 'normal'));
  expect(esNuevoRecord(RECORDS_VACIOS, partida(true, 900, 8, 'normal'))).toBe(true);
  expect(esNuevoRecord(r, partida(true, 850, 8, 'normal'))).toBe(true);
  expect(esNuevoRecord(r, partida(true, 950, 8, 'normal'))).toBe(false);
  expect(esNuevoRecord(r, partida(false, 100, 3, 'normal'))).toBe(false);
  expect(esNuevoRecord(r, partida(true, 2000, 9, 'dificil'))).toBe(true);
});
