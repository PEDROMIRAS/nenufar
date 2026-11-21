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

/** Contorno y sombra de los títulos grandes, por tamaño: el grosor del contorno y lo que baja la sombra. */
const RELIEVE = new Map<string, { contorno: number; sombra: number }>([
  [FUENTE_GRANDE, { contorno: 3.5, sombra: 2.5 }],
  [FUENTE_TITULO, { contorno: 4.5, sombra: 3 }],
  [FUENTE_LOGO, { contorno: 7, sombra: 5 }],
]);
const CONTORNO = '#120c22';

/**
 * Da contorno y sombra a otra letra grande de `px` píxeles, en la misma proporción que los títulos (los números de
 * daño que flotan en el combate). Se llama al cargar, no en el bucle.
 */
export function conRelieve(fuente: string, px: number): void {
  RELIEVE.set(fuente, { contorno: px / 7, sombra: px / 10 });
}

/**
 * Texto legible sobre cualquier fondo: la letra normal y la de los botones, con una sombra de 1 px; los títulos
 * grandes, con contorno oscuro y sombra debajo (con solo la sombra se veían planos; elegido por Pedro entre cuatro
 * estilos).
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
  const relieve = RELIEVE.get(fuente);
  if (relieve) {
    ctx.fillStyle = '#000';
    ctx.fillText(texto, x + relieve.sombra, y + relieve.sombra);
    ctx.lineJoin = 'round';
    ctx.lineWidth = relieve.contorno;
    ctx.strokeStyle = CONTORNO;
    ctx.strokeText(texto, x, y);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillText(texto, x + 1, y + 1);
  }
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
