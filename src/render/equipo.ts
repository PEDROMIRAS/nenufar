import { rectOpcion } from './combate';
import { ALTO, ANCHO } from './pantalla';
import { escribir, FUENTE_GRANDE } from './texto';

export interface FichaPieza {
  nombre: string;
  lineas: string[];
}

export const OPCIONES_EQUIPO = ['Cambiar', 'Quedarme la mía'] as const;

/** Comparación de la pieza que se lleva con la encontrada, y los dos botones para decidir. */
export function dibujarComparacion(
  ctx: CanvasRenderingContext2D,
  titulo: string,
  actual: FichaPieza,
  nueva: FichaPieza,
  seleccion: number,
): void {
  ctx.fillStyle = '#141a1f';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, titulo, ANCHO / 2, 16, '#ffd27a', 'center', FUENTE_GRANDE);
  ficha(ctx, 'Llevas', actual, 24);
  ficha(ctx, 'Nueva', nueva, 248);
  OPCIONES_EQUIPO.forEach((texto, i) => {
    const r = rectOpcion(i, OPCIONES_EQUIPO.length);
    ctx.fillStyle = i === seleccion ? '#4f6b5a' : '#2b3a33';
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    if (i === seleccion) {
      ctx.fillStyle = '#8fa88a';
      ctx.fillRect(r.x, r.y, r.ancho, 2);
      ctx.fillRect(r.x, r.y + r.alto - 2, r.ancho, 2);
    }
    escribir(ctx, texto, r.x + r.ancho / 2, r.y + 17, '#e8efe4', 'center');
  });
}

function ficha(ctx: CanvasRenderingContext2D, etiqueta: string, f: FichaPieza, x: number): void {
  ctx.fillStyle = '#1f2a24';
  ctx.fillRect(x, 64, 208, 200);
  escribir(ctx, etiqueta, x + 12, 72, '#aab8a6');
  escribir(ctx, f.nombre, x + 12, 96, '#e8efe4');
  f.lineas.forEach((linea, i) => escribir(ctx, linea, x + 12, 124 + i * 18, '#c89bff'));
}
