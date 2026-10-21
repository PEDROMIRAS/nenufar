import { describe, expect, test } from 'vitest';
import {
  actuar,
  avanzar,
  calcularDanio,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  puedeHuir,
} from '../src/core/combate';
import type { MonstruoJson, ReglasCombate } from '../src/core/types';
import { HEROES as heroes, MONSTRUOS, REGLAS } from '../src/data/datos';

const PV_RONIN = heroes.ronin.estadisticas.pv;

const reglas: ReglasCombate = REGLAS;
// Limo con estadísticas fijas: los tests no deben romperse al equilibrar monstruos.json.
const limo: MonstruoJson = {
  ...MONSTRUOS.limo!,
  estadisticas: { pv: 16, pm: 0, ataque: 6, magia: 0, defensa: 3, velocidad: 4 },
};
/** Azar controlado: devuelve los valores dados en orden y después 0,5 (varianza 1, sin crítico, el Limo ataca). */
const cola =
  (...valores: number[]) =>
  () =>
    valores.length > 0 ? valores.shift()! : 0.5;

function combate(azar: () => number, cambios: Partial<MonstruoJson['estadisticas']> = {}) {
  const enemigo = luchadorDeMonstruo({
    ...limo,
    estadisticas: { ...limo.estadisticas, ...cambios },
  });
  return crearCombate(luchadorDeHeroe(heroes.ronin), [enemigo], reglas, azar);
}

describe('calcularDanio', () => {
  test('aplica la fórmula del documento', () => {
    // (9 × 1 − 3 × 0,5) × 1 = 7,5 → 7
    expect(calcularDanio(9, 1, 3, 0.5, reglas, cola())).toEqual({ cantidad: 7, critico: false });
  });

  test('un crítico multiplica por 1,5', () => {
    expect(calcularDanio(9, 1, 3, 0.5, reglas, cola(0.5, 0))).toEqual({
      cantidad: 11,
      critico: true,
    });
  });

  test('las mejoras de crítico se suman al multiplicador', () => {
    // (9 − 1,5) × (1,5 + 0,5) = 15
    expect(calcularDanio(9, 1, 3, 0.5, reglas, cola(0.5, 0), false, 0.5).cantidad).toBe(15);
  });

  test('nunca baja de 1, aunque la defensa supere al ataque', () => {
    expect(calcularDanio(2, 1, 40, 0.5, reglas, cola()).cantidad).toBe(1);
  });

  test('la varianza mueve el daño entre ×0,9 y ×1,1', () => {
    expect(calcularDanio(20, 1, 0, 0.5, reglas, cola(0, 1)).cantidad).toBe(18);
    expect(calcularDanio(20, 1, 0, 0.5, reglas, cola(0.9999, 1)).cantidad).toBe(21);
  });
});

describe('turnos', () => {
  test('la heroína, más rápida que el Limo, actúa primero', () => {
    const c = combate(cola());
    const eventos = avanzar(c);
    expect(eventos).toMatchObject([{ tipo: 'turno', actor: c.heroina, indice: 0 }]);
    expect(c.esperando).toBe(true);
  });

  test('un monstruo más rápido actúa antes de que se le pida nada a la heroína', () => {
    const c = combate(cola(), { velocidad: 10 });
    const tipos = avanzar(c).map((e) => e.tipo);
    expect(tipos).toEqual(['turno', 'danio', 'turno']);
  });

  test('los empates de Velocidad se deciden al azar', () => {
    // Desempate: la heroína saca 0,9 y el Limo 0,1; actúa primero el valor menor.
    const c = combate(cola(0.9, 0.1), { velocidad: 6 });
    expect(avanzar(c)[0]).toMatchObject({ tipo: 'turno', actor: c.enemigos[0] });
  });
});

describe('acciones', () => {
  test('Defender recupera 2 PM y reduce a la mitad el siguiente golpe', () => {
    const c = combate(cola());
    c.heroina.pm = 3;
    avanzar(c);
    actuar(c, { tipo: 'defender' });
    expect(c.heroina.pm).toBe(5);
    // Golpe del Limo: (6 − 6 × 0,5) = 3 → a la mitad = 1.
    expect(c.heroina.pv).toBe(PV_RONIN - 1);
  });

  test('los PM recuperados no pasan del máximo', () => {
    const c = combate(cola());
    avanzar(c);
    const eventos = actuar(c, { tipo: 'defender' });
    expect(eventos[0]).toEqual({ tipo: 'defensa', actor: c.heroina, pm: 0 });
  });

  test('el golpe cargado se anuncia un turno antes, y Defender lo reduce a la mitad', () => {
    // Ronda 1: desempate (2 valores) y el Limo, más rápido, saca 0,8 → «cargar».
    const c = combate(cola(0.5, 0.5, 0.8), { velocidad: 10 });
    const ronda1 = avanzar(c);
    expect(ronda1[1]).toEqual({
      tipo: 'carga',
      actor: c.enemigos[0],
      aviso: 'se hincha...',
    });
    actuar(c, { tipo: 'defender' });
    // Golpe cargado: (6 × 3 − 3) = 15 → a la mitad = 7.
    expect(c.heroina.pv).toBe(PV_RONIN - 7);
  });

  test('sin defender, el golpe cargado entra entero', () => {
    const c = combate(cola(0.5, 0.5, 0.8), { velocidad: 10, pv: 100 });
    avanzar(c);
    actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(c.heroina.pv).toBe(PV_RONIN - 15);
  });

  test('Huir falla con 0,65 la primera vez (60 %) y lo logra con 0,65 la segunda (70 %)', () => {
    // Desempate (2 valores), el Limo decide su acción de la ronda (1) y la tirada de huida.
    const c = combate(cola(0.5, 0.5, 0.5, 0.65));
    avanzar(c);
    const primero = actuar(c, { tipo: 'huir' });
    expect(primero[0]).toEqual({ tipo: 'huida', exito: false });
    expect(c.resultado).toBeNull();
    // Tras el turno del Limo: nueva ronda (2 valores de desempate) y el intento.
    c.azar = cola(0.5, 0.5, 0.65);
    const segundo = actuar(c, { tipo: 'huir' });
    expect(segundo).toEqual([
      { tipo: 'huida', exito: true },
      { tipo: 'fin', resultado: 'huida' },
    ]);
  });

  test('de un jefe no se puede huir', () => {
    const c = crearCombate(
      luchadorDeHeroe(heroes.ronin),
      [luchadorDeMonstruo({ ...limo, jefe: true })],
      reglas,
      cola(),
    );
    expect(puedeHuir(c)).toBe(false);
    avanzar(c);
    expect(() => actuar(c, { tipo: 'huir' })).toThrow('No se puede huir');
  });
});

