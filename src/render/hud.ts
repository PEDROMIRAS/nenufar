import type { Luchador } from '../core/combate';
import { barra, COLOR_BARRA } from './combate';
import { ALTO, ANCHO } from './pantalla';
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
const MOCHILA = { oscuro: '#4a2c1a', cuerpo: '#8a5a34', solapa: '#b07a44', hebilla: '#e2b648' };

/** Botón de la mochila (abre el inventario), arriba a la derecha. */
export const BOTON_MENU = { x: ANCHO - 6 - 44, y: 6, ancho: 44, alto: 44 };

/** `aviso`: punto amarillo en la esquina (hay puntos de mejora sin gastar). */
export function dibujarBotonMenu(ctx: CanvasRenderingContext2D, aviso = false): void {
  const { x, y, ancho, alto } = BOTON_MENU;
  ctx.fillStyle = 'rgba(8, 14, 10, 0.6)';
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
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(x + ancho - 12, y + 4, 8, 8);
  }
}

/** Botón de correr, abajo a la derecha (para el móvil; con teclado se mantiene Mayúsculas). */
export const BOTON_CORRER = { x: ANCHO - 6 - 44, y: ALTO - 6 - 44, ancho: 44, alto: 44 };

/** Dos flechas («»); encendido, en amarillo sobre fondo más claro. */
export function dibujarBotonCorrer(ctx: CanvasRenderingContext2D, activo: boolean): void {
  const { x, y, ancho, alto } = BOTON_CORRER;
  ctx.fillStyle = activo ? 'rgba(255, 210, 122, 0.3)' : 'rgba(8, 14, 10, 0.6)';
  ctx.fillRect(x, y, ancho, alto);
  ctx.fillStyle = activo ? '#ffd27a' : '#e8efe4';
  for (const dx of [9, 22]) {
    for (let i = 0; i <= 10; i++) {
      // Cada flecha, dos trazos que bajan y suben hasta juntarse en la punta.
      ctx.fillRect(x + dx + i, y + 12 + i, 3, 2);
      ctx.fillRect(x + dx + i, y + 32 - i, 3, 2);
    }
  }
}

/** Bajo el HUD, mientras las puertas están cerradas: cuántos grupos de monstruos faltan. */
export function dibujarQuedan(ctx: CanvasRenderingContext2D, texto: string): void {
  ctx.fillStyle = 'rgba(8, 14, 10, 0.6)';
  ctx.fillRect(6, 60, 150, 20);
  escribir(ctx, texto, 12, 64, '#ffd27a');
}
