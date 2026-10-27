// Fuentes fijas: construir el texto de la fuente en cada fotograma crearía cadenas en el bucle.
export const FUENTE = 'bold 12px monospace';
export const FUENTE_GRANDE = 'bold 24px monospace';
/** Botones de los menús: algo mayor que el texto normal, que en el móvil se quedaba pequeño. */
export const FUENTE_BOTON = 'bold 14px monospace';
export const FUENTE_LOGO = 'bold 48px monospace';
export const FUENTE_TITULO = 'bold 32px monospace';

/** Texto con sombra de 1 px, legible sobre cualquier fondo. */
export function escribir(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  color = '#efe9da',
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
