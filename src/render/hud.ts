import type { Luchador } from '../core/combate';
import { barra, COLOR_BARRA } from './combate';
import { PALETA } from './marco';
import { SALA_ALTO, vista } from './pantalla';
import { escribir } from './texto';

/** El HUD del mapa se dibuja a esta fracción de la escala, para que no tape tanto; sus medidas son de ese espacio. */
export const ESCALA_HUD = 0.75;

/** Textos del HUD; la escena los rehace solo cuando cambia algún valor. */
export interface TextosHud {
  cabecera: string;
  pv: string;
  pm: string;
}

/** Zona, nivel, PV y PM de la heroína, arriba a la izquierda del mapa. */
export function dibujarHud(ctx: CanvasRenderingContext2D, h: Luchador, t: TextosHud): void {
  ctx.fillStyle = 'rgba(9, 7, 18, 0.7)';
  ctx.fillRect(6, 6, 150, 50);
  escribir(ctx, t.cabecera, 12, 10);
  barra(ctx, 12, 30, 80, h.pv / h.pvMax, COLOR_BARRA.pv);
  escribir(ctx, t.pv, 98, 26);
  barra(ctx, 12, 44, 80, h.pm / Math.max(1, h.pmMax), COLOR_BARRA.pm);
  escribir(ctx, t.pm, 98, 40);
}

/** Aviso centrado en la parte baja de la sala («La fuente te restaura…»). */
export function dibujarAviso(ctx: CanvasRenderingContext2D, texto: string): void {
  const y = (vista.alto + SALA_ALTO) / 2 / ESCALA_HUD - 46;
  const x = vista.ancho / 2 / ESCALA_HUD;
  ctx.fillStyle = 'rgba(9, 7, 18, 0.8)';
  ctx.fillRect(x - 170, y, 340, 26);
  escribir(ctx, texto, x, y + 6, PALETA.cursor, 'center');
}

/** Botón de menú en la esquina superior derecha del mapa (para el móvil; con teclado es Escape). */
const MOCHILA = { oscuro: '#4a2c1a', cuerpo: '#8a5a34', solapa: '#b07a44', hebilla: '#e2b648' };

/** Botón de la mochila (abre el inventario), arriba a la derecha de la ventana; `colocarHud` fija su x. */
export const BOTON_MENU = { x: 0, y: 6, ancho: 44, alto: 44 };

/** Pone la interfaz del mapa en los lados de la ventana, según su forma. */
export function colocarHud(): void {
  BOTON_MENU.x = vista.ancho / ESCALA_HUD - 6 - BOTON_MENU.ancho;
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

/** Bajo el HUD, mientras las puertas están cerradas: cuántos grupos de monstruos faltan. */
export function dibujarQuedan(ctx: CanvasRenderingContext2D, texto: string): void {
  ctx.fillStyle = 'rgba(9, 7, 18, 0.7)';
  ctx.fillRect(6, 60, 150, 20);
  escribir(ctx, texto, 12, 64, PALETA.cursor);
}
