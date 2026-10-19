import type { SpriteJson, TilesetJson } from '../core/types';

export interface Sprite {
  imagen: HTMLImageElement;
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

export async function cargarSprite(nombre: string): Promise<Sprite> {
  const [imagen, datos] = await Promise.all([
    cargarImagen(`assets/sprites/${nombre}.png`),
    cargarJson<SpriteJson>(`assets/sprites/${nombre}.json`),
  ]);
  return { imagen, datos };
}
