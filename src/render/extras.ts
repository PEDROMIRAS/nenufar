import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO, FONDO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

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
  titulo: string;
  subtitulo: string;
  pista: string;
  fichas: FichaMonstruo[];
  elegido: number;
  logros: LogroVisto[];
  menu: MenuVista;
  tiempo: number;
}

/** Casillas del bestiario: 6 por fila (también para saber dónde se toca). */
export const CELDAS = Array.from({ length: 12 }, (_, i) => ({
  x: 60 + (i % 6) * 60,
  y: 64 + Math.floor(i / 6) * 60,
  ancho: 56,
  alto: 56,
}));

const COLOR = {
  celda: '#1f2a24',
  elegida: '#ffd27a',
  texto: '#e8efe4',
  tenue: '#aab8a6',
  apagado: '#5d6b5a',
  oro: '#ffd27a',
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
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, v.titulo, ANCHO / 2, 8, COLOR.oro, 'center', FUENTE_GRANDE);
  escribir(ctx, v.subtitulo, ANCHO / 2, 36, COLOR.texto, 'center');
  escribir(ctx, v.pista, ANCHO / 2, 50, COLOR.tenue, 'center');
  if (v.pagina === 'bestiario') dibujarBestiario(ctx, v);
  else dibujarLogros(ctx, v);
  dibujarMenu(ctx, v.menu);
}

function dibujarBestiario(ctx: CanvasRenderingContext2D, v: VistaExtras): void {
  v.fichas.forEach((f, i) => {
    const c = CELDAS[i]!;
    if (i === v.elegido) {
      ctx.fillStyle = COLOR.elegida;
      ctx.fillRect(c.x - 2, c.y - 2, c.ancho + 4, c.alto + 4);
    }
    ctx.fillStyle = COLOR.celda;
    ctx.fillRect(c.x, c.y, c.ancho, c.alto);
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
  });
  const f = v.fichas[v.elegido];
  if (!f) return;
  escribir(ctx, f.nombre, ANCHO / 2, 196, f.visto ? COLOR.oro : COLOR.apagado, 'center');
  f.lineas.forEach((l, i) => escribir(ctx, l, ANCHO / 2, 216 + i * 15, COLOR.texto, 'center'));
}

function dibujarLogros(ctx: CanvasRenderingContext2D, v: VistaExtras): void {
  v.logros.forEach((l, i) => {
    const y = 68 + i * 36;
    ctx.fillStyle = COLOR.celda;
    ctx.fillRect(40, y, ANCHO - 80, 32);
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
  });
}
