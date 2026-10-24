import controles from '../data/controles.json';
import { esTactil } from './pantalla';
import { escribir } from './texto';

/** Qué hace cada control y con qué se hace, según se juegue con teclado o con el dedo. */
export const AYUDA_CONTROLES: readonly (readonly string[])[] =
  controles.ayuda[esTactil() ? 'tactil' : 'teclado'];

/** Píxeles de la columna de lo que se hace; la de cómo se hace va a continuación. */
const COLUMNA = 96;
export const ALTO_FILA = 18;

/** La lista de controles en dos columnas, a partir de (x, y). */
export function dibujarControles(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  for (let i = 0; i < AYUDA_CONTROLES.length; i++) {
    const fila = AYUDA_CONTROLES[i]!;
    escribir(ctx, fila[0]!, x, y + i * ALTO_FILA, '#aab8a6');
    escribir(ctx, fila[1]!, x + COLUMNA, y + i * ALTO_FILA, '#e8efe4');
  }
}

/** Texto para el lector de pantalla: «Moverse: Flechas/WASD. Correr: …». */
export const TEXTO_CONTROLES = AYUDA_CONTROLES.map((f) => `${f[0]}: ${f[1]}`).join('. ');
