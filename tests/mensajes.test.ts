import { describe, expect, test } from 'vitest';
import {
  apuntarMensaje,
  crearMensajes,
  mensajesQueCaben,
  opacidadMensaje,
} from '../src/core/mensajes';
import {
  describirAcciones,
  describirConsumible,
  describirEstado,
  describirHabilidad,
} from '../src/core/descripciones';
import { letrasEnAncho } from '../src/core/disposicion';
import { partirTexto } from '../src/core/texto';
import ritmo from '../src/data/ritmo.json';
import { HEROES, MENU_COMBATE, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';

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

  test('quietos (con tu menú abierto) no se apagan', () => {
    const m = crearMensajes();
    apuntarMensaje(m, 'a', 0, R.cuantos);
    expect(opacidadMensaje(m, 0, 60, R, 1, true)).toBe(1);
  });

  test('el más tenue de los datos se sigue leyendo (al menos 0,55 de opacidad)', () => {
    expect(Math.min(...ritmo.mensajes.tenues)).toBeGreaterThanOrEqual(0.55);
  });

  test('con los últimos ocultos (avisos), los que se ven cuentan desde el último visible', () => {
    const m = crearMensajes();
    apuntarMensaje(m, 'a', 0, R.cuantos);
    apuntarMensaje(m, 'aviso 1', 10, R.cuantos);
    apuntarMensaje(m, 'aviso 2', 10, R.cuantos);
    // Solo se ve «a» (fin = 1): sale claro y su reloj es el suyo, no el de los avisos.
    expect(opacidadMensaje(m, 0, 1, R, 1)).toBe(1);
    expect(opacidadMensaje(m, 0, 10, R, 1)).toBe(0);
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

describe('mensajes largos en la banda de arriba', () => {
  /** Todos los textos `aviso` de un monstruo (golpe cargado, invocación, transformación), estén donde estén. */
  const avisos = (o: unknown): string[] =>
    typeof o !== 'object' || o === null
      ? []
      : Object.entries(o).flatMap(([k, v]) =>
          k === 'aviso' && typeof v === 'string' ? [v] : avisos(v),
        );
  const largo = (nombres: string[]): string =>
    nombres.reduce((a, b) => (b.length > a.length ? b : a));

  test('los más largos caben enteros en 3 líneas en el móvil de pie más estrecho', () => {
    const monstruos = Object.values(MONSTRUOS);
    const monstruo = largo(monstruos.map((m) => m.nombre));
    const heroina = largo(Object.values(HEROES).map((h) => h.nombre));
    const estados = Object.values(REGLAS.estados);
    const textos = [
      `${monstruo} descarga su golpe sobre ${heroina}: 999 ¡crítico!`,
      `${heroina} descarga su golpe sobre ${monstruo}: 999 ¡crítico!`,
      ...monstruos.flatMap((m) => avisos(m).map((a) => `${m.nombre} ${a}`)),
      ...estados.map((e) => describirEstado(e)),
      ...estados.map((e) => `Se acaba ${e.nombre} en ${monstruo}`),
      ...estados.map((e) => `${monstruo} pierde 999 PV por ${e.nombre}`),
    ];
    // La banda va de margen a margen de la interfaz alta más estrecha (320).
    const letras = letrasEnAncho(320 - 2 * MENU_COMBATE.margen);
    for (const t of textos)
      expect(partirTexto(t, letras).length, t).toBeLessThanOrEqual(MENU_COMBATE.mensajes);
  });
});

describe('explicación de lo elegido', () => {
  test('cabe entera en la franja de abajo del móvil de pie más estrecho', () => {
    const textos: string[] = [];
    for (const h of Object.values(HEROES)) {
      textos.push(...describirAcciones(REGLAS, h));
      for (const hab of h.habilidades) textos.push(describirHabilidad(hab, REGLAS.estados));
    }
    for (const c of Object.values(OBJETOS.consumibles))
      textos.push(describirConsumible(c, REGLAS.estados));
    // La franja va de margen a margen de 320, con 10 de aire a cada lado y líneas de 14 (`dibujarExplicacion`).
    const letras = letrasEnAncho(320 - 2 * MENU_COMBATE.margen - 20);
    const lineas = Math.floor((MENU_COMBATE.vertical.explicacion - 8) / 14);
    for (const t of textos) expect(partirTexto(t, letras).length, t).toBeLessThanOrEqual(lineas);
  });
});
