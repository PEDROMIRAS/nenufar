import { describe, expect, test } from 'vitest';
import { luchadorDeHeroe, type Luchador } from '../src/core/combate';
import { aplicarAltar, opcionesAltar } from '../src/core/eventos';
import { crearInventario } from '../src/core/inventario';
import { experienciaParaSubir } from '../src/core/progresion';
import { EVENTOS, HEROES, OBJETOS, REGLAS } from '../src/data/datos';

const altar = EVENTOS.altar;
const reglas = REGLAS.experiencia;
const max = OBJETOS.maximoPorTipo;

/** La ronin de nivel 1 con estas cifras de vida y magia. */
function heroina(pv: number, pvMax: number, pm: number, pmMax: number): Luchador {
  const l = luchadorDeHeroe(HEROES.ronin);
  Object.assign(l, { pv, pvMax, pm, pmMax });
  return l;
}
const opcion = (l: Luchador, k: string) =>
  opcionesAltar(l, altar, reglas).find((o) => o.clave === k)!;
const pxVida = (nivel: number) =>
  Math.round(experienciaParaSubir(nivel, reglas) * altar.vida.experiencia);

describe('opcionesAltar', () => {
  test('siempre ofrece vida, magia y marcharse, en ese orden', () => {
    expect(opcionesAltar(heroina(40, 40, 10, 10), altar, reglas).map((o) => o.clave)).toEqual([
      'vida',
      'magia',
      'marcharse',
    ]);
  });

  test('marcharse siempre está activa', () => {
    expect(opcion(heroina(1, 40, 0, 10), 'marcharse').activa).toBe(true);
  });

  test('ofrecer vida: con PV a 1 no se puede; con más, dice cuántos PV cuesta y cuánta experiencia da', () => {
    expect(opcion(heroina(1, 40, 5, 10), 'vida').activa).toBe(false);
    const o = opcion(heroina(40, 40, 5, 10), 'vida');
    expect(o.activa).toBe(true);
    expect(o.descripcion).toContain(String(Math.round(40 * altar.vida.porcentaje)));
    expect(o.descripcion).toContain(`${pxVida(1)} PX`);
  });

  test('ofrecer vida en el nivel máximo no promete experiencia', () => {
    const l = heroina(40, 40, 5, 10);
    l.nivel = reglas.nivelMaximo;
    expect(opcion(l, 'vida').descripcion).toBe(
      altar.vida.descripcionNivelMaximo.replace('{coste}', '12'),
    );
  });

  test('ofrecer magia: sin PM o con los PV llenos no se puede', () => {
    expect(opcion(heroina(20, 40, 0, 10), 'magia').activa).toBe(false);
    expect(opcion(heroina(40, 40, 5, 10), 'magia').activa).toBe(false);
    expect(opcion(heroina(20, 40, 5, 10), 'magia').activa).toBe(true);
  });

  test('una opción apagada dice por qué', () => {
    expect(opcion(heroina(1, 40, 5, 10), 'vida').descripcion).toBe(altar.vida.sinEfecto);
    expect(opcion(heroina(20, 40, 0, 10), 'magia').descripcion).toBe(altar.magia.sinEfecto);
  });
});

describe('aplicarAltar', () => {
  test('vida: paga el porcentaje de PV máximos, rellena los PM y da experiencia', () => {
    const l = heroina(40, 40, 2, 10);
    aplicarAltar(l, crearInventario(), 'vida', altar, max, reglas);
    expect(l.pv).toBe(40 - Math.round(40 * altar.vida.porcentaje));
    expect(l.pm).toBe(10);
    expect(l.experiencia).toBe(pxVida(1));
  });

  test('vida: nunca deja menos de 1 PV', () => {
    const l = heroina(5, 100, 0, 10);
    aplicarAltar(l, crearInventario(), 'vida', altar, max, reglas);
    expect(l.pv).toBe(1);
  });

  test('vida: si la experiencia da para subir de nivel, sube y lo dice', () => {
    const l = heroina(40, 40, 2, 10);
    l.experiencia = experienciaParaSubir(1, reglas) - 1;
    const aviso = aplicarAltar(l, crearInventario(), 'vida', altar, max, reglas);
    expect(l.nivel).toBe(2);
    expect(aviso).toContain('nivel 2');
  });

  test('vida en el nivel máximo no cobra ni da experiencia', () => {
    const l = heroina(40, 40, 2, 10);
    l.nivel = reglas.nivelMaximo;
    aplicarAltar(l, crearInventario(), 'vida', altar, max, reglas);
    expect(l.experiencia).toBe(0);
  });

  test('magia: paga todos los PM, recupera el porcentaje de PV máximos sin pasarse y da una Poción', () => {
    const inv = crearInventario();
    const l = heroina(10, 40, 7, 10);
    aplicarAltar(l, inv, 'magia', altar, max, reglas);
    expect(l.pm).toBe(0);
    expect(l.pv).toBe(10 + Math.round(40 * altar.magia.porcentaje));
    for (const c of altar.magia.consumibles) expect(inv.consumibles[c]).toBe(1);
    const casi = heroina(38, 40, 7, 10);
    aplicarAltar(casi, crearInventario(), 'magia', altar, max, reglas);
    expect(casi.pv).toBe(40);
  });

  test('magia: con la mochila llena de Pociones no cabe otra y lo dice', () => {
    const inv = crearInventario();
    const [primero] = altar.magia.consumibles;
    inv.consumibles[primero!] = max;
    const aviso = aplicarAltar(heroina(10, 40, 7, 10), inv, 'magia', altar, max, reglas);
    expect(inv.consumibles[primero!]).toBe(max);
    expect(aviso).toContain('no te caben');
  });

  test('marcharse no cambia nada', () => {
    const l = heroina(10, 40, 3, 10);
    const inv = crearInventario();
    aplicarAltar(l, inv, 'marcharse', altar, max, reglas);
    expect(l).toEqual(heroina(10, 40, 3, 10));
    expect(inv.consumibles).toEqual({});
  });
});
