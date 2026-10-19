import type { Heroina } from '../core/heroina';
import type { Sprite } from './recursos';

/** Dibuja a la heroína en su posición interpolada, con el ancla del sprite en los pies. */
export function dibujarHeroina(
  ctx: CanvasRenderingContext2D,
  { imagen, datos }: Sprite,
  h: Heroina,
  alpha: number,
): void {
  const anim = datos.animations[h.animacion];
  if (!anim) return;
  const n = Math.floor(h.tiempoAnimacion * anim.fps);
  const columna = anim.startColumn + (anim.loop ? n % anim.frames : Math.min(n, anim.frames - 1));
  const fila = datos.directions[h.direccion];
  const x = h.xAnterior + (h.cuerpo.x - h.xAnterior) * alpha;
  const y = h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha;
  const w = datos.frameWidth;
  const alto = datos.frameHeight;
  ctx.drawImage(
    imagen,
    columna * w,
    fila * alto,
    w,
    alto,
    Math.round(x - datos.anchor.x),
    Math.round(y - datos.anchor.y),
    w,
    alto,
  );
}
