import type { Direccion, SpriteJson, TilesetJson } from '../core/types';
import { aPixel } from './pantalla';

export interface Sprite {
  /** La hoja (o una copia recoloreada, como la heroína con su equipo). */
  imagen: CanvasImageSource;
  datos: SpriteJson;
}

const BASE = import.meta.env.BASE_URL;

export async function cargarImagen(ruta: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = BASE + ruta;
  await img.decode();
  return img;
}

export async function cargarJson<T>(ruta: string): Promise<T> {
  const respuesta = await fetch(BASE + ruta);
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${ruta} (${respuesta.status})`);
  return (await respuesta.json()) as T;
}

/** Tilesets de una zona, en este orden: los de la zona, los comunes y los autotiles. */
export async function cargarTilesets(
  zona: string,
): Promise<{ tilesets: TilesetJson[]; imagenes: HTMLImageElement[] }> {
  const nombres = [zona, 'comunes', `${zona}_autotiles`];
  const [tilesets, imagenes] = await Promise.all([
    Promise.all(nombres.map((n) => cargarJson<TilesetJson>(`assets/tilesets/${n}.json`))),
    Promise.all(nombres.map((n) => cargarImagen(`assets/tilesets/${n}.png`))),
  ]);
  return { tilesets, imagenes };
}

/** Varias hojas a la vez, por nombre (los repetidos se cargan una vez). */
export async function cargarSprites(nombres: readonly string[]): Promise<Map<string, Sprite>> {
  const unicos = [...new Set(nombres)];
  const sprites = await Promise.all(unicos.map(cargarSprite));
  return new Map(unicos.map((n, i) => [n, sprites[i]!]));
}

export async function cargarSprite(nombre: string): Promise<Sprite> {
  const [imagen, datos] = await Promise.all([
    cargarImagen(`assets/sprites/${nombre}.png`),
    cargarJson<SpriteJson>(`assets/sprites/${nombre}.json`),
  ]);
  return { imagen, datos };
}

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
    aPixel(x - datos.anchor.x * escala),
    aPixel(y - datos.anchor.y * escala),
    w * escala,
    a * escala,
  );
}
