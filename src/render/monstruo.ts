import type { Caja } from '../core/monstruos';

// shortcut: los monstruos del mapa son rectángulos que botan hasta que tengan sprite (hito 6).
/** Altura extra del rectángulo sobre su caja de colisión, para que se vea como un cuerpo. */
const CUERPO = 8;

export function dibujarMonstruoMapa(
  ctx: CanvasRenderingContext2D,
  m: Caja,
  color: string,
  tiempo: number,
): void {
  const bote = Math.round(Math.abs(Math.sin(tiempo * 4)) * 2);
  const x = Math.round(m.x - m.ancho / 2);
  const y = Math.round(m.y - m.alto - CUERPO - bote);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(x + 2, Math.round(m.y - 3), m.ancho - 4, 3);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, m.ancho, m.alto + CUERPO);
}
