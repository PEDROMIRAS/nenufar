import { barra, COLOR_BARRA, dibujarMenu, type MenuVista } from './combate';
import { dibujarControles } from './controles';
import { PALETA } from './marco';
import { ALTO, ANCHO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

/** Pestañas del inventario: la heroína, los objetos y los ajustes (sonido y controles). */
export type PaginaInventario = 'heroina' | 'objetos' | 'ajustes';
export const PAGINAS: readonly PaginaInventario[] = ['heroina', 'objetos', 'ajustes'];
export const NOMBRE_PAGINA: Record<PaginaInventario, string> = {
  heroina: 'Heroína',
  objetos: 'Objetos',
  ajustes: 'Ajustes',
};
/** Pestañas arriba (también para saber dónde se toca). */
export const PESTANAS_INVENTARIO = PAGINAS.map((_, i) => ({
  x: 15 + i * 150,
  y: 2,
  ancho: 150,
  alto: 32,
}));

/** Un consumible en la pestaña Objetos: «Poción x2» y lo que hace, ya en líneas. */
export interface ObjetoFicha {
  titulo: string;
  lineas: string[];
}

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
  /** Columna derecha de la heroína: estadísticas y equipo; las líneas que acaban en «:» son títulos. */
  derecha: string[];
  objetos: ObjetoFicha[];
}

export interface VistaInventario {
  pagina: PaginaInventario;
  /** Las flechas están en las pestañas: la activa lleva un recuadro. */
  focoPestanas: boolean;
  sprite: Sprite;
  tiempo: number;
  ficha: FichaInventario;
  menu: MenuVista;
}

const PANEL = { y: 48, ancho: 216, alto: 236 };
const IZQUIERDA = 16;
const DERECHA = 248;
/** Controles HTML de la pestaña Ajustes, en el panel izquierdo. 40 px de alto: con el dedo, ~44 px CSS. */
export const RECT_SONIDO = { x: 28, y: 58, ancho: 40, alto: 40 };
/** Calidad del mapa en 3D, a la derecha de Sonido. */
export const RECT_CALIDAD = { x: 126, y: 58, ancho: 40, alto: 40 };
export const RECT_MUSICA = { x: 28, y: 128, ancho: 192, alto: 40 };
export const RECT_EFECTOS = { x: 28, y: 204, ancho: 192, alto: 40 };
const COLOR = {
  panel: '#1f2a24',
  apartado: '#ffd27a',
  titulo: '#aab8a6',
  texto: '#e8efe4',
};

/** Inventario (y pausa): pestañas arriba, la página elegida y el menú abajo. */
export function dibujarInventario(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  ctx.fillStyle = 'rgba(8, 12, 14, 0.94)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  dibujarPestanas(ctx, v);
  if (v.pagina === 'heroina') dibujarHeroina(ctx, v);
  else if (v.pagina === 'objetos') dibujarObjetos(ctx, v.ficha);
  else dibujarAjustes(ctx);
  dibujarMenu(ctx, v.menu);
}

/** Como en el bestiario: la de la página que se ve, en dorado y subrayada. */
function dibujarPestanas(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  for (let i = 0; i < PAGINAS.length; i++) {
    const r = PESTANAS_INVENTARIO[i]!;
    const pagina = PAGINAS[i]!;
    const activa = pagina === v.pagina;
    const color = activa ? COLOR.apartado : COLOR.titulo;
    escribir(
      ctx,
      NOMBRE_PAGINA[pagina],
      r.x + r.ancho / 2,
      r.y + 3,
      color,
      'center',
      FUENTE_GRANDE,
    );
    if (!activa) continue;
    ctx.fillStyle = COLOR.apartado;
    ctx.fillRect(r.x + 8, r.y + r.alto - 3, r.ancho - 16, 2);
    if (!v.focoPestanas) continue;
    ctx.strokeStyle = COLOR.apartado;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.ancho - 1, r.alto - 1);
  }
}

function paneles(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(IZQUIERDA, PANEL.y, PANEL.ancho, PANEL.alto);
  ctx.fillRect(DERECHA, PANEL.y, PANEL.ancho, PANEL.alto);
}

/** La heroína con sus barras y habilidades, y a la derecha sus estadísticas y su equipo. */
function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  const f = v.ficha;
  paneles(ctx);
  // La heroína de frente, a tamaño triple, sobre su sombra.
  const centro = IZQUIERDA + PANEL.ancho / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(centro - 20, 139, 40, 4);
  dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, centro, 142, 3);
  escribir(ctx, f.cabecera, centro, 148, COLOR.texto, 'center');

  const x = IZQUIERDA + 10;
  // Apretado para que quepan las cinco habilidades (con la quinta, la de recompensa) en el panel.
  barraConTexto(ctx, x, 166, 'PV', f.pv / f.pvMax, COLOR_BARRA.pv, f.textoPv);
  barraConTexto(ctx, x, 180, 'PM', f.pm / Math.max(1, f.pmMax), COLOR_BARRA.pm, f.textoPm);
  barraConTexto(ctx, x, 194, 'PX', f.px / Math.max(1, f.pxSiguiente), PALETA.px, f.textoPx);
  escribir(ctx, 'Habilidades:', x, 208, COLOR.apartado);
  for (let i = 0; i < f.habilidades.length; i++)
    escribir(ctx, f.habilidades[i]!, x, 222 + i * 12, COLOR.texto);

  let y = PANEL.y + 8;
  for (let i = 0; i < f.derecha.length; i++) {
    const linea = f.derecha[i]!;
    const apartado = linea.endsWith(':');
    if (apartado && i > 0) y += 6; // aire antes de cada apartado
    escribir(ctx, linea, DERECHA + 10, y, apartado ? COLOR.apartado : COLOR.texto);
    y += 15;
  }
}

/** Cada consumible con cuántos hay y qué hace, en un panel a todo lo ancho. */
function dibujarObjetos(ctx: CanvasRenderingContext2D, f: FichaInventario): void {
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(IZQUIERDA, PANEL.y, DERECHA + PANEL.ancho - IZQUIERDA, PANEL.alto);
  let y = PANEL.y + 10;
  for (let i = 0; i < f.objetos.length; i++) {
    const o = f.objetos[i]!;
    escribir(ctx, o.titulo, IZQUIERDA + 12, y, COLOR.apartado);
    y += 15;
    for (let l = 0; l < o.lineas.length; l++) {
      escribir(ctx, o.lineas[l]!, IZQUIERDA + 12, y, COLOR.texto);
      y += 14;
    }
    y += 8;
  }
}

/** A la izquierda, las etiquetas de los controles HTML de sonido y calidad; a la derecha, los controles del juego. */
function dibujarAjustes(ctx: CanvasRenderingContext2D): void {
  paneles(ctx);
  escribir(ctx, 'Sonido', RECT_SONIDO.x + RECT_SONIDO.ancho + 8, RECT_SONIDO.y + 14, COLOR.texto);
  escribir(
    ctx,
    'Calidad',
    RECT_CALIDAD.x + RECT_CALIDAD.ancho + 8,
    RECT_CALIDAD.y + 14,
    COLOR.texto,
  );
  escribir(ctx, 'Música', RECT_MUSICA.x, RECT_MUSICA.y - 16, COLOR.titulo);
  escribir(ctx, 'Efectos', RECT_EFECTOS.x, RECT_EFECTOS.y - 16, COLOR.titulo);
  escribir(ctx, 'Controles:', DERECHA + 10, PANEL.y + 8, COLOR.apartado);
  dibujarControles(ctx, DERECHA + 10, PANEL.y + 30);
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
