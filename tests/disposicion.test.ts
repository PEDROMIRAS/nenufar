import { describe, expect, test } from 'vitest';
import {
  disposicionHabilidades,
  anchoNombre,
  cabeceraQueCabe,
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
  primeraTrasToque,
  primeraVisible,
  topeCartelCombate,
  ladoFlecha,
  yNumeroDanio,
  zonasDestello,
  type DisposicionCombate,
} from '../src/core/disposicion';
import { partirTexto } from '../src/core/texto';
import type { Rect } from '../src/core/menu';
import { MENU_COMBATE, MONSTRUOS, VERTICAL } from '../src/data/datos';

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

describe('disposicionCombate', () => {
  const D = MENU_COMBATE;
  const piezas = (d: DisposicionCombate): Rect[] => [d.mensajes, d.lista, d.ficha, d.explicacion];
  const tamanos: [number, number, boolean][] = [
    [480, 352, false],
    [320, 569, true],
    [320, 692, true],
    [480, 640, true],
  ];

  test.each(tamanos)('%ix%i: nada se pisa ni se sale con 1 a 7 opciones', (ancho, alto, alta) => {
    for (let n = 1; n <= 7; n++) {
      const d = disposicionCombate(ancho, alto, n, alta, D);
      // En horizontal la explicación va en la banda de los mensajes (nunca a la vez): no cuenta como otra pieza.
      const p = alta ? piezas(d) : [d.mensajes, d.lista, d.ficha];
      for (const r of p) expect(dentroDe(r, ancho, alto), `n=${n}`).toBe(true);
      for (let a = 0; a < p.length; a++)
        for (let b = a + 1; b < p.length; b++) expect(seCruzan(p[a]!, p[b]!), `n=${n}`).toBe(false);
    }
  });

  test.each(tamanos)('%ix%i: la lista nunca sube sobre lo de los enemigos', (ancho, alto, alta) => {
    for (let n = 1; n <= 7; n++) {
      const d = disposicionCombate(ancho, alto, n, alta, D);
      expect(d.lista.y).toBeGreaterThanOrEqual(d.enemigoY + D.bajoEnemigo);
    }
  });

  test.each(tamanos)(
    '%ix%i: el nombre de un jefe alto queda bajo los mensajes',
    (ancho, alto, alta) => {
      const d = disposicionCombate(ancho, alto, 4, alta, D);
      expect(d.enemigoY - D.altoMaxEnemigo - D.nombre).toBeGreaterThanOrEqual(
        d.mensajes.y + d.mensajes.alto,
      );
    },
  );

  test('en horizontal caben 6 opciones sin desplazar, con filas de dedo', () => {
    const d = disposicionCombate(480, 352, 6, false, D);
    expect(d.visibles).toBe(6);
    expect(d.fila).toBeGreaterThanOrEqual(18);
  });

  test('en un móvil tumbado (844×390), el menú de acción tiene filas de al menos 24 px de pantalla', () => {
    const d = disposicionCombate(480, 352, 5, false, D);
    const escala = Math.min(844 / 480, 390 / 352);
    expect(d.visibles).toBe(5);
    expect(d.fila * escala).toBeGreaterThanOrEqual(24);
  });

  test('en horizontal la explicación va arriba, en la banda de los mensajes', () => {
    const d = disposicionCombate(480, 352, 5, false, D);
    expect(d.explicacion).toEqual(d.mensajes);
  });

  test('con 7 opciones en 320×569 las filas no bajan de filaMin y las que no caben se desplazan', () => {
    const d = disposicionCombate(320, 569, 7, true, D);
    expect(d.fila).toBeGreaterThanOrEqual(D.vertical.filaMin);
    expect(d.visibles).toBeLessThanOrEqual(7);
    expect(d.visibles * d.fila).toBeLessThanOrEqual(d.lista.alto);
  });

  test('en vertical las filas son de dedo', () => {
    expect(disposicionCombate(320, 692, 5, true, D).fila).toBe(D.vertical.fila);
  });

  test('la lista va a la derecha de la heroína y la heroína pisa el borde de abajo de la lista', () => {
    const d = disposicionCombate(480, 352, 5, false, D);
    expect(d.lista.x).toBeGreaterThan(d.heroina.x);
    expect(d.heroina.y).toBe(d.lista.y + d.lista.alto);
  });

  test('en un móvil pequeño de pie (320×468) cabe el menú de acción entero', () => {
    expect(disposicionCombate(320, 468, 5, true, D).visibles).toBe(5);
  });

  test('en horizontal la lista es ancha: «Tajo de llama morada» y su coste no se pisan', () => {
    const d = disposicionCombate(480, 352, 5, false, D);
    // Nombre desde x+16 a 7,35 por letra; coste («12 PM», 5 letras) pegado a la derecha con 8 de margen.
    expect(16 + 20 * 7.35).toBeLessThanOrEqual(d.lista.ancho - 8 - 5 * 7.35);
  });

  test('tocar la última fila a la vista desplaza una hacia abajo; la primera, una hacia arriba', () => {
    // 7 opciones, 5 a la vista desde la 0: tocar la 4 (última visible) deja ver la 5.
    expect(primeraTrasToque(4, 0, 5, 7)).toBe(1);
    // Desde la 2, tocar la 2 (primera visible) deja ver la 1.
    expect(primeraTrasToque(2, 2, 5, 7)).toBe(1);
    // En los extremos no se pasa: la 6 es la última opción, la 0 la primera.
    expect(primeraTrasToque(6, 2, 5, 7)).toBe(2);
    expect(primeraTrasToque(0, 0, 5, 7)).toBe(0);
    // Si caben todas, nada.
    expect(primeraTrasToque(4, 0, 7, 7)).toBe(0);
  });

  test.each(tamanos)(
    '%ix%i: el cartel del mando no tapa la lista ni la ficha',
    (ancho, alto, alta) => {
      for (let n = 1; n <= 7; n++) {
        const d = disposicionCombate(ancho, alto, n, alta, D);
        const pestana = d.lista.y - D.rellenoLista - D.tituloLista;
        expect(topeCartelCombate(d, true, D), `n=${n}`).toBeLessThanOrEqual(pestana);
        expect(topeCartelCombate(d, false, D)).toBeLessThanOrEqual(d.ficha.y);
      }
    },
  );

  test.each(tamanos)('%ix%i: el destello cubre todo menos la ficha', (ancho, alto, alta) => {
    const d = disposicionCombate(ancho, alto, 5, alta, D);
    // El área de la ventana puede salirse de la interfaz (bandas a los lados o arriba y abajo).
    const area = { x: -20, y: -10, ancho: ancho + 40, alto: alto + 20 };
    const zonas = zonasDestello(d, area);
    for (const z of zonas) expect(seCruzan(z, d.ficha)).toBe(false);
    expect(sePisan(zonas)).toBe(false);
    const cubierto = zonas.reduce((s, z) => s + z.ancho * z.alto, 0);
    expect(cubierto).toBe(area.ancho * area.alto - d.ficha.ancho * d.ficha.alto);
  });

  test('el número de daño sube desde donde toca y, si no hay sitio, empieza más abajo sin pasar del techo', () => {
    // Con sitio: sale en `inicio` y sube lo que le toque.
    expect(yNumeroDanio(200, 100, 0, 18)).toBe(200);
    expect(yNumeroDanio(200, 100, 18, 18)).toBe(182);
    // Sin sitio (un jefe alto: el techo, bajo su nombre, está más abajo que el inicio): empieza bajado y acaba
    // justo en el techo.
    expect(yNumeroDanio(90, 120, 0, 18)).toBe(138);
    expect(yNumeroDanio(90, 120, 18, 18)).toBe(120);
  });

  test('la flecha del objetivo va a la izquierda del nombre si cabe, si no a la derecha, y si no en ninguno', () => {
    // Nombre centrado en 100 de 40 de mitad (60 a 140); la flecha pide 14.
    expect(ladoFlecha(100, 40, 0, 300, 14)).toBe(-1);
    // A la izquierda solo quedan 10 (otro nombre acaba en 50): a la derecha.
    expect(ladoFlecha(100, 40, 50, 300, 14)).toBe(1);
    // Ni a un lado ni al otro (el caso del Sacerdote entre sus acólitos en el móvil de pie).
    expect(ladoFlecha(100, 40, 50, 150, 14)).toBe(0);
  });

  test('primeraVisible deja la elegida a la vista desplazando lo justo', () => {
    expect(primeraVisible(0, 0, 5, 7)).toBe(0);
    expect(primeraVisible(6, 0, 5, 7)).toBe(2);
    expect(primeraVisible(1, 2, 5, 7)).toBe(1);
    expect(primeraVisible(3, 0, 7, 7)).toBe(0);
  });
});

