import { barra, COLOR_BARRA, dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

/** Lo que enseña el inventario; la escena lo rehace al abrirlo y al usar algo. */
export interface FichaInventario {
  /** «Rana ronin · Nivel 3». */
  cabecera: string;
  pv: number;
  pvMax: number;
  pm: number;
  pmMax: number;
  px: number;
  pxSiguiente: number;
  /** Textos de las barras («42/42»…), ya hechos para no crearlos en cada fotograma. */
  textoPv: string;
  textoPm: string;
  textoPx: string;
  habilidades: string[];
  /** Columna derecha: estadísticas, equipo e inventario; las líneas que acaban en «:» son títulos. */
  derecha: string[];
}

const PANEL = { y: 48, ancho: 216, alto: 236 };
const IZQUIERDA = 16;
const DERECHA = 248;
const COLOR = {
  panel: '#1f2a24',
  apartado: '#ffd27a',
  titulo: '#aab8a6',
  texto: '#e8efe4',
  px: '#c89bff',
};

/** Inventario (y pausa): la heroína con sus barras y habilidades, sus estadísticas, equipo y objetos, y el menú. */
export function dibujarInventario(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  tiempo: number,
  f: FichaInventario,
  menu: MenuVista,
): void {
  ctx.fillStyle = 'rgba(8, 12, 14, 0.94)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, 'Inventario', ANCHO / 2, 10, '#ffd27a', 'center', FUENTE_GRANDE);

  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(IZQUIERDA, PANEL.y, PANEL.ancho, PANEL.alto);
  ctx.fillRect(DERECHA, PANEL.y, PANEL.ancho, PANEL.alto);

  // La heroína de frente, a tamaño triple, sobre su sombra.
  const centro = IZQUIERDA + PANEL.ancho / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(centro - 20, 139, 40, 4);
  dibujarFotograma(ctx, sprite, 'idle', 'down', tiempo, centro, 142, 3);
  escribir(ctx, f.cabecera, centro, 148, COLOR.texto, 'center');

  const x = IZQUIERDA + 10;
  barraConTexto(ctx, x, 168, 'PV', f.pv / f.pvMax, COLOR_BARRA.pv, f.textoPv);
  barraConTexto(ctx, x, 184, 'PM', f.pm / Math.max(1, f.pmMax), COLOR_BARRA.pm, f.textoPm);
  barraConTexto(ctx, x, 200, 'PX', f.px / Math.max(1, f.pxSiguiente), COLOR.px, f.textoPx);
  escribir(ctx, 'Habilidades:', x, 220, COLOR.apartado);
  f.habilidades.forEach((h, i) => escribir(ctx, h, x, 236 + i * 12, COLOR.texto));

  let y = PANEL.y + 8;
  f.derecha.forEach((linea, i) => {
    const apartado = linea.endsWith(':');
    if (apartado && i > 0) y += 6; // aire antes de cada apartado
    escribir(ctx, linea, DERECHA + 10, y, apartado ? COLOR.apartado : COLOR.texto);
    y += 15;
  });
  dibujarMenu(ctx, menu);
}

function barraConTexto(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  etiqueta: string,
  fraccion: number,
  color: string,
  texto: string,
): void {
  escribir(ctx, etiqueta, x, y - 4, COLOR.titulo);
  barra(ctx, x + 24, y, 110, fraccion, color);
  escribir(ctx, texto, x + 140, y - 4, COLOR.texto);
}
