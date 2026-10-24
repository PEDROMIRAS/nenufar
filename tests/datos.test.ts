import { expect, test } from 'vitest';
import type { AjustesVioletas } from '../src/core/types';
import zonas from '../src/data/zonas.json';

test('cada zona tiene su jefe violeta y su dragón, y las probabilidades de las violetas están en (0, 1)', () => {
  const violetas: AjustesVioletas = zonas.violetas;
  for (const [clave, zona] of Object.entries(zonas.zonas)) {
    expect(zona.jefeVioleta, clave).toBeTruthy();
    expect(violetas.dragon[clave], clave).toBeTruthy();
  }
  expect(Object.keys(violetas.dragon).sort()).toEqual(Object.keys(zonas.zonas).sort());
  for (const p of [
    violetas.probabilidad,
    violetas.probabilidadDragon,
    violetas.probabilidadTrampa,
  ]) {
    expect(p > 0 && p < 1).toBe(true);
  }
});
