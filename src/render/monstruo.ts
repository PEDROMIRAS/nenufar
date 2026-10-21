import type { Direccion, MonstruoJson } from '../core/types';
import { aPixel } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';

/** Dirección del sprite más cercana a un vector. */
export function direccionDe(dx: number, dy: number): Direccion {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy < 0 ? 'up' : 'down';
}

/** Dibuja un grupo con los pies en (x, y): el primero delante y los demás asomando a los lados. */
export function dibujarMonstruoMapa(
  ctx: CanvasRenderingContext2D,
  sprites: ReadonlyMap<string, Sprite>,
  pieX: number,
  pieY: number,
  ancho: number,
  grupo: readonly MonstruoJson[],
  direccion: Direccion,
  andando: boolean,
  tiempo: number,
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(aPixel(pieX - ancho / 2 + 2), aPixel(pieY - 3), ancho - 4, 3);
  for (let i = grupo.length - 1; i >= 0; i--) {
    const sprite = sprites.get(grupo[i]!.sprite);
    if (!sprite) continue;
    const dx = i === 0 ? 0 : i % 2 === 1 ? -10 : 10;
    // Desfase por posición en el grupo: así no andan todos al paso.
    const t = tiempo + i * 0.37;
    dibujarFotograma(
      ctx,
      sprite,
      andando ? 'walk' : 'idle',
      direccion,
      t,
      pieX + dx,
      pieY - (i > 0 ? 5 : 0),
    );
  }
}
