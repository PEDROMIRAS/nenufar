import controles from '../data/controles.json';
import { dispositivo, type Dispositivo } from '../input/dispositivo';
import { PALETA } from './marco';
import { escribir } from './texto';

/** Qué hace cada control y con qué se hace, según se juegue con teclado, con el dedo o con mando. */
const AYUDA: Record<Dispositivo, readonly (readonly string[])[]> = controles.ayuda;

/** La ayuda del último dispositivo usado (lista hecha al cargar: no crea nada al dibujar). */
export function ayudaControles(): readonly (readonly string[])[] {
  return AYUDA[dispositivo()];
}

/** Píxeles de la columna de lo que se hace; la de cómo se hace va a continuación. */
const COLUMNA = 96;
export const ALTO_FILA = 18;

/** La lista de controles en dos columnas, a partir de (x, y). */
export function dibujarControles(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const ayuda = ayudaControles();
  for (let i = 0; i < ayuda.length; i++) {
    const fila = ayuda[i]!;
    escribir(ctx, fila[0]!, x, y + i * ALTO_FILA, PALETA.claro);
    escribir(ctx, fila[1]!, x + COLUMNA, y + i * ALTO_FILA, PALETA.texto);
  }
}

const aTexto = (ayuda: readonly (readonly string[])[]): string =>
  ayuda.map((f) => `${f[0]}: ${f[1]}`).join('. ');
const TEXTO: Record<Dispositivo, string> = {
  teclado: aTexto(AYUDA.teclado),
  tactil: aTexto(AYUDA.tactil),
  mando: aTexto(AYUDA.mando),
};

/** Texto para el lector de pantalla: «Moverse: Flechas/WASD. Correr: …». */
export function textoControles(): string {
  return TEXTO[dispositivo()];
}
