import { expect, test } from 'vitest';
import { partirTexto } from '../src/core/texto';

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
