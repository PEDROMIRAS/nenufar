import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO, esTactil, FONDO } from './pantalla';
import { escribir, FUENTE_GRANDE } from './texto';

/** Lo que se cuenta de cada dificultad, ya en líneas. */
export interface FichaDificultad {
  nombre: string;
  lineas: string[];
}

/** Elección de dificultad: título, ficha de la elegida y los botones. */
export function dibujarDificultad(
  ctx: CanvasRenderingContext2D,
  subtitulo: string,
  ficha: FichaDificultad,
  menu: MenuVista,
): void {
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, 'Dificultad', ANCHO / 2, 16, '#ffd27a', 'center', FUENTE_GRANDE);
  escribir(ctx, subtitulo, ANCHO / 2, 50, '#aab8a6', 'center');
  ctx.fillStyle = '#1f2a24';
  ctx.fillRect(40, 96, ANCHO - 80, 140);
  escribir(ctx, ficha.nombre, ANCHO / 2, 112, '#e8efe4', 'center', FUENTE_GRANDE);
  for (let i = 0; i < ficha.lineas.length; i++)
    escribir(ctx, ficha.lineas[i]!, 56, 160 + i * 18, '#e8efe4');
  escribir(
    ctx,
    esTactil() ? 'Toca una dificultad para empezar' : '← → elegir · Enter empezar · Esc volver',
    ANCHO / 2,
    256,
    '#aab8a6',
    'center',
  );
  dibujarMenu(ctx, menu);
}
