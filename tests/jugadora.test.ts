import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import {
  aplicarEstado,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
} from '../src/core/combate';
import { decidir, elegirEquipadas } from '../src/core/jugadora';
import JUGADORA from '../src/data/jugadora.json';
import { bestiarioCon, reglasCon } from '../src/core/dificultad';
import { equipar, inventarioInicial } from '../src/core/equipo';
import { DIFICULTADES, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import { pelear } from './simulador';

test('cada pieza que suelta un combate, o se la pone o va a lo que le sobra (para el mercader)', () => {
  const dificultad = DIFICULTADES.facil;
  const bestiario = bestiarioCon(MONSTRUOS, dificultad);
  // Un limo que siempre suelta un arma o una armadura de nivel 1.
  const limo = {
    ...bestiario.limo!,
    botin: [
      { objeto: 'arma', nivel: 1, peso: 1 },
      { objeto: 'armadura', nivel: 1, peso: 1 },
    ],
  };
  const mundo = { bestiario: { ...bestiario, limo }, reglas: reglasCon(REGLAS, dificultad) };
  let soltadas = 0;
  for (let s = 1; s <= 20; s++) {
    const heroe = HEROES.ronin;
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    // Con lo mejor puesto, lo de nivel 1 no se lo pone.
    equipar(h, inv, OBJETOS, 'katana_brasas');
    equipar(h, inv, OBJETOS, 'armadura_obsidiana');
    const antes = [inv.arma, inv.armadura];
    const sobran: string[] = [];
    const gana = pelear(h, inv, ['limo'], crearAzar(s), mundo, undefined, (k) => sobran.push(k));
    if (!gana) continue;
    // Un limo, una pieza, y no se la pone: sobra.
    expect([inv.arma, inv.armadura]).toEqual(antes);
    expect(sobran).toHaveLength(1);
    soltadas++;
  }
  expect(soltadas).toBeGreaterThan(0);
});

describe('la jugadora y sus habilidades', () => {
  const mundo = () => ({
    bestiario: bestiarioCon(MONSTRUOS, DIFICULTADES.normal),
    reglas: reglasCon(REGLAS, DIFICULTADES.normal),
    objetos: OBJETOS,
    experiencia: REGLAS.experiencia,
    politica: JUGADORA,
  });

  test('elige las 3 primeras de su orden que conoce', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    elegirEquipadas(h, ['Iaido', 'Grito de guerra', 'Golpe de pomo', 'Corte rápido']);
    expect(h.equipadas).toEqual(['Grito de guerra', 'Golpe de pomo', 'Corte rápido']);
    // Si su orden no llega a 3, completa con las que conoce, en su orden.
    elegirEquipadas(h, ['Iaido']);
    expect(h.equipadas).toEqual(['Corte rápido', 'Postura de hierro', 'Golpe de pomo']);
  });

  test('cada rana tiene su orden para la zona y para el jefe, con habilidades que existen', () => {
    for (const heroe of Object.values(HEROES)) {
      const nombres = heroe.habilidades.map((x) => x.nombre);
      for (const lista of [heroe.planHabilidades.zona, heroe.planHabilidades.jefe])
        for (const n of lista) expect(nombres).toContain(n);
    }
  });

  test('con un golpe cargado y Golpe de pomo equipado, lo rompe en vez de defenderse', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    h.equipadas = ['Golpe de pomo'];
    const m = mundo();
    const c = crearCombate(h, [luchadorDeMonstruo(m.bestiario.limo!)], m.reglas, () => 0.5);
    avanzar(c);
    c.enemigos[0]!.cargando = true;
    const accion = decidir(c, () => 0, JUGADORA);
    expect(accion).toMatchObject({ tipo: 'habilidad', objetivo: c.enemigos[0] });
    expect(accion.tipo === 'habilidad' && accion.habilidad.nombre).toBe('Golpe de pomo');
  });

  test('sin PM para Corte rápido ataca, no usa un golpe más flojo que el ataque normal', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    h.equipadas = ['Corte rápido', 'Golpe de pomo'];
    const m = mundo();
    const c = crearCombate(h, [luchadorDeMonstruo(m.bestiario.limo!)], m.reglas, () => 0.5);
    avanzar(c);
    h.pm = 2;
    expect(decidir(c, () => 0.99, JUGADORA).tipo).toBe('atacar');
  });

  test('con veneno y Respiro equipado, se lo quita', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    h.nivel = 9;
    h.equipadas = ['Respiro', 'Corte rápido'];
    const m = mundo();
    const c = crearCombate(h, [luchadorDeMonstruo(m.bestiario.limo!)], m.reglas, () => 0.5);
    avanzar(c);
    aplicarEstado(c, h, 'veneno', false, []);
    const accion = decidir(c, () => 0.99, JUGADORA);
    expect(accion.tipo === 'habilidad' && accion.habilidad.nombre).toBe('Respiro');
  });
});
