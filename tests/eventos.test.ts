import { describe, expect, test } from 'vitest';
import { aplicarAltar, opcionesAltar } from '../src/core/eventos';
import { crearInventario } from '../src/core/inventario';
import { EVENTOS, OBJETOS } from '../src/data/datos';

const altar = EVENTOS.altar;
const heroina = (pv: number, pvMax: number, pm: number, pmMax: number) => ({
  pv,
  pvMax,
  pm,
  pmMax,
});
const clave = (l: ReturnType<typeof heroina>, k: string) =>
  opcionesAltar(l, altar).find((o) => o.clave === k)!;

describe('opcionesAltar', () => {
  test('siempre ofrece vida, magia y marcharse, en ese orden', () => {
    expect(opcionesAltar(heroina(40, 40, 10, 10), altar).map((o) => o.clave)).toEqual([
      'vida',
      'magia',
      'marcharse',
    ]);
  });

  test('marcharse siempre está activa', () => {
    expect(clave(heroina(1, 40, 0, 10), 'marcharse').activa).toBe(true);
  });

  test('ofrecer vida: con PV a 1 no se puede; con más, se dice cuántos PV cuesta', () => {
    expect(clave(heroina(1, 40, 5, 10), 'vida').activa).toBe(false);
    const o = clave(heroina(40, 40, 5, 10), 'vida');
    expect(o.activa).toBe(true);
    expect(o.descripcion).toContain(String(Math.round(40 * altar.vida.porcentaje)));
  });

  test('ofrecer magia: sin PM o con los PV llenos no se puede', () => {
    expect(clave(heroina(20, 40, 0, 10), 'magia').activa).toBe(false);
    expect(clave(heroina(40, 40, 5, 10), 'magia').activa).toBe(false);
    expect(clave(heroina(20, 40, 5, 10), 'magia').activa).toBe(true);
  });

  test('una opción apagada dice por qué', () => {
    expect(clave(heroina(1, 40, 5, 10), 'vida').descripcion).toBe(altar.vida.sinEfecto);
    expect(clave(heroina(20, 40, 0, 10), 'magia').descripcion).toBe(altar.magia.sinEfecto);
  });
});

describe('aplicarAltar', () => {
  const max = OBJETOS.maximoPorTipo;

  test('vida: paga el porcentaje de PV máximos, rellena los PM y da un Éter', () => {
    const l = heroina(40, 40, 2, 10);
    const inv = crearInventario();
    aplicarAltar(l, inv, 'vida', altar, max);
    expect(l.pv).toBe(40 - Math.round(40 * altar.vida.porcentaje));
    expect(l.pm).toBe(10);
    expect(inv.consumibles[altar.vida.consumible]).toBe(1);
  });

  test('vida: nunca deja menos de 1 PV', () => {
    const l = heroina(5, 100, 0, 10);
    aplicarAltar(l, crearInventario(), 'vida', altar, max);
    expect(l.pv).toBe(1);
  });

  test('vida: con la mochila llena de Éter no cabe otro y lo dice', () => {
    const inv = crearInventario();
    inv.consumibles[altar.vida.consumible] = max;
    const aviso = aplicarAltar(heroina(40, 40, 2, 10), inv, 'vida', altar, max);
    expect(inv.consumibles[altar.vida.consumible]).toBe(max);
    expect(aviso).toContain('no te caben');
  });

  test('magia: paga todos los PM y recupera el porcentaje de PV máximos sin pasarse', () => {
    const l = heroina(10, 40, 7, 10);
    aplicarAltar(l, crearInventario(), 'magia', altar, max);
    expect(l.pm).toBe(0);
    expect(l.pv).toBe(10 + Math.round(40 * altar.magia.porcentaje));
    const casi = heroina(38, 40, 7, 10);
    aplicarAltar(casi, crearInventario(), 'magia', altar, max);
    expect(casi.pv).toBe(40);
  });

  test('marcharse no cambia nada', () => {
    const l = heroina(10, 40, 3, 10);
    const inv = crearInventario();
    aplicarAltar(l, inv, 'marcharse', altar, max);
    expect(l).toEqual(heroina(10, 40, 3, 10));
    expect(inv.consumibles).toEqual({});
  });
});
