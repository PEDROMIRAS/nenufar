import { describe, expect, test } from 'vitest';
import {
  anchoNombre,
  botonesAltos,
  botonesAltosCacheados,
  celdasBestiario,
  disposicionCombate,
  disposicionEquipo,
  disposicionAjustes,
  disposicionPausa,
  disposicionPausaCacheada,
  filasLista,
  pestanasExtras,
  seccionTocadaAlta,
  letrasEnAncho,
  tarjetaTocada,
  toquePuntos,
  toqueEquipo,
  tarjetasAltas,
  type DisposicionCombate,
} from '../src/core/disposicion';
import { partirTexto } from '../src/core/texto';
import type { Rect } from '../src/core/menu';
import { MONSTRUOS, VERTICAL } from '../src/data/datos';

const dentroDe = (r: Rect, ancho: number, alto: number): boolean =>
  r.x >= 0 &&
  r.y >= 0 &&
  r.ancho >= 0 &&
  r.alto >= 0 &&
  r.x + r.ancho <= ancho &&
  r.y + r.alto <= alto;
const seCruzan = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;
const sePisan = (r: Rect[]): boolean =>
  r.some((a, i) => r.slice(i + 1).some((b) => seCruzan(a, b)));
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

  test('en una tableta (interfaz de 480×640) las dos columnas llenan el ancho entre márgenes', () => {
    const d = disposicionCombate(480, 640, 4, VERTICAL);
    compruebaOrdenado(d, 480, 640);
    expect(d.lista.ancho + d.descripcion.ancho).toBe(480 - 2 * VERTICAL.combate.margen);
    expect(d.escena.alto).toBeGreaterThanOrEqual(VERTICAL.escenaMin);
  });

  test('lista y registro ocupan la misma columna izquierda; descripción y ficha, la derecha', () => {
    const d = disposicionCombate(320, 692, 5, VERTICAL);
    expect(d.registro).toEqual(d.lista);
    expect(d.descripcion.x).toBeCloseTo(d.lista.x + d.lista.ancho);
    expect(d.ficha.x).toBe(d.descripcion.x);
    expect(d.ficha.y).toBeCloseTo(d.descripcion.y + d.descripcion.alto);
    expect(d.ficha.alto).toBe(VERTICAL.combate.alturaFicha);
  });

  test('con las filas reservadas el panel es bajo: la escena se queda con más de dos tercios', () => {
    const d = disposicionCombate(320, 692, VERTICAL.combate.filas, VERTICAL);
    expect(d.escena.alto).toBeGreaterThan(692 * 0.66);
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

describe('botonesAltosCacheados', () => {
  test('la misma lista mientras no cambian n, ancho ni alto, y nueva cuando cambian', () => {
    const a = botonesAltosCacheados(3, 320, 569, VERTICAL);
    expect(botonesAltosCacheados(3, 320, 569, VERTICAL)).toBe(a);
    expect(botonesAltosCacheados(3, 320, 640, VERTICAL)).not.toBe(a);
    expect(botonesAltosCacheados(4, 320, 640, VERTICAL)).toHaveLength(4);
  });

  test('el centro de cada botón de 3 cae solo en ese botón', () => {
    const b = botonesAltosCacheados(3, 320, 569, VERTICAL);
    const en = (x: number, y: number): number =>
      b.findIndex((r) => x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto);
    b.forEach((r, i) => expect(en(r.x + r.ancho / 2, r.y + r.alto / 2)).toBe(i));
  });
});

describe('pausa en vertical: toque y ajustes', () => {
  const centro = (r: Rect): [number, number] => [r.x + r.ancho / 2, r.y + r.alto / 2];

  test('seccionTocadaAlta: pestañas 0 a 4, Seguir 5, Salir 6 y el contenido -1', () => {
    const p = disposicionPausa(320, 569, VERTICAL);
    p.pestanas.forEach((r, i) => expect(seccionTocadaAlta(...centro(r), p)).toBe(i));
    expect(seccionTocadaAlta(...centro(p.botones[0]!), p)).toBe(5);
    expect(seccionTocadaAlta(...centro(p.botones[1]!), p)).toBe(6);
    expect(seccionTocadaAlta(...centro(p.contenido), p)).toBe(-1);
  });

  test('disposicionPausaCacheada da la misma disposición mientras no cambia el tamaño', () => {
    const a = disposicionPausaCacheada(320, 569, VERTICAL);
    expect(disposicionPausaCacheada(320, 569, VERTICAL)).toBe(a);
    expect(disposicionPausaCacheada(320, 692, VERTICAL)).not.toBe(a);
  });

  test('disposicionAjustes: sonido, calidad y dos deslizadores uno bajo otro dentro del contenido', () => {
    const c = disposicionPausa(320, 569, VERTICAL).contenido;
    const a = disposicionAjustes(c, VERTICAL);
    const cuatro = [a.sonido, a.calidad, a.musica, a.efectos];
    for (const r of cuatro) {
      expect(r.x).toBeGreaterThanOrEqual(c.x);
      expect(r.x + r.ancho).toBeLessThanOrEqual(c.x + c.ancho);
      expect(r.y).toBeGreaterThanOrEqual(c.y);
    }
    expect(sePisan(cuatro)).toBe(false);
    expect(a.musica.ancho).toBe(a.efectos.ancho);
    expect(a.controlesY).toBeGreaterThan(a.efectos.y + a.efectos.alto);
    expect(a.sonido.alto).toBeGreaterThanOrEqual(40);
  });
});

describe('elegir rana y dificultad en vertical', () => {
  test('tarjetaTocada: el centro de cada tarjeta da su índice y fuera de ellas -1', () => {
    const t = tarjetasAltas(2, 320, 569, VERTICAL);
    t.forEach((r, i) => expect(tarjetaTocada(r.x + r.ancho / 2, r.y + r.alto / 2, t)).toBe(i));
    expect(tarjetaTocada(2, 2, t)).toBe(-1);
    expect(tarjetaTocada(160, t[0]!.y + t[0]!.alto + 2, t)).toBe(-1);
  });

  test('letrasEnAncho: letras de la fuente normal que caben en un ancho', () => {
    expect(letrasEnAncho(72)).toBe(10);
    expect(letrasEnAncho(272)).toBe(37);
    expect(letrasEnAncho(0)).toBe(0);
  });
});

describe('toquePuntos', () => {
  const horizontal = Array.from({ length: 7 }, (_, i) => ({
    x: 16,
    y: 70 + i * 30,
    ancho: 448,
    alto: 26,
  }));
  const signoH = { menos: 300, mas: 404, ancho: 44 };
  const vertical = filasLista(7, 94, 505, 320, VERTICAL).filas;
  const ancho = vertical[0]!.ancho;
  const signoV = { menos: ancho - 6 - 44 - 50, mas: ancho - 6 - 44, ancho: 44 };

  test('en vertical el centro de − y + de cada fila da su fila y su signo', () => {
    vertical.forEach((f, i) => {
      const y = f.y + f.alto / 2;
      expect(toquePuntos(f.x + signoV.menos + 22, y, vertical, signoV)).toEqual({
        fila: i,
        signo: -1,
      });
      expect(toquePuntos(f.x + signoV.mas + 22, y, vertical, signoV)).toEqual({
        fila: i,
        signo: 1,
      });
      expect(toquePuntos(f.x + 20, y, vertical, signoV)).toEqual({ fila: i, signo: 0 });
    });
  });

  test('en vertical − y + no se pisan aunque estén juntos', () => {
    const f = vertical[0]!;
    const y = f.y + f.alto / 2;
    const entre = f.x + signoV.menos + signoV.ancho + 3;
    const { signo } = toquePuntos(entre, y, vertical, signoV);
    expect([-1, 1]).toContain(signo);
    expect(toquePuntos(f.x + signoV.menos + 10, y, vertical, signoV).signo).toBe(-1);
    expect(toquePuntos(f.x + signoV.mas + 10, y, vertical, signoV).signo).toBe(1);
  });

  test('en horizontal se comporta como siempre (holgura de 22 alrededor de − y +)', () => {
    const f = horizontal[2]!;
    const y = f.y + 13;
    expect(toquePuntos(f.x + 280, y, horizontal, signoH)).toEqual({ fila: 2, signo: -1 });
    expect(toquePuntos(f.x + 366, y, horizontal, signoH)).toEqual({ fila: 2, signo: 0 });
    expect(toquePuntos(f.x + 384, y, horizontal, signoH)).toEqual({ fila: 2, signo: 1 });
    expect(toquePuntos(f.x + 50, y - 20, horizontal, signoH).fila).toBe(1);
    expect(toquePuntos(f.x + 50, 20, horizontal, signoH).fila).toBe(-1);
  });
});

describe('equipo en vertical', () => {
  test('toqueEquipo: los extremos de cada fila ciclan −1 y +1 y el centro solo elige', () => {
    const { filas } = disposicionEquipo(320, 569, VERTICAL);
    expect(filas).toHaveLength(2);
    filas.forEach((f, i) => {
      const y = f.y + f.alto / 2;
      expect(toqueEquipo(f.x + 22, y, filas, 44)).toEqual({ fila: i, dir: -1 });
      expect(toqueEquipo(f.x + f.ancho - 22, y, filas, 44)).toEqual({ fila: i, dir: 1 });
      expect(toqueEquipo(f.x + f.ancho / 2, y, filas, 44)).toEqual({ fila: i, dir: 0 });
    });
    expect(toqueEquipo(160, 5, filas, 44)).toEqual({ fila: -1, dir: 0 });
  });

  test.each([569, 640, 692])(
    'disposicionEquipo en 320×%i cabe sin pisarse y sobre los botones',
    (alto) => {
      const d = disposicionEquipo(320, alto, VERTICAL);
      const botones = botonesAltos(2, 320, alto, VERTICAL);
      const piezas = [d.rana, ...d.filas, d.estadisticas];
      for (const r of piezas) expect(dentroDe(r, 320, alto)).toBe(true);
      expect(sePisan(piezas)).toBe(false);
      // Debajo de cada fila cabe su efecto (dos líneas) antes de lo siguiente.
      const ultima = piezas[piezas.length - 1]!;
      expect(ultima.y + ultima.alto).toBeLessThanOrEqual(botones[0]!.y);
      expect(d.filas[1]!.y).toBeGreaterThanOrEqual(d.filas[0]!.y + d.filas[0]!.alto + 26);
      expect(d.estadisticas.y).toBeGreaterThanOrEqual(d.filas[1]!.y + d.filas[1]!.alto + 26);
    },
  );
});

describe('bestiario y logros en vertical', () => {
  test('cada una de las 24 casillas se toca por su centro y cabe en el ancho', () => {
    const { celdas } = celdasBestiario(24, 320, 76, VERTICAL);
    celdas.forEach((c, i) => {
      expect(dentroDe(c, 320, 9999)).toBe(true);
      expect(tarjetaTocada(c.x + c.ancho / 2, c.y + c.alto / 2, celdas)).toBe(i);
    });
  });

  test('pestanasExtras: dos pestañas iguales dentro del ancho y sin pisarse', () => {
    for (const ancho of [320, 480]) {
      const p = pestanasExtras(ancho, VERTICAL);
      expect(p).toHaveLength(2);
      for (const r of p) expect(dentroDe(r, ancho, 9999)).toBe(true);
      expect(p[0]!.ancho).toBe(p[1]!.ancho);
      expect(sePisan(p)).toBe(false);
    }
  });
});

describe('nombres de jefe en la presentación vertical', () => {
  const letras = letrasEnAncho(320 - 2 * VERTICAL.menu.margen, VERTICAL.menu.letraTitulo);

  test('el nombre más largo de los monstruos, partido, cabe en el ancho con la fuente del título', () => {
    const nombres = Object.values(MONSTRUOS).map((m) => m.nombre.split(',')[0]!.trim());
    expect(nombres).toContain('Sacerdote de la luna falsa');
    for (const n of nombres) {
      const lineas = partirTexto(n, letras);
      for (const l of lineas) expect(l.length * VERTICAL.menu.letraTitulo).toBeLessThanOrEqual(320);
    }
    expect(partirTexto('Sacerdote de la luna falsa', letras)).toEqual([
      'Sacerdote de la',
      'luna falsa',
    ]);
  });

  test('letrasEnAncho admite el ancho de letra de otra fuente', () => {
    expect(letrasEnAncho(288, 14.4)).toBe(20);
    expect(letrasEnAncho(288)).toBe(40);
  });
});
