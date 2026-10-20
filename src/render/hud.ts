import type { Luchador } from '../core/combate';
import { barra, COLOR_BARRA } from './combate';
import { ANCHO } from './pantalla';
import { escribir } from './texto';

/** Textos del HUD; la escena los rehace solo cuando cambia algún valor. */
export interface TextosHud {
  cabecera: string;
  pv: string;
  pm: string;
}

/** Zona, nivel, PV y PM de la heroína, arriba a la izquierda del mapa. */
export function dibujarHud(ctx: CanvasRenderingContext2D, h: Luchador, t: TextosHud): void {
  ctx.fillStyle = 'rgba(8, 14, 10, 0.6)';
  ctx.fillRect(6, 6, 150, 50);
  escribir(ctx, t.cabecera, 12, 10);
  barra(ctx, 12, 30, 80, h.pv / h.pvMax, COLOR_BARRA.pv);
  escribir(ctx, t.pv, 98, 26);
  barra(ctx, 12, 44, 80, h.pm / Math.max(1, h.pmMax), COLOR_BARRA.pm);
  escribir(ctx, t.pm, 98, 40);
}

/** Aviso centrado en la parte baja del mapa («La fuente te restaura…»). */
export function dibujarAviso(ctx: CanvasRenderingContext2D, texto: string): void {
  ctx.fillStyle = 'rgba(8, 14, 10, 0.75)';
  ctx.fillRect(ANCHO / 2 - 170, 306, 340, 26);
  escribir(ctx, texto, ANCHO / 2, 312, '#ffd27a', 'center');
}

/** Botón de menú en la esquina superior derecha del mapa (para el móvil; con teclado es Escape). */
export const BOTON_MENU = { x: ANCHO - 6 - 36, y: 6, ancho: 36, alto: 36 };

export function dibujarBotonMenu(ctx: CanvasRenderingContext2D): void {
  const { x, y, ancho, alto } = BOTON_MENU;
  ctx.fillStyle = 'rgba(8, 14, 10, 0.6)';
  ctx.fillRect(x, y, ancho, alto);
  // Tres rayas: el icono habitual de menú.
  ctx.fillStyle = '#e8efe4';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 9, y + 10 + i * 7, ancho - 18, 3);
}
