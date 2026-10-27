import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA } from './marco';
import { ANCHO, esTactil } from './pantalla';
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
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 16, 'Dificultad');
  escribir(ctx, subtitulo, ANCHO / 2, 56, PALETA.apagada, 'center');
  dibujarMarco(ctx, 40, 96, ANCHO - 80, 140);
  escribir(ctx, ficha.nombre, ANCHO / 2, 112, PALETA.elegida, 'center', FUENTE_GRANDE);
  for (let i = 0; i < ficha.lineas.length; i++)
    escribir(ctx, ficha.lineas[i]!, 56, 160 + i * 18, PALETA.texto);
  escribir(
    ctx,
    esTactil() ? 'Toca una dificultad para empezar' : '← → elegir · Enter empezar · Esc volver',
    ANCHO / 2,
    256,
    PALETA.apagada,
    'center',
  );
  dibujarMenu(ctx, menu);
}
