import { expect, test } from 'vitest';
import type { AjustesVioletas } from '../src/core/types';
import historia from '../src/data/historia.json';
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

test('los textos de las recompensas están en historia.json, con sus huecos', () => {
  const r = historia.recompensas;
  expect(r.habilidad.texto).toContain('{habilidad}');
  expect(r.pieza.texto).toContain('{jefe}');
  expect(r.pieza.texto).toContain('{pieza}');
  for (const t of [r.habilidad, r.pieza, r.corazon]) expect(t.titulo).toBeTruthy();
});
