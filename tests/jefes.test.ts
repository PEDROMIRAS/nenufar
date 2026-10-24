import { describe, expect, test } from 'vitest';
import {
  actuar,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  puedeHuir,
  type Combate,
  type Evento,
} from '../src/core/combate';
import { HEROES, MONSTRUOS, REGLAS } from '../src/data/datos';

/** Varianza 1 y sin crítico; con 0,99 los monstruos eligen siempre la última acción de su tabla. */
const fijo = (v: number) => () => v;

function contra(clave: string, azar = fijo(0.5)): Combate {
  const h = luchadorDeHeroe(HEROES.ronin);
  h.pv = h.pvMax = 999;
  h.ataque = 30;
  const c = crearCombate(h, [luchadorDeMonstruo(MONSTRUOS[clave]!)], REGLAS, azar, MONSTRUOS);
  avanzar(c);
  return c;
}
const atacar = (c: Combate, i = 0): Evento[] =>
  actuar(c, { tipo: 'atacar', objetivo: c.enemigos[i]! });

describe('jefes', () => {
  test('de un jefe no se puede huir', () => {
    expect(puedeHuir(contra('rey_limo'))).toBe(false);
  });

  test('el Rey Limo, al bajar del 50 %, se retira y aparecen dos Limos grandes', () => {
    const c = contra('rey_limo');
    const rey = c.enemigos[0]!;
    rey.pv = 31; // un golpe de (30 − 2,5) = 27 lo deja en 4: por debajo de 30
    const eventos = atacar(c);
    expect(eventos).toContainEqual({
      tipo: 'aviso',
      actor: rey,
      texto: '¡El Rey Limo se divide en dos!',
      retira: true,
    });
    expect(rey.pv).toBe(0);
    expect(c.enemigos.slice(1).map((e) => e.nombre)).toEqual(['Limo grande A', 'Limo grande B']);
    expect(eventos.filter((e) => e.tipo === 'aparece')).toHaveLength(2);
    // Sigue el combate, y tampoco se puede huir de los Limos grandes.
    expect(c.resultado).toBeNull();
    expect(puedeHuir(c)).toBe(false);
  });

  test('al vencer a los Limos grandes se gana y se cobra la experiencia de todos', () => {
    const c = contra('rey_limo');
    c.enemigos[0]!.pv = 31;
    let eventos = atacar(c);
    while (!c.resultado) {
      const vivo = c.enemigos.findIndex((e) => e.pv > 0);
      eventos = atacar(c, vivo);
    }
    expect(c.resultado).toBe('victoria');
    expect(eventos).toContainEqual({ tipo: 'experiencia', cantidad: 30 + 10 + 10 });
  });

  test('el Golem cambia de tabla al bajar del 50 %', () => {
    const c = contra('golem');
    const golem = c.enemigos[0]!;
    expect(golem.fase).toBe(0);
    golem.pv = Math.floor(golem.pvMax / 2) + 10; // el golpe de la ronin (30 − 7) lo baja de la mitad
    const eventos = atacar(c);
    expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'aviso', retira: false }));
    expect(golem.fase).toBe(1);
  });

  test('la Reina Araña invoca crías hasta tener 3 enemigos vivos', () => {
    // 0,99 → la última acción de la tabla: «invocar».
    const c = contra('reina_arana', fijo(0.99));
    for (let i = 0; i < 4; i++) actuar(c, { tipo: 'defender' });
    expect(c.enemigos.filter((e) => e.pv > 0)).toHaveLength(3);
    expect(c.enemigos.map((e) => e.nombre)).toEqual(['Reina Araña', 'Araña A', 'Araña B']);
  });

  test('el Señor de la Cripta pasa por sus fases y al final se transforma en el Rey sin Charca', () => {
    const c = contra('senor_cripta');
    const senor = c.enemigos[0]!;
    senor.pv = Math.floor(senor.pvMax * 0.66) + 10; // tras el golpe, por debajo del 66 %
    atacar(c);
    expect(senor.fase).toBe(1);
    senor.pv = Math.floor(senor.pvMax * 0.33) + 10; // tras el golpe, por debajo del 33 %
    const eventos = atacar(c);
    expect(senor.fase).toBe(2);
    expect(eventos).toContainEqual(
      expect.objectContaining({ tipo: 'aviso', actor: senor, retira: true }),
    );
    // Se retira sin morir y en su lugar aparece el Rey sin Charca, con su propia vida.
    expect(senor.pv).toBe(0);
    const rey = c.enemigos.find((e) => e.monstruo === MONSTRUOS.rey_sin_charca);
    expect(rey?.pv).toBe(MONSTRUOS.rey_sin_charca!.estadisticas.pv);
    expect(puedeHuir(c)).toBe(false);
  });

  test('un golpe que lo deja a 0 desde arriba no se salta la transformación', () => {
    const c = contra('senor_cripta');
    const senor = c.enemigos[0]!;
    senor.pv = Math.floor(senor.pvMax * 0.66) + 5; // por encima de las dos fases
    c.heroina.ataque = 999; // un solo golpe lo deja a 0
    const eventos = atacar(c);
    // Las fases intermedias se saltan, pero se transforma en vez de morir.
    expect(eventos.filter((e) => e.tipo === 'aviso')).toHaveLength(1);
    expect(eventos).not.toContainEqual(
      expect.objectContaining({ tipo: 'muerte', objetivo: senor }),
    );
    expect(c.enemigos.some((e) => e.monstruo === MONSTRUOS.rey_sin_charca)).toBe(true);
    expect(c.resultado).toBeNull();
  });
});
