import * as THREE from 'three';
import type { Tile } from '../../core/sala';
import { dibujarTile } from '../sala';

/** Lienzo de `ancho`×`alto` casillas pintado por `pintor`. */
export function pintar(
  ancho: number,
  alto: number,
  tam: number,
  pintor: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho * tam;
  lienzo.height = alto * tam;
  pintor(lienzo.getContext('2d')!);
  return lienzo;
}

/** Lienzo de una casilla con el tile `t`. */
export function tileSuelto(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
): HTMLCanvasElement {
  return pintar(1, 1, tam, (ctx) => dibujarTile(ctx, imagenes, t, tam, 0, 0));
}

export function textura(lienzo: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(lienzo);
  ajustarPixelArt(tex);
  return tex;
}

/** Sin suavizado ni mipmaps: los píxeles se ven nítidos a cualquier distancia. */
export function ajustarPixelArt(tex: THREE.Texture): void {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

/** Color en el formato de `fillStyle`: los JSON los traen como texto y las paletas sacadas del arte, como número. */
const css = (c: number | string): string =>
  typeof c === 'string' ? c : `#${c.toString(16).padStart(6, '0')}`;

/** Textura pequeña de píxeles de la paleta, al azar con los pesos dados, para dar grano de pixel art. */
export function ruido(
  colores: readonly (number | string)[],
  pesos: readonly number[],
  azar: () => number,
  repetirX: number,
  repetirY: number,
): THREE.CanvasTexture {
  const lado = 16;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = azar();
      let i = 0;
      while (i < pesos.length - 1 && r >= (pesos[i] ?? 0)) r -= pesos[i++] ?? 0;
      ctx.fillStyle = css(colores[i] ?? 0);
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = textura(lienzo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetirX, repetirY);
  return tex;
}

/** Cuántos píxeles opacos hay de cada color en el tile `t`. */
export function cuentaColores(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
): Map<number, number> {
  const ctx = tileSuelto(imagenes, t, tam).getContext('2d')!;
  const px = ctx.getImageData(0, 0, tam, tam).data;
  const cuenta = new Map<number, number>();
  for (let i = 0; i < px.length; i += 4) {
    if ((px[i + 3] ?? 0) < 250) continue; // la sombra del suelo es semitransparente
    const color = ((px[i] ?? 0) << 16) | ((px[i + 1] ?? 0) << 8) | (px[i + 2] ?? 0);
    cuenta.set(color, (cuenta.get(color) ?? 0) + 1);
  }
  return cuenta;
}

const brillo = (c: number): number => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);

/**
 * Los `n` colores más usados del sprite (sin contar la sombra gris del suelo), de claro a oscuro.
 * `filtro` deja solo los que interesan (los verdes de las hojas de un pino, no su tronco).
 */
export function paleta(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
  n: number,
  filtro: (r: number, g: number, b: number) => boolean = () => true,
): number[] {
  return [...cuentaColores(imagenes, t, tam).entries()]
    .filter(([c]) => filtro((c >> 16) & 255, (c >> 8) & 255, c & 255))
    .sort((x, y) => y[1] - x[1])
    .slice(0, n)
    .map(([c]) => c)
    .sort((x, y) => brillo(y) - brillo(x));
}

/** Material con grano de pixel art y caras planas, como todos los modelos. */
export function materialRuido(
  colores: readonly (number | string)[],
  pesos: readonly number[],
  azar: () => number,
  repetir = 1,
): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map: ruido(colores, pesos, azar, repetir, repetir),
    flatShading: true,
  });
}
