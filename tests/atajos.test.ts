import { describe, expect, test } from 'vitest';
import { leerAtajos } from '../src/core/atajos';

describe('atajos de la URL', () => {
  test('sin parámetros, nada', () => {
    expect(leerAtajos('', true, 4)).toEqual({
      semilla: null,
      zona: 0,
      mando: false,
      puntos: 0,
      nivel: 0,
      equipo: null,
      combate: [],
      presentar: false,
      altar: false,
      reto: null,
      portada: null,
      vista: null,
      fecha: null,
      eventos: false,
      evento: null,
      presagio: null,
    });
  });

  test('fuera de desarrollo solo cuenta la semilla', () => {
    const a = leerAtajos('?semilla=7&zona=2&mando&combate=limo&desafio&reto=gana', false, 4);
    expect(a.semilla).toBe(7);
    expect([a.zona, a.mando, a.combate, a.evento, a.eventos, a.reto]).toEqual([
      0,
      false,
      [],
      null,
      false,
      null,
    ]);
  });

  test('la semilla, entera y por debajo de 2³¹', () => {
    expect(leerAtajos('?semilla=2147483647', false, 4).semilla).toBe(2 ** 31 - 1);
    for (const s of ['2147483648', '0', '-3', '1.5', 'abc'])
      expect(leerAtajos(`?semilla=${s}`, false, 4).semilla).toBeNull();
  });

  test('la zona se queda entre la primera y la última', () => {
    expect(leerAtajos('?zona=2', true, 4).zona).toBe(2);
    expect(leerAtajos('?zona=9', true, 4).zona).toBe(3);
    expect(leerAtajos('?zona=-1', true, 4).zona).toBe(0);
  });

  test('combate, vista, fecha y reto', () => {
    const a = leerAtajos(
      '?combate=limo,jabali&vista=10.5,6.5,22&fecha=2026-11-18&reto=pierde',
      true,
      4,
    );
    expect(a.combate).toEqual(['limo', 'jabali']);
    expect(a.vista).toEqual({ x: 10.5, z: 6.5, ancho: 22 });
    expect(a.fecha).toEqual({ anio: 2026, mes: 11, dia: 18 });
    expect(a.reto).toBe('pierde');
    expect(leerAtajos('?reto=otro&fecha=18-11-2026', true, 4)).toMatchObject({
      reto: null,
      fecha: null,
    });
  });

  test('una sala de evento forzada también pone eventos en las zonas', () => {
    expect(leerAtajos('?evento', true, 4)).toMatchObject({ eventos: true, evento: null });
    for (const e of ['desafio', 'ermitano', 'mercader'])
      expect(leerAtajos(`?${e}`, true, 4)).toMatchObject({ eventos: true, evento: e });
  });
});
