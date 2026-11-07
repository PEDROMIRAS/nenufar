import { describe, expect, test } from 'vitest';
import {
  anchoNombre,
  botonesAltos,
  celdasBestiario,
  disposicionCombate,
  disposicionPausa,
  filasLista,
  tarjetasAltas,
  type DisposicionCombate,
} from '../src/core/disposicion';
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

describe('menús en vertical', () => {
  const sePisan = (r: Rect[]): boolean =>
    r.some((a, i) => r.slice(i + 1).some((b) => seCruzan(a, b)));

  test('disposicionPausa en 320×569: pestañas arriba, botones abajo y contenido en medio', () => {
    const p = disposicionPausa(320, 569, VERTICAL);
    expect(p.pestanas).toHaveLength(5);
    expect(p.pestanas[0]!.y).toBe(8);
    expect(p.pestanas[0]!.ancho).toBeCloseTo(57.6);
    expect(p.botones).toHaveLength(2);
    for (const b of p.botones) expect(b.y + b.alto).toBe(561);
    const arriba = p.pestanas[0]!.y + p.pestanas[0]!.alto;
    expect(p.contenido.y).toBeGreaterThanOrEqual(arriba);
    expect(p.contenido.y + p.contenido.alto).toBeLessThanOrEqual(p.botones[0]!.y);
    const todo = [...p.pestanas, p.contenido, ...p.botones];
    for (const r of todo) expect(dentroDe(r, 320, 569)).toBe(true);
    expect(sePisan(todo)).toBe(false);
  });

  test('disposicionPausa en una tableta de 480×640 usa todo el ancho menos márgenes', () => {
    const p = disposicionPausa(480, 640, VERTICAL);
    expect(p.contenido.x).toBe(8);
    expect(p.contenido.ancho).toBe(464);
    expect(p.pestanas[0]!.x).toBe(8);
    const ultima = p.pestanas[4]!;
    expect(ultima.x + ultima.ancho).toBeCloseTo(472);
  });

  test('botonesAltos: tres en una fila y más en dos columnas, siempre dentro', () => {
    const tres = botonesAltos(3, 320, 569, VERTICAL);
    expect(new Set(tres.map((b) => b.y)).size).toBe(1);
    expect(tres[2]!.x + tres[2]!.ancho).toBe(312);
    expect(tres[0]!.y + tres[0]!.alto).toBe(561);
    const cinco = botonesAltos(5, 320, 569, VERTICAL);
    expect(new Set(cinco.map((b) => b.x)).size).toBe(2);
    for (const b of cinco) expect(dentroDe(b, 320, 569)).toBe(true);
    expect(sePisan(cinco)).toBe(false);
  });

  test('tarjetasAltas: dos tarjetas a ancho completo entre la cabecera y el pie', () => {
    const t = tarjetasAltas(2, 320, 569, VERTICAL);
    expect(t).toHaveLength(2);
    for (const r of t) {
      expect(r.ancho).toBe(304);
      expect(r.y).toBeGreaterThanOrEqual(40);
      expect(r.y + r.alto).toBeLessThanOrEqual(569 - 24);
      expect(r.alto).toBeLessThanOrEqual(190);
    }
    expect(sePisan(t)).toBe(false);
  });

  test('filasLista: siete filas dentro del hueco, o filaMin si no caben', () => {
    const { filas, alto } = filasLista(7, 70, 500, 320, VERTICAL);
    expect(filas).toHaveLength(7);
    for (const f of filas) {
      expect(f.ancho).toBe(304);
      expect(f.y).toBeGreaterThanOrEqual(70);
      expect(f.y + f.alto).toBeLessThanOrEqual(500);
    }
    expect(alto).toBeCloseTo(7 * filas[0]!.alto);
    const justas = filasLista(7, 70, 120, 320, VERTICAL);
    expect(justas.filas[0]!.alto).toBe(VERTICAL.menu.filaMin);
    expect(justas.filas[6]!.y + justas.filas[6]!.alto).toBeLessThanOrEqual(569);
  });

  test('celdasBestiario: 24 casillas en 6 columnas × 4 filas dentro del ancho', () => {
    const { celdas, alto } = celdasBestiario(24, 320, 56, VERTICAL);
    expect(celdas).toHaveLength(24);
    expect(new Set(celdas.map((c) => c.x)).size).toBe(6);
    expect(new Set(celdas.map((c) => c.y)).size).toBe(4);
    for (const c of celdas) expect(dentroDe(c, 320, 9999)).toBe(true);
    expect(sePisan(celdas)).toBe(false);
    const ultima = celdas[23]!;
    expect(alto).toBeCloseTo(ultima.y + ultima.alto - 56);
  });
});
