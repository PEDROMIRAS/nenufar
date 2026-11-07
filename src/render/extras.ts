import { celdasBestiario, filasLista, letrasEnAncho, pestanasExtras } from '../core/disposicion';
import { CASILLAS_BESTIARIO } from '../core/logros';
import type { Rect } from '../core/menu';
import { VERTICAL } from '../data/datos';
import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCaja, dibujarFondo, dibujarMarco, PALETA } from './marco';
import { ANCHO, interfaz } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE, partirCacheado } from './texto';

/** Un monstruo del bestiario: su hoja, su silueta (si aún no se ha vencido) y los textos de su ficha. */
export interface FichaMonstruo {
  sprite: Sprite;
  silueta: Sprite;
  visto: boolean;
  nombre: string;
  lineas: string[];
}

export interface LogroVisto {
  nombre: string;
  descripcion: string;
  conseguido: boolean;
}

export interface VistaExtras {
  pagina: 'bestiario' | 'logros';
  /** Las flechas están en las pestañas: la activa lleva un recuadro. */
  focoPestanas: boolean;
  subtitulo: string;
  pista: string;
  fichas: FichaMonstruo[];
  elegido: number;
  logros: LogroVisto[];
  menu: MenuVista;
  tiempo: number;
}

/** Casillas del bestiario: 8 por fila (también para saber dónde se toca). */
export const CELDAS = Array.from({ length: CASILLAS_BESTIARIO }, (_, i) => ({
  x: 8 + (i % 8) * 58,
  y: 64 + Math.floor(i / 8) * 52,
  ancho: 56,
  alto: 48,
}));

/** Pestañas Bestiario y Logros, arriba (también para saber dónde se toca). */
export const PESTANAS = [
  { x: ANCHO / 2 - 154, y: 2, ancho: 150, alto: 32 },
  { x: ANCHO / 2 + 4, y: 2, ancho: 150, alto: 32 },
];

/** Alto de una fila de logro en la interfaz alta: el nombre y hasta dos líneas de descripción. */
const FILA_LOGRO = 48;
const FILAS_LOGRO_D = {
  ...VERTICAL,
  menu: { ...VERTICAL.menu, fila: FILA_LOGRO, filaMin: FILA_LOGRO },
};

/** La disposición de la interfaz alta, recordada mientras no cambian el tamaño ni la cantidad de logros. */
let alta: {
  ancho: number;
  alto: number;
  pestanas: Rect[];
  celdas: Rect[];
  columnas: number;
} | null = null;

/** Las filas de logros por separado: dependen también de cuántos hay. */
let logrosAlta: { ancho: number; alto: number; filas: Rect[] } | null = null;

function filasLogros(n: number): Rect[] {
  if (
    !logrosAlta ||
    logrosAlta.ancho !== interfaz.ancho ||
    logrosAlta.alto !== interfaz.alto ||
    logrosAlta.filas.length !== n
  )
    logrosAlta = {
      ancho: interfaz.ancho,
      alto: interfaz.alto,
      filas: filasLista(n, 76, interfaz.alto, interfaz.ancho, FILAS_LOGRO_D).filas,
    };
  return logrosAlta.filas;
}

function disposicionAlta(): NonNullable<typeof alta> {
  if (!alta || alta.ancho !== interfaz.ancho || alta.alto !== interfaz.alto) {
    const { celdas } = celdasBestiario(CASILLAS_BESTIARIO, interfaz.ancho, 76, VERTICAL);
    const columnas = celdas.filter((c) => c.y === celdas[0]!.y).length;
    alta = {
      ancho: interfaz.ancho,
      alto: interfaz.alto,
      pestanas: pestanasExtras(interfaz.ancho, VERTICAL),
      celdas,
      columnas,
    };
  }
  return alta;
}

/** Las pestañas ahora (para dibujar y para tocar). */
export const pestanas = (): readonly Rect[] =>
  interfaz.alta ? disposicionAlta().pestanas : PESTANAS;
/** Las casillas del bestiario ahora. */
export const celdas = (): readonly Rect[] => (interfaz.alta ? disposicionAlta().celdas : CELDAS);
/** Casillas por fila del bestiario ahora (lo que salta ↑ y ↓ con el teclado). */
export const columnasBestiario = (): number => (interfaz.alta ? disposicionAlta().columnas : 8);
/** Letras por línea de la ficha de un monstruo: las que caben en su marco. */
export const letrasFicha = (): number =>
  interfaz.alta ? letrasEnAncho(interfaz.ancho - 2 * VERTICAL.menu.margen - 16) : 52;

const COLOR = {
  texto: PALETA.texto,
  tenue: PALETA.apagada,
  apagado: PALETA.apagada,
  oro: PALETA.elegida,
};

