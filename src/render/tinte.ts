/**
 * Copia de una hoja con algunos colores cambiados (coincidencia exacta, en hex). Se hace al cambiar de
 * equipo, nunca en cada fotograma. Sin cambios devuelve la imagen tal cual.
 */
export function recolorear(
  base: HTMLImageElement,
  pares: readonly (readonly [string, string])[],
): CanvasImageSource {
  if (pares.length === 0) return base;
  const lienzo = document.createElement('canvas');
  lienzo.width = base.naturalWidth;
  lienzo.height = base.naturalHeight;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return base;
  ctx.drawImage(base, 0, 0);
  const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
  const tabla = new Map(pares.map(([desde, hacia]) => [parseInt(desde.slice(1), 16), hacia]));
  const px = datos.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const hacia = tabla.get((px[i]! << 16) | (px[i + 1]! << 8) | px[i + 2]!);
    if (!hacia) continue;
    const rgb = parseInt(hacia.slice(1), 16);
    px[i] = rgb >> 16;
    px[i + 1] = (rgb >> 8) & 255;
    px[i + 2] = rgb & 255;
  }
  ctx.putImageData(datos, 0, 0);
  return lienzo;
}
