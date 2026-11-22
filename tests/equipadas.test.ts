import { describe, expect, test } from 'vitest';
import {
  actuar,
  avanzar,
  crearCombate,
  habilidadesConocidas,
  habilidadesDisponibles,
  luchadorDeHeroe,
  luchadorDeMonstruo,
} from '../src/core/combate';
import {
  ajustarEquipadas,
  alternarEquipada,
  equipadasIniciales,
  puedeCerrar,
} from '../src/core/equipadas';
import { cambiosDeNivel, ganarExperiencia, instantanea } from '../src/core/progresion';
import type { HeroeJson } from '../src/core/types';
import { HEROES, MONSTRUOS, REGLAS } from '../src/data/datos';

const ronin = HEROES.ronin!;
const nombres = (l: ReturnType<typeof luchadorDeHeroe>) =>
  habilidadesDisponibles(l).map((h) => h.nombre);

describe('habilidades equipadas', () => {
  test('cada rana lleva 3 como máximo', () => {
    expect(ronin.equipables).toBe(3);
    expect(HEROES.maga!.equipables).toBe(3);
  });

  test('con 4 conocidas y 3 equipadas, el combate solo ofrece esas 3', () => {
    const l = luchadorDeHeroe(ronin);
    expect(habilidadesConocidas(l)).toHaveLength(4);
    expect(nombres(l)).toEqual(['Corte rápido', 'Postura de hierro', 'Golpe de pomo']);
  });

  test('las equipadas salen en el orden de la lista de la rana', () => {
    const l = luchadorDeHeroe(ronin);
    l.equipadas = ['Grito de guerra', 'Corte rápido', 'Golpe de pomo'];
    expect(nombres(l)).toEqual(['Corte rápido', 'Golpe de pomo', 'Grito de guerra']);
  });

  test('alternar quita una puesta, pone una libre y con 3 puestas dice llena sin cambiar nada', () => {
    const l = luchadorDeHeroe(ronin);
    expect(alternarEquipada(l, 'Grito de guerra')).toBe('llena');
    expect(l.equipadas).toHaveLength(3);
    expect(alternarEquipada(l, 'Postura de hierro')).toBe('quitada');
    expect(alternarEquipada(l, 'Grito de guerra')).toBe('puesta');
    expect(nombres(l)).toEqual(['Corte rápido', 'Golpe de pomo', 'Grito de guerra']);
  });

  test('no se puede equipar una que no conoce', () => {
    const l = luchadorDeHeroe(ronin);
    l.equipadas = ['Corte rápido'];
    expect(alternarEquipada(l, 'Iaido')).toBe('llena');
    expect(l.equipadas).toEqual(['Corte rápido']);
  });

  test('puedeCerrar exige 3; con menos de 3 conocidas, todas', () => {
    const l = luchadorDeHeroe(ronin);
    expect(puedeCerrar(l)).toBe(true);
    alternarEquipada(l, 'Corte rápido');
    expect(puedeCerrar(l)).toBe(false);
    const una: HeroeJson = { ...ronin, habilidades: [ronin.habilidades[0]!] };
    const sola = luchadorDeHeroe(una);
    expect(sola.equipadas).toEqual(['Corte rápido']);
    expect(puedeCerrar(sola)).toBe(true);
  });

  test('subir de nivel no equipa la nueva', () => {
    const l = luchadorDeHeroe(ronin);
    ganarExperiencia(l, 1000, REGLAS.experiencia);
    expect(habilidadesConocidas(l).map((h) => h.nombre)).toContain('Tajo del viento');
    expect(nombres(l)).not.toContain('Tajo del viento');
  });

  test('ajustarEquipadas quita nombres desconocidos y rellena si queda vacía', () => {
    const l = luchadorDeHeroe(ronin);
    l.equipadas = ['Iaido', 'Corte rápido', 'Inventada'];
    ajustarEquipadas(l);
    expect(l.equipadas).toEqual(['Corte rápido']);
    l.equipadas = ['Inventada'];
    ajustarEquipadas(l);
    expect(l.equipadas).toEqual(equipadasIniciales(l));
    expect(l.equipadas).toHaveLength(3);
  });

  test('actuar con una habilidad no equipada lanza error', () => {
    const l = luchadorDeHeroe(ronin);
    const c = crearCombate(l, [luchadorDeMonstruo(MONSTRUOS.limo!)], REGLAS, () => 0.5);
    avanzar(c);
    const grito = ronin.habilidades.find((h) => h.nombre === 'Grito de guerra')!;
    expect(() => actuar(c, { tipo: 'habilidad', habilidad: grito, objetivo: null })).toThrow(
      'no está equipada',
    );
  });

  test('cambiosDeNivel avisa una sola vez de dónde equipar lo aprendido, al final', () => {
    const l = luchadorDeHeroe(ronin);
    const antes = instantanea(l);
    l.nivel = 5; // aprende Tajo del viento (3) y Hoja envenenada (5)
    const lineas = cambiosDeNivel(antes, l, 'Se equipan en la pantalla Habilidades');
    expect(lineas).toContain('Nueva habilidad: Tajo del viento');
    expect(lineas).toContain('Nueva habilidad: Hoja envenenada');
    expect(lineas.filter((x) => x.includes('pantalla Habilidades'))).toHaveLength(1);
    expect(lineas.at(-1)).toBe('Se equipan en la pantalla Habilidades');
    // Sin habilidad nueva, sin aviso.
    const otra = luchadorDeHeroe(ronin);
    const antes2 = instantanea(otra);
    otra.ataque += 2;
    expect(cambiosDeNivel(antes2, otra, 'Se equipan en la pantalla Habilidades')).toHaveLength(1);
  });
});
