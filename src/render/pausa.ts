import { filaTocada, type Rect } from '../core/menu';
import { barra, COLOR_BARRA } from './combate';
import { dibujarControles } from './controles';
import { dibujarFila, dibujarMarco, dibujarTitulo, PALETA } from './marco';
import { ALTO, ANCHO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir } from './texto';

/**
 * Inventario (2026-10-26, estilo de Octopath en lavanda): a la izquierda la lista con todo y a la
 * derecha la sección elegida. Boceto aprobado en docs/superpowers/mockups/2026-10-26-menu-inventario.html (B).
 */
export type SeccionInventario =
  'heroina' | 'objetos' | 'equipo' | 'mejorar' | 'ajustes' | 'seguir' | 'salir';
export const SECCIONES: readonly SeccionInventario[] = [
  'heroina',
  'objetos',
  'equipo',
  'mejorar',
  'ajustes',
  'seguir',
  'salir',
];
export const NOMBRE_SECCION: Record<SeccionInventario, string> = {
  heroina: 'Heroína',
  objetos: 'Objetos',
  equipo: 'Equipo',
  mejorar: 'Mejorar',
  ajustes: 'Ajustes',
  seguir: 'Seguir',
  salir: 'Salir',
};
/** Secciones que se ven en el panel de la derecha (las demás abren otra pantalla o cierran). */
export type PaginaInventario = 'heroina' | 'objetos' | 'ajustes';

export const LISTA_INVENTARIO: Rect = { x: 12, y: 12, ancho: 128, alto: 328 };
export const FILA_INVENTARIO = 28;
/** Las cinco primeras filas arriba; Seguir y Salir pegadas abajo. */
const ARRIBA: Rect = { x: 12, y: 20, ancho: 128, alto: 5 * FILA_INVENTARIO };
const ABAJO: Rect = {
  x: 12,
  y: 340 - 8 - 2 * FILA_INVENTARIO,
  ancho: 128,
  alto: 2 * FILA_INVENTARIO,
};
const PANEL: Rect = { x: 150, y: 12, ancho: 318, alto: 328 };
/** Margen interior del panel derecho. */
const DX = PANEL.x + 12;
/** Filas de consumibles en la sección Objetos (para tocar). */
export const OBJETOS_INVENTARIO: Rect = { x: DX - 4, y: 44, ancho: 298, alto: 3 * FILA_INVENTARIO };
/** Letras por línea en el panel derecho y en cada una de sus dos columnas. */
export const LETRAS_PANEL = 40;
export const LETRAS_COLUMNA = 20;

/** Controles HTML de Ajustes, dentro del panel derecho. 40 px de alto: con el dedo, ~44 px CSS. */
export const RECT_SONIDO = { x: DX, y: 44, ancho: 40, alto: 40 };
/** Calidad del mapa en 3D, a la derecha de Sonido. */
export const RECT_CALIDAD = { x: DX + 150, y: 44, ancho: 40, alto: 40 };
/** Música y Efectos, uno al lado del otro: así cabe debajo la lista de controles. */
export const RECT_MUSICA = { x: DX, y: 112, ancho: 136, alto: 40 };
export const RECT_EFECTOS = { x: DX + 154, y: 112, ancho: 136, alto: 40 };

/** Fila de la lista (posición en `SECCIONES`) bajo el toque (x, y); -1 si ninguna. */
export function seccionTocada(x: number, y: number): number {
  const arriba = filaTocada(x, y, ARRIBA, FILA_INVENTARIO, 5);
  if (arriba >= 0) return arriba;
  const abajo = filaTocada(x, y, ABAJO, FILA_INVENTARIO, 2);
  return abajo >= 0 ? 5 + abajo : -1;
}

/** Un consumible en la sección Objetos: nombre, cuántos hay, si se puede usar y qué hace, ya en líneas. */
export interface ObjetoFicha {
  nombre: string;
  cantidad: string;
  disponible: boolean;
  lineas: readonly string[];
}

/** Lo que enseña el inventario; la escena lo rehace al abrirlo y al usar algo. */
export interface FichaInventario {
  /** Nombre de la heroína y «Nivel 3». */
  nombre: string;
  nivel: string;
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
  /** «Ataque 12 (+3)»…; el bono, si lo hay, va entre paréntesis. */
  estadisticas: string[];
  /** Piezas puestas, su efecto, el Corazón y la mochila, ya partidas al ancho de la columna. */
  equipo: string[];
  objetos: ObjetoFicha[];
  /** Detalle de cada fila de la lista («2» puntos libres en Mejorar, «¿Seguro?» en Salir). */
  detalles: Record<SeccionInventario, string>;
  /** Mejorar se apaga sin puntos libres. */
  mejorar: boolean;
}

export interface VistaInventario {
  /** La sección que se ve a la derecha. */
  pagina: PaginaInventario;
  /** Fila de la lista con el cursor (posición en `SECCIONES`). */
  elegida: number;
  /** Con el foco dentro de Objetos, la lista no lleva cursor y el consumible elegido sí. */
  enObjetos: boolean;
  objeto: number;
  sprite: Sprite;
  tiempo: number;
  ficha: FichaInventario;
}

const COLOR = { etiqueta: '#b9b3a3' };

export function dibujarInventario(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  ctx.fillStyle = 'rgba(8, 10, 14, 0.94)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  dibujarLista(ctx, v);
  dibujarMarco(ctx, PANEL.x, PANEL.y, PANEL.ancho, PANEL.alto);
  if (v.pagina === 'heroina') dibujarHeroina(ctx, v);
  else if (v.pagina === 'objetos') dibujarObjetos(ctx, v);
  else dibujarAjustes(ctx);
}

