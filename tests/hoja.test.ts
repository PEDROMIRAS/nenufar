import { expect, test } from 'vitest';
import { escalaHoja } from '../src/core/hoja';
import type { SpriteJson } from '../src/core/types';

const hoja = (scale?: number): SpriteJson => ({
  frameWidth: 64,
  frameHeight: 64,
  anchor: { x: 32, y: 60 },
  directions: { down: 0, left: 1, right: 2, up: 3 },
  animations: {},
  ...(scale === undefined ? {} : { scale }),
});

test('una hoja sin scale va a un píxel de hoja por píxel de juego', () => {
  expect(escalaHoja(hoja())).toBe(1);
});

test('una hoja a doble resolución dice cuántos píxeles de hoja ocupa uno de juego', () => {
  expect(escalaHoja(hoja(2))).toBe(2);
});
