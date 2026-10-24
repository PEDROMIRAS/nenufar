import { expect, test } from 'vitest';
import { bestiarioCon, monstruoCon, reglasCon } from '../src/core/dificultad';
import { DIFICULTADES, MONSTRUOS, REGLAS } from '../src/data/datos';

test('con multiplicadores 1 los monstruos y las reglas quedan tal cual', () => {
  const neutra = {
    nombre: '',
    descripcion: '',
    ataque: 1,
    vida: 1,
    recuperacion: 1,
    violetas: 1,
  };
  const limo = MONSTRUOS.limo!;
  expect(monstruoCon(limo, neutra)).toEqual(limo);
  expect(reglasCon(REGLAS, neutra)).toEqual(REGLAS);
  expect(Object.keys(DIFICULTADES)).toEqual(['facil', 'normal', 'dificil']);
});

test('la dificultad escala ataque, magia y PV del monstruo sin tocar el original', () => {
  const d = { nombre: 'x', descripcion: '', ataque: 2, vida: 0.5, recuperacion: 0, violetas: 1 };
  const limo = MONSTRUOS.limo!;
  const e = limo.estadisticas;
  expect(monstruoCon(limo, d).estadisticas).toEqual({
    ...e,
    ataque: e.ataque * 2,
    magia: e.magia * 2,
    pv: Math.round(e.pv * 0.5),
  });
  expect(MONSTRUOS.limo!.estadisticas).toBe(e);
  expect(bestiarioCon(MONSTRUOS, d).golem!.estadisticas.ataque).toBe(
    MONSTRUOS.golem!.estadisticas.ataque * 2,
  );
  expect(reglasCon(REGLAS, d).recuperacionTrasVictoria).toBe(0);
});

test('los jefes violetas llevan además el multiplicador de su dificultad; el resto de monstruos, no', () => {
  const d = { nombre: 'x', descripcion: '', ataque: 1, vida: 1, recuperacion: 1, violetas: 2 };
  const arbol = MONSTRUOS.arbol_maldito!;
  expect(monstruoCon(arbol, d).estadisticas).toEqual({
    ...arbol.estadisticas,
    ataque: arbol.estadisticas.ataque * 2,
    magia: arbol.estadisticas.magia * 2,
    pv: arbol.estadisticas.pv * 2,
  });
  expect(monstruoCon(MONSTRUOS.golem!, d)).toEqual(MONSTRUOS.golem);
  expect(monstruoCon(MONSTRUOS.cofre_trampa_bosque!, d)).toEqual(MONSTRUOS.cofre_trampa_bosque);
  for (const dif of Object.values(DIFICULTADES)) expect(dif.violetas).toBeGreaterThan(0);
});