describe('cabeceraQueCabe', () => {
  const larga = 'Cauce Seco · Fuente seca · Nv 12';
  const corta = 'Cauce Seco · Nv 12';
  test('con sitio, la larga (con el presagio)', () => {
    expect(cabeceraQueCabe(larga, corta, 40)).toBe(larga);
  });
  test('si no cabe antes del minimapa, la corta (el presagio sigue en la pausa)', () => {
    expect(cabeceraQueCabe(larga, corta, 30)).toBe(corta);
    // Ni la corta cabe: se queda la corta igualmente (nunca se pierde el nivel).
    expect(cabeceraQueCabe(larga, corta, 10)).toBe(corta);
  });
});

describe('anchoNombre', () => {
  test('con 140 de separación (horizontal) caben 17 letras', () => {
    expect(anchoNombre(140)).toBe(17);
  });

  test('con cuatro enemigos en 320 caben 9 letras', () => {
    expect(anchoNombre(320 / 4)).toBe(9);
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

  test('disposicionAjustes: sonido, calidad, reto y los deslizadores uno bajo otro dentro del contenido', () => {
    const c = disposicionPausa(320, 569, VERTICAL).contenido;
    const a = disposicionAjustes(c, VERTICAL);
    const cuatro = [a.sonido, a.calidad, a.reto, a.musica, a.efectos, a.temblor];
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

  test('disposicionAjustes: el deslizador de temblor va bajo el de efectos, antes de los controles', () => {
    const c = disposicionPausa(320, 569, VERTICAL).contenido;
    const a = disposicionAjustes(c, VERTICAL);
    expect(a.temblor.ancho).toBe(a.efectos.ancho);
    expect(a.temblor.y).toBeGreaterThan(a.efectos.y + a.efectos.alto);
    expect(a.controlesY).toBeGreaterThan(a.temblor.y + a.temblor.alto);
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
    expect(letrasEnAncho(73.5)).toBe(10);
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
    expect(letrasEnAncho(288)).toBe(39);
  });
});

describe('pantalla Habilidades', () => {
  const dentroDe = (a: Rect, ancho: number, alto: number) =>
    a.x >= 0 && a.y >= 0 && a.x + a.ancho <= ancho && a.y + a.alto <= alto;
  const seSolapan = (a: Rect, b: Rect) =>
    a.x < b.x + b.ancho && b.x < a.x + a.ancho && a.y < b.y + b.alto && b.y < a.y + a.alto;

  test('en horizontal caben las 10 filas y la explicación va a la derecha', () => {
    const d = disposicionHabilidades(480, 352, 10, false, 64, VERTICAL);
    expect(d.visibles).toBe(10);
    expect(dentroDe(d.lista, 480, 352 - 16)).toBe(true);
    expect(d.detalle.x).toBeGreaterThanOrEqual(d.lista.x + d.lista.ancho);
    expect(dentroDe(d.detalle, 480, 352)).toBe(true);
  });

  test('en vertical la explicación va debajo de la lista, sin pisarla', () => {
    const d = disposicionHabilidades(320, 600, 10, true, 80, VERTICAL);
    expect(d.visibles).toBe(10);
    expect(d.lista.ancho).toBeGreaterThan(260);
    expect(d.detalle.y).toBeGreaterThanOrEqual(d.lista.y + d.lista.alto);
    expect(seSolapan(d.lista, d.detalle)).toBe(false);
    expect(dentroDe(d.detalle, 320, 600)).toBe(true);
  });

  test('en un vertical bajo se ven menos filas (se desplaza) y todo cabe', () => {
    const d = disposicionHabilidades(320, 400, 10, true, 80, VERTICAL);
    expect(d.visibles).toBeLessThan(10);
    expect(d.visibles).toBeGreaterThanOrEqual(3);
    expect(dentroDe(d.lista, 320, 400)).toBe(true);
    expect(dentroDe(d.detalle, 320, 400)).toBe(true);
  });
});