/** La misma hoja pintada de un solo color oscuro: lo que se ve de un monstruo aún no vencido. */
export function siluetaDe(s: Sprite): Sprite {
  const origen = s.imagen as HTMLImageElement;
  const lienzo = document.createElement('canvas');
  lienzo.width = origen.width;
  lienzo.height = origen.height;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  ctx.drawImage(origen, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#0c1210';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  return { imagen: lienzo, datos: s.datos };
}

export function dibujarExtras(ctx: CanvasRenderingContext2D, v: VistaExtras): void {
  dibujarFondo(ctx);
  const esAlta = interfaz.alta;
  const pesta = pestanas();
  // Pestañas en lugar de título: la de la página que se ve, en blanco lavanda y subrayada.
  for (let i = 0; i < pesta.length; i++) {
    const r = pesta[i]!;
    const activa = (i === 0) === (v.pagina === 'bestiario');
    const texto = i === 0 ? 'Bestiario' : 'Logros';
    escribir(
      ctx,
      texto,
      r.x + r.ancho / 2,
      r.y + 3,
      activa ? COLOR.oro : COLOR.tenue,
      'center',
      FUENTE_GRANDE,
    );
    if (!activa) continue;
    ctx.fillStyle = PALETA.filete;
    ctx.fillRect(r.x + 8, r.y + r.alto - 3, r.ancho - 16, 2);
    if (!v.focoPestanas) continue;
    ctx.strokeStyle = PALETA.cursor;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.ancho - 1, r.alto - 1);
  }
  const centro = interfaz.ancho / 2;
  escribir(ctx, v.subtitulo, centro, esAlta ? 42 : 36, COLOR.texto, 'center');
  escribir(ctx, v.pista, centro, esAlta ? 56 : 50, COLOR.tenue, 'center');
  if (v.pagina === 'bestiario') dibujarBestiario(ctx, v);
  else dibujarLogros(ctx, v);
  dibujarMenu(ctx, v.menu);
}

function dibujarBestiario(ctx: CanvasRenderingContext2D, v: VistaExtras): void {
  const casillas = celdas();
  for (let i = 0; i < v.fichas.length; i++) {
    const f = v.fichas[i]!;
    const c = casillas[i]!;
    // La casilla elegida solo se marca con las flechas en la rejilla (no en las pestañas ni en Volver).
    const marcada = i === v.elegido && !v.focoPestanas && v.menu.seleccion < 0;
    dibujarCaja(ctx, c.x, c.y, c.ancho, c.alto, marcada ? 'elegida' : 'normal');
    // Los jefes tienen fotogramas más grandes: todos caben en la casilla, a escalas de medio en medio
    // para que el pixel art no se deforme (32 px → ×1,5; 48 px → ×1).
    const escala = Math.max(1, Math.floor((48 / f.sprite.datos.frameHeight) * 2) / 2);
    const pie = c.y + c.alto - 4;
    dibujarFotograma(
      ctx,
      f.visto ? f.sprite : f.silueta,
      'idle',
      'down',
      v.tiempo,
      c.x + c.ancho / 2,
      pie,
      escala,
    );
  }
  const f = v.fichas[v.elegido];
  if (!f) return;
  // La ficha del elegido: en horizontal, en un marco bajo la rejilla; en la interfaz alta, a ancho completo.
  const m = VERTICAL.menu.margen;
  // En la interfaz alta la ficha va justo bajo la última casilla que se usa (no bajo las 4 filas reservadas).
  const ultima = casillas[v.fichas.length - 1];
  const yFicha = interfaz.alta && ultima ? ultima.y + ultima.alto + 10 : 220;
  const marco = interfaz.alta
    ? { x: m, y: yFicha, ancho: interfaz.ancho - 2 * m, alto: 100 }
    : { x: 40, y: 220, ancho: ANCHO - 80, alto: 70 };
  dibujarMarco(ctx, marco.x, marco.y, marco.ancho, marco.alto);
  const centro = interfaz.ancho / 2;
  escribir(ctx, f.nombre, centro, marco.y + 6, f.visto ? COLOR.oro : COLOR.apagado, 'center');
  for (let i = 0; i < f.lineas.length; i++)
    escribir(ctx, f.lineas[i]!, centro, marco.y + 20 + i * 12, COLOR.texto, 'center');
}

function dibujarLogros(ctx: CanvasRenderingContext2D, v: VistaExtras): void {
  if (interfaz.alta) {
    // Una fila por logro a ancho completo; la descripción, partida si no cabe en una línea.
    const filas = filasLogros(v.logros.length);
    for (let i = 0; i < v.logros.length; i++) {
      const l = v.logros[i]!;
      const r = filas[i]!;
      dibujarCaja(ctx, r.x, r.y + 2, r.ancho, r.alto - 4, 'normal');
      escribir(
        ctx,
        l.conseguido ? '★' : '·',
        r.x + 14,
        r.y + 8,
        l.conseguido ? COLOR.oro : COLOR.apagado,
        'center',
      );
      escribir(ctx, l.nombre, r.x + 28, r.y + 6, l.conseguido ? COLOR.oro : COLOR.tenue);
      const lineas = partirCacheado(l.descripcion, letrasEnAncho(r.ancho - 36));
      for (let k = 0; k < lineas.length; k++)
        escribir(
          ctx,
          lineas[k]!,
          r.x + 28,
          r.y + 20 + k * 12,
          l.conseguido ? COLOR.texto : COLOR.apagado,
        );
    }
    return;
  }
  for (let i = 0; i < v.logros.length; i++) {
    const l = v.logros[i]!;
    const y = 68 + i * 36;
    dibujarCaja(ctx, 40, y, ANCHO - 80, 32, 'normal');
    escribir(
      ctx,
      l.conseguido ? '★' : '·',
      54,
      y + 9,
      l.conseguido ? COLOR.oro : COLOR.apagado,
      'center',
    );
    escribir(ctx, l.nombre, 70, y + 3, l.conseguido ? COLOR.oro : COLOR.tenue);
    escribir(ctx, l.descripcion, 70, y + 17, l.conseguido ? COLOR.texto : COLOR.apagado);
  }
}
