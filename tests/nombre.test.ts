import { expect, test } from 'vitest';
import { limpiarNombre } from '../src/core/nombre';

test('limpiarNombre deja letras (con tildes), números y espacios sueltos', () => {
  expect(limpiarNombre('  Kero   la  Brava ', 'Rana ronin', 12)).toBe('Kero la Brav');
  expect(limpiarNombre('Ñoño<script>', 'x', 12)).toBe('Ñoñoscript');
  expect(limpiarNombre('R2D2', 'x', 12)).toBe('R2D2');
});

test('limpiarNombre usa el nombre por defecto si no queda nada', () => {
  expect(limpiarNombre('   ', 'Rana ronin', 12)).toBe('Rana ronin');
  expect(limpiarNombre('!!!', 'Rana maga', 12)).toBe('Rana maga');
});

test('limpiarNombre no deja un espacio al final al recortar', () => {
  expect(limpiarNombre('Gran Rana Verde', 'x', 10)).toBe('Gran Rana');
});
