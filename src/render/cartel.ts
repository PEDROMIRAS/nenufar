import { PALETA } from './marco';
import { cartel, colocarCartel } from './pantalla';
import { escribir } from './texto';

/** Ancho de la caja del cartel, en unidades del HUD (le cabe «Mando conectado» con aire). */
const ANCHO_CAJA = 200;
const ALTO_CAJA = 26;
/**
 * Altura del cartel, en fracción de la ventana: abajo pisaba los textos del pie («Pulsa o toca para empezar»,
 * los botones del móvil de pie), así que va sobre la escena, algo por debajo del centro.
 */
const ALTURA = 0.62;

/**
 * Cartel centrado, algo por debajo de la mitad, encima de cualquier escena, con el estilo de los avisos del mapa. Cambia la
 * transformación del contexto: va lo último del fotograma (el siguiente `colocarContexto` la repone).
 */
export function dibujarCartel(
  ctx: CanvasRenderingContext2D,
  texto: string,
  opacidad: number,
): void {
  colocarCartel(ctx);
  // Esquina en píxel entero: si no, el borde de 1 px sale borroso.
  const izquierda = Math.round(cartel.ancho / 2 - ANCHO_CAJA / 2);
  const y = Math.round(cartel.alto * ALTURA);
  ctx.globalAlpha = opacidad;
  ctx.fillStyle = 'rgba(9, 7, 18, 0.85)';
  ctx.fillRect(izquierda, y, ANCHO_CAJA, ALTO_CAJA);
  ctx.strokeStyle = PALETA.filete;
  ctx.lineWidth = 1;
  ctx.strokeRect(izquierda + 0.5, y + 0.5, ANCHO_CAJA - 1, ALTO_CAJA - 1);
  escribir(ctx, texto, izquierda + ANCHO_CAJA / 2, y + 6, PALETA.cursor, 'center');
  ctx.globalAlpha = 1;
}