describe('final', () => {
  test('al dejar al Limo sin vida se gana y se cobra su experiencia', () => {
    const c = combate(cola());
    avanzar(c);
    let eventos = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    while (!c.resultado) eventos = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    // Tras la muerte: recupera el 30 % de lo que le falta (sin pasarse) y cobra la experiencia del
    // Limo; con 6 PX todavía no sube de nivel.
    const herida =
      PV_RONIN - (c.heroina.pv - (eventos.find((e) => e.tipo === 'recupera') as { pv: number }).pv);
    expect(eventos.slice(-4)).toEqual([
      { tipo: 'muerte', objetivo: c.enemigos[0] },
      { tipo: 'recupera', pv: Math.min(herida, Math.round(PV_RONIN * 0.3)), pm: 0 },
      { tipo: 'experiencia', cantidad: 6 },
      { tipo: 'fin', resultado: 'victoria' },
    ]);
    expect(c.heroina.experiencia).toBe(6);
    expect(c.esperando).toBe(false);
  });

  test('si la heroína se queda sin vida se pierde', () => {
    const c = combate(cola());
    c.heroina.pv = 1;
    avanzar(c);
    const eventos = actuar(c, { tipo: 'defender' });
    expect(eventos.slice(-2)).toEqual([
      { tipo: 'muerte', objetivo: c.heroina },
      { tipo: 'fin', resultado: 'derrota' },
    ]);
  });

  test('con el combate terminado no se puede actuar', () => {
    const c = combate(cola());
    c.heroina.pv = 1;
    avanzar(c);
    actuar(c, { tipo: 'defender' });
    expect(() => actuar(c, { tipo: 'defender' })).toThrow('No es el turno');
  });
});

describe('prioridad de Defender', () => {
  /** Limo que siempre se defiende y es más lento que la ronin. */
  const guardian = (iniciativa: 'heroina' | null) => {
    const enemigo = luchadorDeMonstruo({
      ...limo,
      estadisticas: { ...limo.estadisticas, pv: 100, velocidad: 1 },
      acciones: [{ accion: 'defender', peso: 1 }],
    });
    const c = crearCombate(luchadorDeHeroe(heroes.ronin), [enemigo], reglas, cola());
    c.iniciativa = iniciativa;
    return c;
  };

  test('el monstruo que va a defenderse se pone en guardia al empezar la ronda, antes de que le peguen', () => {
    const c = guardian(null);
    const eventos = avanzar(c);
    expect(eventos[0]).toEqual({ tipo: 'defensa', actor: c.enemigos[0], pm: 0 });
    const golpe = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    // Sin defender serían (9 − 3 × 0,5) = 7,5 → 7; en guardia, la mitad → 3.
    expect(golpe[0]).toMatchObject({ tipo: 'danio', cantidad: 3 });
  });

  test('si lo pillan por la espalda, en la primera ronda no le da tiempo a ponerse en guardia', () => {
    const c = guardian('heroina');
    expect(avanzar(c).some((e) => e.tipo === 'defensa')).toBe(false);
    const golpe = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(golpe[0]).toMatchObject({ tipo: 'danio', cantidad: 7 });
  });
});

test('cada turno lleva el orden de su ronda, que no cambia aunque empiece otra', () => {
  const c = combate(cola(), { velocidad: 10 });
  const eventos = avanzar(c).filter((e) => e.tipo === 'turno');
  const primero = eventos[0]!;
  if (primero.tipo !== 'turno') throw new Error('se esperaba un turno');
  const orden = [...primero.orden];
  // La heroína actúa y se juega el resto: las rondas nuevas no tocan la lista de la primera.
  for (let i = 0; i < 5 && !c.resultado; i++) {
    if (c.esperando) actuar(c, { tipo: 'defender' });
    avanzar(c);
  }
  expect(primero.orden).toEqual(orden);
  expect(primero.orden[primero.indice]).toBe(primero.actor);
});
