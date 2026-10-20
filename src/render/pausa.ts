import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO } from './pantalla';
import { escribir, FUENTE_GRANDE } from './texto';

/** Pausa: la heroína a la izquierda, equipo e inventario a la derecha y el menú abajo. */
export function dibujarPausa(
  ctx: CanvasRenderingContext2D,
  izquierda: readonly string[],
  derecha: readonly string[],
  menu: MenuVista,
): void {
  ctx.fillStyle = 'rgba(8, 12, 14, 0.94)';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, 'Pausa', ANCHO / 2, 10, '#ffd27a', 'center', FUENTE_GRANDE);
  columna(ctx, izquierda, 16);
  columna(ctx, derecha, 248);
  dibujarMenu(ctx, menu);
}

/** Líneas de texto; las que acaban en «:» son títulos de apartado. */
function columna(ctx: CanvasRenderingContext2D, lineas: readonly string[], x: number): void {
  ctx.fillStyle = '#1f2a24';
  ctx.fillRect(x, 48, 216, 236);
  lineas.forEach((linea, i) =>
    escribir(ctx, linea, x + 10, 56 + i * 17, linea.endsWith(':') ? '#aab8a6' : '#e8efe4'),
  );
}
