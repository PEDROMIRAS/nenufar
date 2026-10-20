import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO, FONDO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

/** Caracteres como mucho: lo que cabe sin descuadrar el combate y el inventario. */
export const LARGO_NOMBRE = 12;
/** Dónde va el campo de texto, en píxeles lógicos. */
export const RECT_CAMPO = { x: 120, y: 196, ancho: 240, alto: 32 };

/** Pantalla del nombre: la rana elegida grande; el campo de texto HTML va encima, en RECT_CAMPO. */
export function dibujarNombre(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  tipo: string,
  tiempo: number,
  menu: MenuVista,
): void {
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, '¿Cómo se llama tu rana?', ANCHO / 2, 16, '#ffd27a', 'center', FUENTE_GRANDE);
  dibujarFotograma(ctx, sprite, 'idle', 'down', tiempo, ANCHO / 2, 160, 3);
  escribir(ctx, tipo, ANCHO / 2, 172, '#aab8a6', 'center');
  escribir(
    ctx,
    'Escribe un nombre · Enter para seguir · Esc volver',
    ANCHO / 2,
    252,
    '#aab8a6',
    'center',
  );
  dibujarMenu(ctx, menu);
}
