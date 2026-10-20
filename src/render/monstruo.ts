import type { MonstruoJson } from '../core/types';

// shortcut: los monstruos del mapa son rectángulos que botan hasta que tengan sprite (hito 6).
/** Altura extra del rectángulo sobre su caja de colisión, para que se vea como un cuerpo. */
const CUERPO = 8;

/** Dibuja un grupo con los pies en (x, y): el primero delante y los demás asomando detrás, más pequeños. */
export function dibujarMonstruoMapa(
  ctx: CanvasRenderingContext2D,
  pieX: number,
  pieY: number,
  ancho: number,
  alto: number,
  grupo: readonly MonstruoJson[],
  tiempo: number,
): void {
  const bote = Math.round(Math.abs(Math.sin(tiempo * 4)) * 2);
  const x = Math.round(pieX - ancho / 2);
  const y = Math.round(pieY - alto - CUERPO - bote);
  for (let i = grupo.length - 1; i >= 1; i--) {
    ctx.fillStyle = grupo[i]!.color;
    ctx.fillRect(x + (i % 2 === 1 ? -6 : ancho - 6), y - 6, 12, 14);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x + 2, Math.round(pieY - 3), ancho - 4, 3);
  ctx.fillStyle = grupo[0]?.color ?? '#999';
  ctx.fillRect(x, y, ancho, alto + CUERPO);
}
