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
