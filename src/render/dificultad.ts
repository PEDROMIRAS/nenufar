import { botonesAltosCacheados, letrasEnAncho } from '../core/disposicion';
import { VERTICAL } from '../data/datos';
import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA } from './marco';
import { ANCHO, esTactil, interfaz } from './pantalla';
import { escribir, FUENTE_GRANDE } from './texto';

/** Lo que se cuenta de cada dificultad, ya en líneas. */
export interface FichaDificultad {
  nombre: string;
  lineas: string[];
}

/** Letras por línea de la descripción dentro de la ficha: las de siempre o, en la interfaz alta, las que caben. */
export function letrasFicha(): number {
  return interfaz.alta ? letrasEnAncho(interfaz.ancho - 2 * VERTICAL.menu.margen - 32) : 50;
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
  escribir(ctx, subtitulo, interfaz.ancho / 2, 56, PALETA.apagada, 'center');
  const alta = interfaz.alta;
  const margen = VERTICAL.menu.margen;
  // En la interfaz alta la ficha ocupa el ancho entero y la pista queda justo sobre los botones de abajo.
  const x = alta ? margen : 40;
  const anchoFicha = alta ? interfaz.ancho - 2 * margen : ANCHO - 80;
  const altoFicha = alta ? 60 + ficha.lineas.length * 18 : 140;
  dibujarMarco(ctx, x, alta ? 88 : 96, anchoFicha, altoFicha);
  const centro = interfaz.ancho / 2;
  escribir(ctx, ficha.nombre, centro, alta ? 104 : 112, PALETA.elegida, 'center', FUENTE_GRANDE);
  for (let i = 0; i < ficha.lineas.length; i++)
    escribir(ctx, ficha.lineas[i]!, x + 16, (alta ? 144 : 160) + i * 18, PALETA.texto);
  const yBotones = alta
    ? botonesAltosCacheados(menu.opciones.length, interfaz.ancho, interfaz.alto, VERTICAL)[0]!.y
    : 0;
  escribir(
    ctx,
    esTactil() ? 'Toca una dificultad para empezar' : '← → elegir · Enter empezar · Esc volver',
    centro,
    alta ? yBotones - 22 : 256,
    PALETA.apagada,
    'center',
  );
  dibujarMenu(ctx, menu);
}
