import { expect, test } from 'vitest';
import {
  actualizarRecords,
  formatearTiempo,
  leerRecords,
  RECORDS_VACIOS,
  type Resumen,
} from '../src/core/records';

const partida = (victoria: boolean, segundos: number, nivel: number): Resumen => ({
  victoria,
  heroina: 'Rana maga',
  nivel,
  zona: 'Cripta',
  vencidos: 30,
  segundos,
});

test('los récords cuentan partidas y victorias y guardan el mejor tiempo y el nivel más alto', () => {
  let r = actualizarRecords(RECORDS_VACIOS, partida(false, 300, 4));
  expect(r).toEqual({ partidas: 1, victorias: 0, mejorTiempo: null, nivelMaximo: 4 });
  r = actualizarRecords(r, partida(true, 1500, 9));
  r = actualizarRecords(r, partida(true, 1700, 8));
  expect(r).toEqual({ partidas: 3, victorias: 2, mejorTiempo: 1500, nivelMaximo: 9 });
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
  });
});

test('formatearTiempo', () => {
  expect([formatearTiempo(754), formatearTiempo(59.9), formatearTiempo(3600)]).toEqual([
    '12:34',
    '0:59',
    '60:00',
  ]);
});
