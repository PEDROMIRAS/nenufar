import { partirTexto } from '../core/texto';
// Fuentes fijas: construir el texto de la fuente en cada fotograma crearía cadenas en el bucle. La letra es Space
// Mono (index.html la declara; `cargarFuente` la espera antes de dibujar); monoespaciada, como la de antes, para
// que los repartos por número de letras sigan valiendo (ancho de letra en `ANCHO_LETRA`).
export const FAMILIA = "'Space Mono', monospace";
export const FUENTE = `bold 12px ${FAMILIA}`;
export const FUENTE_GRANDE = `bold 24px ${FAMILIA}`;
/** Botones de los menús: algo mayor que el texto normal, que en el móvil se quedaba pequeño. */
export const FUENTE_BOTON = `bold 14px ${FAMILIA}`;
export const FUENTE_LOGO = `bold 48px ${FAMILIA}`;
export const FUENTE_TITULO = `bold 32px ${FAMILIA}`;

/** Espera a que la letra del juego esté cargada (si no carga, se sigue con la monoespaciada del sistema). */
export async function cargarFuente(): Promise<void> {
  try {
    await document.fonts.load(FUENTE);
  } catch {
    // Sin la letra, la del sistema: el juego sigue.
  }
}

/**
 * Texto con sombra, legible sobre cualquier fondo: de 1 px en la letra normal y de 2 px en los títulos grandes
 * (con 1 px se veían planos).
 */
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
  const sombra = fuente === FUENTE || fuente === FUENTE_BOTON ? 1 : 2;
  ctx.fillStyle = '#000';
  ctx.fillText(texto, x + sombra, y + sombra);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y);
}

const LINEAS = new Map<string, string[]>();

/** `partirTexto` recordado por texto y ancho: se pide en cada fotograma y solo se calcula una vez. */
export function partirCacheado(texto: string, letras: number): string[] {
  const clave = `${letras}|${texto}`;
  let lineas = LINEAS.get(clave);
  if (!lineas) {
    lineas = partirTexto(texto, letras);
    LINEAS.set(clave, lineas);
  }
  return lineas;
}
