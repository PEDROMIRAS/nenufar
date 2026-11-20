import { describe, expect, it, test } from 'vitest';
import { partirTexto, partirLista } from '../src/core/texto';

test('partirTexto llena cada línea sin pasarse ni cortar palabras', () => {
  expect(partirTexto('La luna se enciende y llueve', 12)).toEqual([
    'La luna se',
    'enciende y',
    'llueve',
  ]);
  expect(partirTexto('Amanece.', 20)).toEqual(['Amanece.']);
});

test('partirTexto deja sola una palabra demasiado larga y no da líneas vacías', () => {
  expect(partirTexto('a supercalifragilístico b', 5)).toEqual(['a', 'supercalifragilístico', 'b']);
  expect(partirTexto('', 10)).toEqual([]);
});

describe('partirLista', () => {
  const records = 'Partidas 12 · Victorias 5 · Nivel máx. 12 · Logros 6/6';

  it('no parte ningún elemento ni empieza una línea con el separador', () => {
    const lineas = partirLista(records, 41);
    expect(lineas).toEqual(['Partidas 12 · Victorias 5 · Nivel máx. 12', 'Logros 6/6']);
    for (const l of lineas) expect(l.startsWith('·')).toBe(false);
  });

  it('si cabe todo, una línea', () => {
    expect(partirLista(records, 80)).toEqual([records]);
  });

  it('un elemento más largo que el ancho se parte por palabras', () => {
    expect(partirLista('Mejor tiempo en Difícil 12:34 · Logros 1/6', 12)).toEqual([
      'Mejor tiempo',
      'en Difícil',
      '12:34',
      'Logros 1/6',
    ]);
  });

  it('sin texto, ninguna línea', () => {
    expect(partirLista('', 20)).toEqual([]);
  });
});
