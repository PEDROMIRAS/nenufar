import { describe, expect, test } from 'vitest';
import {
  apuntarMensaje,
  crearMensajes,
  mensajesQueCaben,
  opacidadMensaje,
} from '../src/core/mensajes';

const R = { cuantos: 3, duran: 4, apagar: 0.6, tenues: [1, 0.65, 0.35] };

describe('mensajes del combate', () => {
  test('guarda como mucho 3, el más nuevo al final', () => {
    const m = crearMensajes();
    for (const [i, t] of ['a', 'b', 'c', 'd'].entries()) apuntarMensaje(m, t, i, R.cuantos);
    expect(m.textos).toEqual(['b', 'c', 'd']);
    expect(m.desde).toEqual([1, 2, 3]);
  });

  test('el nuevo claro y los anteriores más tenues', () => {
    const m = crearMensajes();
    for (const [i, t] of ['a', 'b', 'c'].entries()) apuntarMensaje(m, t, i, R.cuantos);
    expect([0, 1, 2].map((i) => opacidadMensaje(m, i, 2, R))).toEqual([0.35, 0.65, 1]);
  });

  test('se apagan a los duran segundos del último', () => {
    const m = crearMensajes();
    apuntarMensaje(m, 'a', 0, R.cuantos);
    expect(opacidadMensaje(m, 0, R.duran + R.apagar / 2, R)).toBeCloseTo(0.5);
    expect(opacidadMensaje(m, 0, R.duran + R.apagar, R)).toBeCloseTo(0);
  });

  test('uno nuevo los vuelve a encender', () => {
    const m = crearMensajes();
    apuntarMensaje(m, 'a', 0, R.cuantos);
    expect(opacidadMensaje(m, 0, 10, R)).toBe(0);
    apuntarMensaje(m, 'b', 10, R.cuantos);
    expect(opacidadMensaje(m, 1, 10, R)).toBe(1);
    expect(opacidadMensaje(m, 0, 10, R)).toBe(0.65);
  });
});

describe('mensajesQueCaben', () => {
  test('solo mensajes enteros: si el anterior no cabe entero, no sale por la cola', () => {
    // Tres mensajes de 1, 2 y 2 líneas en 3 líneas: cabe el último (2) y del anterior (2) nada.
    expect(mensajesQueCaben([1, 2, 2], 3)).toBe(2);
    expect(mensajesQueCaben([1, 1, 1], 3)).toBe(0);
    expect(mensajesQueCaben([1, 2, 1], 3)).toBe(1);
  });

  test('el último siempre sale, aunque ocupe más que la banda', () => {
    expect(mensajesQueCaben([1, 4], 3)).toBe(1);
  });
});
