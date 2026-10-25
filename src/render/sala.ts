import type { Tile } from '../core/sala';

/** Dibuja el tile (o su fotograma `frame`, si es animado) con la esquina en (x, y). */
export function dibujarTile(
  ctx: CanvasRenderingContext2D,
  imagenes: readonly HTMLImageElement[],
  tile: Tile,
  tam: number,
  x: number,
  y: number,
  frame = 0,
): void {
  const img = imagenes[tile.hoja];
  if (!img) return;
  const columnas = img.width / tam;
  const i = tile.index + frame;
  ctx.drawImage(
    img,
    (i % columnas) * tam,
    Math.floor(i / columnas) * tam,
    tam,
    tam,
    x,
    y,
    tam,
    tam,
  );
}
