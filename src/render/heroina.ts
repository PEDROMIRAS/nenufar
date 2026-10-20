import type { Heroina } from '../core/heroina';
import { dibujarFotograma, type Sprite } from './recursos';

/** Dibuja a la heroína en su posición interpolada, con el ancla del sprite en los pies. */
export function dibujarHeroina(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  h: Heroina,
  alpha: number,
): void {
  const x = h.xAnterior + (h.cuerpo.x - h.xAnterior) * alpha;
  const y = h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha;
  dibujarFotograma(ctx, sprite, h.animacion, h.direccion, h.tiempoAnimacion, x, y);
}
