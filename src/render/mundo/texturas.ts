import * as THREE from 'three';
import type { Tile } from '../../core/sala';
import { crearAzar } from '../../core/azar';
import { normalesDeSprite, type OpcionesRelieve } from '../../core/relieve';
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

/** Colores ya contados, por tile: cada objeto de la sala pedía los de su tile y leer los píxeles es caro. */
const CUENTAS = new WeakMap<Tile, Map<number, number>>();

/** Cuántos píxeles opacos hay de cada color en el tile `t`. No se modifica lo devuelto (se comparte). */
export function cuentaColores(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
): Map<number, number> {
  const guardada = CUENTAS.get(t);
  if (guardada) return guardada;
  const ctx = tileSuelto(imagenes, t, tam).getContext('2d')!;
  const px = ctx.getImageData(0, 0, tam, tam).data;
  const cuenta = new Map<number, number>();
  for (let i = 0; i < px.length; i += 4) {
    if ((px[i + 3] ?? 0) < 250) continue; // la sombra del suelo es semitransparente
    const color = ((px[i] ?? 0) << 16) | ((px[i + 1] ?? 0) << 8) | (px[i + 2] ?? 0);
    cuenta.set(color, (cuenta.get(color) ?? 0) + 1);
  }
  CUENTAS.set(t, cuenta);
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

/**
 * Textura de 64×64 sin costuras: manchas de ruido de valores en varias escalas repartidas entre los colores según
 * sus pesos, con un poco de grano por encima. Los píxeles son ocho veces más finos que los de `ruido`.
 */
function manchas(
  colores: readonly (number | string)[],
  pesos: readonly number[],
  azar: () => number,
): THREE.CanvasTexture {
  const lado = 64;
  const octavas = [4, 8, 16].map((celdas, o) => {
    const rejilla = Array.from({ length: celdas * celdas }, azar);
    return { celdas, peso: [0.55, 0.3, 0.15][o] ?? 0, rejilla };
  });
  const suave = (t: number): number => t * t * (3 - 2 * t);
  const valor = (x: number, y: number): number =>
    octavas.reduce((suma, { celdas, peso, rejilla }) => {
      const fx = (x / lado) * celdas;
      const fy = (y / lado) * celdas;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = suave(fx - x0);
      const ty = suave(fy - y0);
      const v = (i: number, j: number): number =>
        rejilla[(j % celdas) * celdas + (i % celdas)] ?? 0;
      const arriba = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
      const abajo = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
      return suma + peso * (arriba * (1 - ty) + abajo * ty);
    }, 0);

  const valores = Array.from({ length: lado * lado }, (_, i) =>
    valor(i % lado, Math.floor(i / lado)),
  );
  // Reparto por rango, no por valor, para que cada color ocupe lo que dice su peso.
  const orden = valores.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const total = pesos.reduce((a, b) => a + b, 0);
  const color = new Array<number | string>(valores.length);
  let acumulado = 0;
  let k = 0;
  orden.forEach(([, i], rango) => {
    while (k < pesos.length - 1 && rango >= ((acumulado + (pesos[k] ?? 0)) / total) * orden.length)
      acumulado += pesos[k++] ?? 0;
    color[i] = colores[k] ?? 0;
  });

  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  color.forEach((c, i) => {
    ctx.fillStyle = css(c);
    ctx.fillRect(i % lado, Math.floor(i / lado), 1, 1);
  });
  // Grano fino: claro u oscuro al azar, sin cambiar de color.
  for (let i = 0; i < lado * lado * 0.25; i++) {
    ctx.fillStyle = azar() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(Math.floor(azar() * lado), Math.floor(azar() * lado), 1, 1);
  }

  const tex = new THREE.CanvasTexture(lienzo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Variantes de cada textura de manchas que se reutilizan (por colores, pesos y repetición). */
const VARIANTES_RUIDO = 3;
const RUIDO = new Map<string, THREE.CanvasTexture[]>();

/** Semilla estable de un texto (FNV-1a), para que cada variante salga igual sea cual sea el orden de las salas. */
function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Material de los modelos: manchas de los colores del sprite, con filtro lineal y mipmaps, y caras facetadas. La
 * textura es una de `VARIANTES_RUIDO` por colores y pesos, hecha una vez por zona (`olvidarRuido` las olvida al
 * vaciarla): hacer una por roca o columna costaba ~135 ms al entrar en una sala en un móvil medio. Gasta siempre
 * un número del azar, haya que hacer la textura o no, para que lo que venga después salga igual.
 */
export function materialRuido(
  colores: readonly (number | string)[],
  pesos: readonly number[],
  azar: () => number,
  repetir = 1,
): THREE.MeshLambertMaterial {
  const clave = `${colores.join(',')}|${pesos.join(',')}|${repetir}`;
  const variante = Math.floor(azar() * VARIANTES_RUIDO);
  let lista = RUIDO.get(clave);
  if (!lista) RUIDO.set(clave, (lista = []));
  let map = lista[variante];
  if (!map) {
    map = manchas(colores, pesos, crearAzar(semillaDe(clave) + variante));
    map.repeat.set(repetir, repetir);
    lista[variante] = map;
  }
  return new THREE.MeshLambertMaterial({ map, flatShading: true });
}

/** Olvida las texturas de manchas de la zona (al vaciarla, que las suelta con sus materiales). */
export function olvidarRuido(): void {
  RUIDO.clear();
}

/**
 * Mapas de normales ya hechos, por hoja: una textura base que no se usa ni se suelta; cada actor lleva un `clone()`,
 * que comparte la imagen (una sola subida a la GPU por hoja) con su propio desplazamiento. Débil: una hoja que ya no
 * existe (la heroína vestida con otro equipo) se olvida sola.
 */
const NORMALES = new WeakMap<object, THREE.Texture>();

/**
 * Mapa de normales de una hoja de pixel art (ver `normalesDeSprite`), para que la luz la envuelva. Textura lineal,
 * sin suavizado, con la misma rejilla que la hoja; cada llamada da una copia propia que se puede soltar.
 */
export function texturaNormales(
  img: HTMLImageElement | HTMLCanvasElement,
  o: OpcionesRelieve,
): THREE.Texture {
  return normalesBase(img, o).clone();
}

/**
 * Calcula ya el mapa de normales de una hoja, sin dar copia: al cargar una zona, para que entrar en una sala con
 * un monstruo nuevo no se pare a calcularlo (~235 ms en un móvil medio).
 */
export function prepararNormales(
  img: HTMLImageElement | HTMLCanvasElement,
  o: OpcionesRelieve,
): void {
  normalesBase(img, o);
}

function normalesBase(
  img: HTMLImageElement | HTMLCanvasElement,
  o: OpcionesRelieve,
): THREE.Texture {
  let base = NORMALES.get(img);
  if (!base) {
    const ancho = (img as HTMLImageElement).naturalWidth || img.width;
    const alto = (img as HTMLImageElement).naturalHeight || img.height;
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const datos = ctx.getImageData(0, 0, ancho, alto);
    datos.data.set(normalesDeSprite(datos.data, ancho, alto, o));
    ctx.putImageData(datos, 0, 0);
    base = new THREE.CanvasTexture(lienzo);
    ajustarPixelArt(base);
    base.colorSpace = THREE.NoColorSpace;
    NORMALES.set(img, base);
  }
  return base;
}