function dibujarLista(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  const l = LISTA_INVENTARIO;
  dibujarMarco(ctx, l.x, l.y, l.ancho, l.alto);
  for (let i = 0; i < SECCIONES.length; i++) {
    const s = SECCIONES[i]!;
    const caja = i < 5 ? ARRIBA : ABAJO;
    const y = caja.y + (i < 5 ? i : i - 5) * FILA_INVENTARIO;
    const elegida = i === v.elegida && !v.enObjetos;
    const apagada = s === 'mejorar' && !v.ficha.mejorar;
    const estado = apagada
      ? elegida
        ? 'elegidaApagada'
        : 'apagada'
      : elegida
        ? 'elegida'
        : 'normal';
    dibujarFila(
      ctx,
      caja.x,
      y,
      caja.ancho,
      FILA_INVENTARIO,
      NOMBRE_SECCION[s],
      v.ficha.detalles[s],
      estado,
    );
  }
}

/** Retrato y barras arriba; debajo, Estadísticas y Equipo a la izquierda y Habilidades a la derecha. */
function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  const f = v.ficha;
  // La heroína de frente, a tamaño triple, sobre su sombra.
  const centro = DX + 40;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(centro - 20, 117, 40, 4);
  dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, centro, 120, 3);
  const x = DX + 96;
  escribir(ctx, f.nombre, x, 26, PALETA.texto);
  escribir(ctx, f.nivel, x, 42, PALETA.claro);
  barraConTexto(ctx, x, 66, 'PV', f.pv / f.pvMax, COLOR_BARRA.pv, f.textoPv);
  barraConTexto(ctx, x, 82, 'PM', f.pm / Math.max(1, f.pmMax), COLOR_BARRA.pm, f.textoPm);
  barraConTexto(ctx, x, 98, 'PX', f.px / Math.max(1, f.pxSiguiente), PALETA.px, f.textoPx);

  const ancho = 146;
  const derecha = DX + 156;
  let y = 136;
  dibujarTitulo(ctx, DX, y, ancho, 'Estadísticas');
  y += 22;
  for (let i = 0; i < f.estadisticas.length; i++, y += 13)
    escribir(ctx, f.estadisticas[i]!, DX, y, PALETA.texto);
  y += 6;
  dibujarTitulo(ctx, DX, y, ancho, 'Equipo');
  y += 20;
  // Interlineado de 13: en el peor caso (efecto del arma y Corazón en dos líneas) llega justo al borde.
  for (let i = 0; i < f.equipo.length; i++, y += 13)
    escribir(ctx, f.equipo[i]!, DX, y, PALETA.texto);

  dibujarTitulo(ctx, derecha, 136, ancho, 'Habilidades');
  for (let i = 0; i < f.habilidades.length; i++)
    escribir(ctx, f.habilidades[i]!, derecha, 158 + i * 14, PALETA.texto);
}

/** Los consumibles en filas; debajo, qué hace el elegido; abajo, los PV y PM para saber si hace falta. */
function dibujarObjetos(ctx: CanvasRenderingContext2D, v: VistaInventario): void {
  const f = v.ficha;
  dibujarTitulo(ctx, DX, 24, 294, 'Objetos');
  const r = OBJETOS_INVENTARIO;
  for (let i = 0; i < f.objetos.length; i++) {
    const o = f.objetos[i]!;
    const elegido = v.enObjetos && i === v.objeto;
    const estado = o.disponible
      ? elegido
        ? 'elegida'
        : 'normal'
      : elegido
        ? 'elegidaApagada'
        : 'apagada';
    dibujarFila(
      ctx,
      r.x,
      r.y + i * FILA_INVENTARIO,
      r.ancho,
      FILA_INVENTARIO,
      o.nombre,
      o.cantidad,
      estado,
    );
  }
  const o = f.objetos[v.objeto];
  if (o) {
    const y = r.y + f.objetos.length * FILA_INVENTARIO + 16;
    dibujarTitulo(ctx, DX, y, 294, o.nombre);
    for (let i = 0; i < o.lineas.length; i++)
      escribir(ctx, o.lineas[i]!, DX, y + 24 + i * 14, PALETA.texto);
  }
  escribir(ctx, 'PV', DX, 316, COLOR.etiqueta);
  escribir(ctx, f.textoPv, DX + 22, 316, PALETA.texto);
  escribir(ctx, 'PM', DX + 110, 316, COLOR.etiqueta);
  escribir(ctx, f.textoPm, DX + 132, 316, PALETA.texto);
}

/** Etiquetas de los controles HTML de sonido, calidad y volumen; debajo, los controles del juego. */
function dibujarAjustes(ctx: CanvasRenderingContext2D): void {
  dibujarTitulo(ctx, DX, 24, 294, 'Ajustes');
  escribir(ctx, 'Sonido', RECT_SONIDO.x + RECT_SONIDO.ancho + 8, RECT_SONIDO.y + 14, PALETA.texto);
  escribir(
    ctx,
    'Calidad',
    RECT_CALIDAD.x + RECT_CALIDAD.ancho + 8,
    RECT_CALIDAD.y + 14,
    PALETA.texto,
  );
  escribir(ctx, 'Música', RECT_MUSICA.x, RECT_MUSICA.y - 16, COLOR.etiqueta);
  escribir(ctx, 'Efectos', RECT_EFECTOS.x, RECT_EFECTOS.y - 16, COLOR.etiqueta);
  dibujarTitulo(ctx, DX, 166, 294, 'Controles');
  dibujarControles(ctx, DX, 190);
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
  escribir(ctx, etiqueta, x, y - 4, COLOR.etiqueta);
  barra(ctx, x + 24, y, 110, fraccion, color);
  escribir(ctx, texto, x + 140, y - 4, PALETA.texto);
}
