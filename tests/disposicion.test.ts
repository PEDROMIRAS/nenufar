import { describe, expect, test } from 'vitest';
import { anchoNombre, disposicionCombate, type DisposicionCombate } from '../src/core/disposicion';
import { partirTexto } from '../src/core/texto';
import type { Rect } from '../src/core/menu';
import { VERTICAL } from '../src/data/datos';

const dentroDe = (r: Rect, ancho: number, alto: number): boolean =>
  r.x >= 0 &&
  r.y >= 0 &&
  r.ancho >= 0 &&
  r.alto >= 0 &&
  r.x + r.ancho <= ancho &&
  r.y + r.alto <= alto;
const seCruzan = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
const piezas = (d: DisposicionCombate): Rect[] => [d.escena, d.lista, d.descripcion, d.ficha];

function compruebaOrdenado(d: DisposicionCombate, ancho: number, alto: number): void {
  for (const r of [...piezas(d), d.panel]) expect(dentroDe(r, ancho, alto)).toBe(true);
  const p = piezas(d);
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) expect(seCruzan(p[i]!, p[j]!)).toBe(false);
}

describe('disposicionCombate', () => {
  test.each([4, 6, 8])('en 320×692 con %i opciones todo cabe, sin pisarse y con escena', (n) => {
    const d = disposicionCombate(320, 692, n, VERTICAL);
    compruebaOrdenado(d, 320, 692);
    expect(d.escena.alto).toBeGreaterThanOrEqual(VERTICAL.escenaMin);
    expect(d.fila).toBeGreaterThanOrEqual(VERTICAL.combate.filaMin);
    expect(d.lista.alto).toBeCloseTo(n * d.fila);
  });

  test('el panel va pegado abajo y la escena arriba hasta el panel', () => {
    const d = disposicionCombate(320, 692, 4, VERTICAL);
    expect(d.escena.y).toBe(0);
    expect(d.escena.alto).toBeCloseTo(d.panel.y);
    expect(d.panel.y + d.panel.alto).toBeCloseTo(692 - VERTICAL.combate.margen);
  });

  test('con 12 opciones en 360×640 la lista no se sale: manda el panel, con filas mínimas', () => {
    const d = disposicionCombate(320, 569, 12, VERTICAL);
    compruebaOrdenado(d, 320, 569);
    expect(d.fila).toBe(VERTICAL.combate.filaMin);
  });

  test('en 360×500 los rectángulos caben aunque la escena quede corta', () => {
    const d = disposicionCombate(320, 444, 4, VERTICAL);
    compruebaOrdenado(d, 320, 444);
    expect(d.escena.alto).toBeGreaterThan(0);
  });

  test('en una tableta (interfaz de 480×640) usa el ancho entero menos los márgenes', () => {
    const d = disposicionCombate(480, 640, 4, VERTICAL);
    compruebaOrdenado(d, 480, 640);
    expect(d.lista.ancho).toBe(480 - 2 * VERTICAL.combate.margen);
    expect(d.escena.alto).toBeGreaterThanOrEqual(VERTICAL.escenaMin);
  });

  test('si se pasa el objeto de salida, se rellena y se devuelve el mismo', () => {
    const fuera = disposicionCombate(320, 692, 4, VERTICAL);
    const otra = disposicionCombate(320, 600, 5, VERTICAL, fuera);
    expect(otra).toBe(fuera);
    expect(fuera.panel.y + fuera.panel.alto).toBeCloseTo(600 - VERTICAL.combate.margen);
  });

  test('con el mismo tamaño sale la misma disposición y al girar el móvil cambia', () => {
    const a = JSON.stringify(disposicionCombate(320, 692, 4, VERTICAL));
    expect(JSON.stringify(disposicionCombate(320, 692, 4, VERTICAL))).toBe(a);
    expect(JSON.stringify(disposicionCombate(320, 569, 4, VERTICAL))).not.toBe(a);
  });
});

describe('anchoNombre', () => {
  test('con 140 de separación (horizontal) caben 18 letras', () => {
    expect(anchoNombre(140)).toBe(18);
  });

  test('con cuatro enemigos en 320 caben 10 letras', () => {
    expect(anchoNombre(320 / 4)).toBe(10);
  });

  test('«Acólito de la luna falsa A» se parte en líneas que caben donde le toca a cada enemigo', () => {
    const letras = anchoNombre(320 / 3);
    const lineas = partirTexto('Acólito de la luna falsa A', letras);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(l.length).toBeLessThanOrEqual(letras);
  });
});
