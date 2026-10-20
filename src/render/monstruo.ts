import type { Direccion, MonstruoJson } from '../core/types';
import type { Sprite } from './recursos';

/** Dibuja el fotograma de `animacion` que toca a los `tiempo` segundos, con el ancla en (x, y). */
export function dibujarFotograma(
  ctx: CanvasRenderingContext2D,
  { imagen, datos }: Sprite,
  animacion: string,
  direccion: Direccion,
  tiempo: number,
  x: number,
  y: number,
  escala = 1,
): void {
  const anim = datos.animations[animacion];
  if (!anim) return;
  const n = Math.floor(tiempo * anim.fps);
  const columna = anim.startColumn + (anim.loop ? n % anim.frames : Math.min(n, anim.frames - 1));
  const w = datos.frameWidth;
  const a = datos.frameHeight;
  ctx.drawImage(
    imagen,
    columna * w,
    datos.directions[direccion] * a,
    w,
    a,
    Math.round(x - datos.anchor.x * escala),
    Math.round(y - datos.anchor.y * escala),
    w * escala,
    a * escala,
  );
}

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
  ctx.fillRect(Math.round(pieX - ancho / 2 + 2), Math.round(pieY - 3), ancho - 4, 3);
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
