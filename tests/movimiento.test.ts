import { describe, expect, test } from 'vitest';
import { buscarInicio, colisiona, moverCuerpo, type Cuerpo } from '../src/core/movimiento';

const T = 32;
const rejilla = (mapa: string[]) => ({
  ancho: mapa[0]?.length ?? 0,
  alto: mapa.length,
  solido: mapa
    .join('')
    .split('')
    .map((ch) => ch === '#'),
});
const cuerpo = (x: number, y: number): Cuerpo => ({ x, y, ancho: 14, alto: 8 });
/** Repite pasos pequeños, como el bucle real a 60 Hz. */
const andar = (c: Cuerpo, r: ReturnType<typeof rejilla>, dx: number, dy: number, pasos = 120) => {
  for (let i = 0; i < pasos; i++) moverCuerpo(c, dx, dy, r, T, 8);
};

const SALA = ['#####', '#...#', '#...#', '#...#', '#####'];

describe('moverCuerpo', () => {
  test('se para justo contra el muro, sin atravesarlo ni quedarse lejos', () => {
    const c = cuerpo(80, 80);
    andar(c, rejilla(SALA), 1.6, 0);
    expect(c.x + c.ancho / 2).toBe(4 * T);
    andar(c, rejilla(SALA), 0, -1.6);
    expect(c.y - c.alto).toBe(T);
  });

  test('en diagonal contra un muro se desliza por el otro eje', () => {
    const c = cuerpo(4 * T - 7, 80);
    moverCuerpo(c, 1.1, 1.1, rejilla(SALA), T, 8);
    expect(c.x).toBe(4 * T - 7);
    expect(c.y).toBeCloseTo(81.1);
  });

  test('no se engancha en la esquina de un hueco de un tile', () => {
    // Puerta en la columna 2 de la fila 2; la caja asoma 5 px sobre el muro de la izquierda.
    const r = rejilla(['#.#.#', '#...#', '##.##', '#...#', '#####']);
    const c = cuerpo(2 * T + 7 - 5, 3 * T + 20);
    andar(c, r, 0, -1.6);
    expect(c.y).toBeLessThan(2 * T);
  });

  test('fuera del mapa cuenta como muro', () => {
    const c = cuerpo(20, 20);
    andar(c, rejilla(['...', '...']), -1.6, -1.6);
    expect(c.x - c.ancho / 2).toBe(0);
    expect(c.y - c.alto).toBe(0);
  });

  test('un empujón de esquina no se aplica si el hueco está más lejos que el margen', () => {
    const r = rejilla(['#.#.#', '#...#', '##.##', '#...#', '#####']);
    const c = cuerpo(T + 16, 3 * T + 20); // centrada bajo el muro, a 32 px del hueco
    andar(c, r, 0, -1.6);
    expect(c.x).toBe(T + 16);
    expect(c.y - c.alto).toBe(3 * T);
  });
});

describe('buscarInicio', () => {
  test('elige el hueco libre más cercano al centro', () => {
    const r = rejilla(['#####', '#.#.#', '#####']);
    const inicio = buscarInicio(r, T, 14, 8);
    expect(colisiona(r, T, inicio.x, inicio.y, 14, 8)).toBe(false);
    expect([inicio.x, inicio.y]).toEqual([T + 16, T + 20]);
  });
});

describe('objetos con base', () => {
  // Sala de 5×5 con una roca en el centro (2, 2) que solo choca en su base [4, 19, 28, 31).
  const r = { ...rejilla(SALA), cajas: [] as ([number, number, number, number] | null)[] };
  r.solido[2 * 5 + 2] = true;
  r.cajas[2 * 5 + 2] = [4, 19, 28, 31];

  test('desde arriba se llega hasta su base, sin pared invisible en lo alto de la casilla', () => {
    const c = cuerpo(2 * T + 16, T + 20);
    andar(c, r, 0, 1.6);
    expect(c.y).toBe(2 * T + 19);
  });

  test('de lado se queda pegada a la base, no al borde de la casilla', () => {
    const c = cuerpo(T + 10, 2 * T + 30); // de frente: demasiado solapada para que la ayuda de esquinas la desvíe
    andar(c, r, 1.6, 0);
    expect(c.x + c.ancho / 2).toBe(2 * T + 4);
  });

  test('por detrás, a la altura de lo alto de la roca, se pasa sin chocar', () => {
    expect(colisiona(r, T, 2 * T + 16, 2 * T + 12, 14, 8)).toBe(false);
  });
});
