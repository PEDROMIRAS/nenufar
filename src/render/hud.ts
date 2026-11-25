import type { Luchador } from '../core/combate';
import { barra, COLOR_BARRA } from './combate';
import { PALETA } from './marco';
import { SALA_ALTO, vista } from './pantalla';
import { escribir } from './texto';
import {
  ANCHO_LETRA,
  cabeceraQueCabe,
  cajaAviso,
  letrasEnAncho,
  lineaPresagio,
} from '../core/disposicion';

/** Alto de la segunda línea de la cabecera (el presagio), en píxeles lógicos del HUD. */
const LINEA_PRESAGIO = 15;
/** Alto de cada línea más de un aviso que no cabe en una. */
const LINEA_AVISO = 16;

/** Textos del HUD; la escena los rehace solo cuando cambia algún valor. */
export interface TextosHud {
  cabecera: string;
  /** Sin el presagio, para cuando la larga no cabe antes del minimapa. */
  cabeceraCorta: string;
  /** El nombre del presagio (vacío si no hay): segunda línea cuando la cabecera larga no cabe. */
  presagio: string;
  pv: string;
  pm: string;
}

/**
 * Zona, nivel, PV y PM de la heroína, arriba a la izquierda del mapa. La cabecera acaba antes de `hasta` (el
 * minimapa): si la larga no cabe, va la corta; la caja se ensancha con ella.
 */
export function dibujarHud(
  ctx: CanvasRenderingContext2D,
  h: Luchador,
  t: TextosHud,
  hasta: number,
): void {
  const letras = letrasEnAncho(hasta - 12);
  const cabecera = cabeceraQueCabe(t.cabecera, t.cabeceraCorta, letras);
  // Si no cabe con el presagio, el presagio baja a una segunda línea y las barras con él.
  const presagio = lineaPresagio(t.cabecera, letras, t.presagio);
  const extra = presagio ? LINEA_PRESAGIO : 0;
  ctx.fillStyle = 'rgba(9, 7, 18, 0.7)';
  ctx.fillRect(6, 6, Math.max(150, Math.ceil(cabecera.length * ANCHO_LETRA) + 12), 50 + extra);
  escribir(ctx, cabecera, 12, 10);
  if (presagio) escribir(ctx, presagio, 12, 10 + LINEA_PRESAGIO, PALETA.claro);
  barra(ctx, 12, 30 + extra, 80, h.pv / h.pvMax, COLOR_BARRA.pv);
  escribir(ctx, t.pv, 98, 26 + extra);
  barra(ctx, 12, 44 + extra, 80, h.pm / Math.max(1, h.pmMax), COLOR_BARRA.pm);
  escribir(ctx, t.pm, 98, 40 + extra);
}

/** Aviso centrado en la parte baja de la sala («La fuente te restaura…»). */
/** La caja del último aviso, para no partir el texto en cada fotograma. */
let ultimoAviso = { texto: '', ancho: 0, caja: cajaAviso('', 1) };

export function dibujarAviso(ctx: CanvasRenderingContext2D, texto: string): void {
  const anchoVentana = vista.ancho / vista.hud;
  if (ultimoAviso.texto !== texto || ultimoAviso.ancho !== anchoVentana)
    ultimoAviso = { texto, ancho: anchoVentana, caja: cajaAviso(texto, anchoVentana) };
  const { ancho, lineas } = ultimoAviso.caja;
  const alto = 26 + (lineas.length - 1) * LINEA_AVISO;
  // Crece hacia arriba: la última línea queda donde siempre.
  const y = (vista.salaY + SALA_ALTO) / vista.hud - 46 - (lineas.length - 1) * LINEA_AVISO;
  const x = anchoVentana / 2;
  ctx.fillStyle = 'rgba(9, 7, 18, 0.8)';
  ctx.fillRect(x - ancho / 2, y, ancho, alto);
  lineas.forEach((l, i) => escribir(ctx, l, x, y + 6 + i * LINEA_AVISO, PALETA.cursor, 'center'));
}

/** Botón de menú en la esquina superior derecha del mapa (para el móvil; con teclado es Escape). */
const MOCHILA = { oscuro: '#4a2c1a', cuerpo: '#8a5a34', solapa: '#b07a44', hebilla: '#e2b648' };

/** Botón de la mochila (abre el inventario), arriba a la derecha de la ventana; `colocarHud` fija su x. */
export const BOTON_MENU = { x: 0, y: 6, ancho: 44, alto: 44 };

/** Pone la interfaz del mapa en los lados de la ventana, según su forma. */
export function colocarHud(): void {
  BOTON_MENU.x = vista.ancho / vista.hud - 6 - BOTON_MENU.ancho;
}

/** `aviso`: punto amarillo en la esquina (hay puntos de mejora sin gastar). */
export function dibujarBotonMenu(ctx: CanvasRenderingContext2D, aviso = false): void {
  colocarHud();
  const { x, y, ancho, alto } = BOTON_MENU;
  ctx.fillStyle = 'rgba(9, 7, 18, 0.7)';
  ctx.fillRect(x, y, ancho, alto);
  // Una mochila en píxeles: abre el inventario.
  const mx = x + (ancho - 20) / 2;
  const my = y + (alto - 24) / 2;
  ctx.fillStyle = MOCHILA.oscuro;
  ctx.fillRect(mx + 6, my, 8, 2); // asa
  ctx.fillRect(mx + 5, my + 1, 2, 3);
  ctx.fillRect(mx + 13, my + 1, 2, 3);
  ctx.fillRect(mx, my + 3, 20, 21); // contorno
  ctx.fillStyle = MOCHILA.cuerpo;
  ctx.fillRect(mx + 1, my + 4, 18, 19);
  ctx.fillStyle = MOCHILA.solapa;
  ctx.fillRect(mx + 1, my + 4, 18, 7);
  ctx.fillStyle = MOCHILA.oscuro;
  ctx.fillRect(mx + 1, my + 11, 18, 1);
  ctx.fillRect(mx + 5, my + 15, 10, 6); // bolsillo
  ctx.fillStyle = MOCHILA.solapa;
  ctx.fillRect(mx + 6, my + 16, 8, 4);
  ctx.fillStyle = MOCHILA.hebilla;
  ctx.fillRect(mx + 8, my + 9, 4, 4);
  if (aviso) {
    ctx.fillStyle = MOCHILA.oscuro;
    ctx.fillRect(x + ancho - 13, y + 3, 10, 10);
    ctx.fillStyle = PALETA.cursor;
    ctx.fillRect(x + ancho - 12, y + 4, 8, 8);
  }
}
