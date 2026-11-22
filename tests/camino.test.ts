import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { DIRECTO, haciaDonde, SIN_CAMINO } from '../src/core/camino';
import { seTocan } from '../src/core/monstruos';
import { actualizarPatrulla, crearPatrulla } from '../src/core/patrulla';

const T = 32;
const ANCHO = 15;
const ALTO = 11;
/** Sala de 15×11 con muros en las casillas «#» de `dibujo` (una cadena por fila; lo que falte, libre). */
function sala(dibujo: string[] = []) {
  const solido = new Array<boolean>(ANCHO * ALTO).fill(false);
  dibujo.forEach((fila, f) => [...fila].forEach((ch, c) => (solido[f * ANCHO + c] = ch === '#')));
  return { ancho: ANCHO, alto: ALTO, solido };
}
/** Pies de un monstruo de 20×12 centrado en la casilla (c, f). */
const pies = (c: number, f: number) => ({ x: c * T + T / 2, y: f * T + (T + 12) / 2 });
const cuerpo = (c: number, f: number) => ({ ...pies(c, f), ancho: 20, alto: 12 });
// Visión de sobra para no perderla al rodear: aquí solo cuenta el camino.
const mov = { velocidad: 30, persecucion: 60, vision: 600, patrulla: 48 };

// Un muro vertical en la columna 7 de arriba abajo, con un hueco en la fila 9.
const MURO = Array.from({ length: ALTO }, (_, f) => (f === 9 ? '' : '       #'));

describe('camino', () => {
  test('sin nada en medio va directo a ella', () => {
    const h = pies(11, 4);
    expect(haciaDonde(sala(), T, cuerpo(3, 4), h.x, h.y)).toBe(DIRECTO);
  });

  test('con un muro en medio va hacia el hueco, no hacia ella', () => {
    const h = pies(11, 4);
    const r = haciaDonde(sala(MURO), T, cuerpo(3, 4), h.x, h.y);
    expect(r).toBeGreaterThanOrEqual(0);
    // Una casilla de su lado del muro, bajando hacia el hueco.
    expect(r % ANCHO).toBeLessThanOrEqual(7);
    expect(Math.floor(r / ANCHO)).toBeGreaterThan(4);
  });

  test('si no hay camino por las casillas, lo dice', () => {
    // Ella encerrada en un cuadro de muros.
    const cerrada = ['', '', '', '         ###', '         # #', '         ###'];
    const h = pies(10, 4);
    expect(haciaDonde(sala(cerrada), T, cuerpo(3, 4), h.x, h.y)).toBe(SIN_CAMINO);
  });

  test('persiguiéndola, rodea el muro y la alcanza (en línea recta se quedaba pegado)', () => {
    const r = sala(MURO);
    const h = { ...pies(11, 4), ancho: 16, alto: 12 };
    const p = crearPatrulla(cuerpo(3, 4));
    p.persiguiendo = true;
    let alcanzada = false;
    const azar = crearAzar(1);
    for (let t = 0; t < 20 && !alcanzada; t += 1 / 60) {
      actualizarPatrulla(p, mov, h.x, h.y, 1 / 60, r, T, azar);
      alcanzada = seTocan(h, p.cuerpo);
    }
    expect(alcanzada).toBe(true);
  });
});
