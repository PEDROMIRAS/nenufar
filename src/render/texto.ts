// Fuentes fijas: construir el texto de la fuente en cada fotograma crearía cadenas en el bucle.
export const FUENTE = 'bold 12px monospace';
export const FUENTE_GRANDE = 'bold 24px monospace';
export const FUENTE_LOGO = 'bold 48px monospace';

/** Texto con sombra de 1 px, legible sobre cualquier fondo. */
export function escribir(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  color = '#e8efe4',
  alinear: CanvasTextAlign = 'left',
  fuente = FUENTE,
): void {
  ctx.font = fuente;
  ctx.textAlign = alinear;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(texto, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
}
