import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarFondo, PALETA } from './marco';
import { ANCHO, esTactil } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir } from './texto';

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
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 16, '¿Cómo se llama tu rana?');
  dibujarFotograma(ctx, sprite, 'idle', 'down', tiempo, ANCHO / 2, 160, 3);
  escribir(ctx, tipo, ANCHO / 2, 172, PALETA.claro, 'center');
  escribir(
    ctx,
    esTactil()
      ? 'Escribe un nombre y toca Seguir'
      : 'Escribe un nombre · Enter seguir · ↓ botones · Esc volver',
    ANCHO / 2,
    252,
    PALETA.apagada,
    'center',
  );
  dibujarMenu(ctx, menu);
}
