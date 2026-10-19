import type { Sala, Tile } from '../core/sala';

// Constantes de arte copiadas de tools/generadores/entorno/plantilla.py, para que la sala se vea como las vistas previas.
const SOMBRA_NORTE = { alto: 7, fuerza: 0.38 };
const SOMBRA_OESTE = { ancho: 5, fuerza: 0.28 };
const LUCES: Record<string, { color: [number, number, number]; fuerza: number; radio: number }> = {
  hoguera: { color: [255, 170, 80], fuerza: 0.3, radio: 70 },
  portal: { color: [170, 100, 255], fuerza: 0.34, radio: 70 },
  candelabro: { color: [255, 190, 110], fuerza: 0.22, radio: 46 },
};

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

/** Pinta una vez lo que no se mueve: fondo, sombras de los muros y halos de luz. */
export function pintarFondo(
  sala: Sala,
  imagenes: readonly HTMLImageElement[],
  tam: number,
): HTMLCanvasElement {
  const ancho = sala.ancho * tam;
  const alto = sala.alto * tam;
  const lienzo = nuevoLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  sala.base.forEach((tile, i) =>
    dibujarTile(ctx, imagenes, tile, tam, (i % sala.ancho) * tam, Math.floor(i / sala.ancho) * tam),
  );

  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;

  // Sombras: la luz viene de arriba a la izquierda, así que cada muro oscurece el borde norte y oeste de la casilla vecina.
  const sombra = new Float32Array(ancho * alto);
  const esMuro = (x: number, y: number): boolean => sala.base[y * sala.ancho + x]?.layer === 'muro';
  for (let cy = 0; cy < sala.alto; cy++) {
    for (let cx = 0; cx < sala.ancho; cx++) {
      if (esMuro(cx, cy)) continue;
      if (cy > 0 && esMuro(cx, cy - 1)) {
        for (let k = 0; k < SOMBRA_NORTE.alto; k++) {
          const s = SOMBRA_NORTE.fuerza * (1 - k / SOMBRA_NORTE.alto);
          for (let x = cx * tam; x < (cx + 1) * tam; x++) {
            const i = (cy * tam + k) * ancho + x;
            sombra[i] = Math.max(sombra[i] ?? 0, s);
          }
        }
      }
      if (cx > 0 && esMuro(cx - 1, cy)) {
        for (let k = 0; k < SOMBRA_OESTE.ancho; k++) {
          const s = SOMBRA_OESTE.fuerza * (1 - k / SOMBRA_OESTE.ancho);
          for (let y = cy * tam; y < (cy + 1) * tam; y++) {
            const i = y * ancho + cx * tam + k;
            sombra[i] = Math.max(sombra[i] ?? 0, s);
          }
        }
      }
    }
  }
  for (let i = 0; i < sombra.length; i++) {
    const f = 1 - (sombra[i] ?? 0);
    px[i * 4] = (px[i * 4] ?? 0) * f;
    px[i * 4 + 1] = (px[i * 4 + 1] ?? 0) * f;
    px[i * 4 + 2] = (px[i * 4 + 2] ?? 0) * f;
  }

  // Halos: mezcla el color de la luz sobre el fondo, más fuerte cerca del objeto.
  for (const o of sala.objetos) {
    const luz = LUCES[o.inf.name];
    if (!luz) continue;
    const lx = o.x * tam + 16;
    const ly = o.y * tam + 20;
    for (let y = Math.max(0, ly - luz.radio); y < Math.min(alto, ly + luz.radio); y++) {
      for (let x = Math.max(0, lx - luz.radio); x < Math.min(ancho, lx + luz.radio); x++) {
        const d = Math.hypot(x - lx, y - ly) / luz.radio;
        if (d >= 1) continue;
        const a = (1 - d) ** 1.5 * luz.fuerza;
        const i = (y * ancho + x) * 4;
        for (let c = 0; c < 3; c++) {
          const v = px[i + c] ?? 0;
          px[i + c] = v * (1 - a) + (v * 0.6 + luz.color[c]! * 0.6) * a;
        }
      }
    }
  }
  ctx.putImageData(datos, 0, 0);
  return lienzo;
}

/** Capa de viñeta: oscurece los bordes, se dibuja encima de todo. */
export function pintarVineta(ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = nuevoLienzo(ancho, alto);
  const ctx = contexto(lienzo);
  const datos = ctx.createImageData(ancho, alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const d2 = ((x - ancho / 2) / (ancho / 2)) ** 2 + ((y - alto / 2) / (alto / 2)) ** 2;
      const factor = Math.min(1, Math.max(0.7, 1.08 - 0.28 * d2));
      datos.data[(y * ancho + x) * 4 + 3] = (1 - factor) * 255;
    }
  }
  ctx.putImageData(datos, 0, 0);
  return lienzo;
}

/**
 * Dibuja los objetos cuya base (borde inferior, en píxeles) cae en (desde, hasta].
 * Partiendo el rango en la Y de un personaje, este queda delante o detrás de cada objeto.
 */
export function dibujarObjetos(
  ctx: CanvasRenderingContext2D,
  sala: Sala,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  tiempo: number,
  desde = -Infinity,
  hasta = Infinity,
): void {
  for (const o of sala.objetos) {
    const base = (o.y + 1) * tam;
    if (base <= desde || base > hasta) continue;
    const frame = o.inf.frames ? Math.floor(tiempo * (o.inf.fps ?? 0)) % o.inf.frames : 0;
    dibujarTile(ctx, imagenes, o.inf, tam, o.x * tam, o.y * tam, frame);
    if (o.sup) dibujarTile(ctx, imagenes, o.sup, tam, o.x * tam, (o.y - 1) * tam);
  }
}

function nuevoLienzo(ancho: number, alto: number): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  return lienzo;
}

function contexto(lienzo: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  return ctx;
}
