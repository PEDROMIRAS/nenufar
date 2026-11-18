/**
 * Relieve de un sprite de pixel art para que la luz lo envuelva: un mapa de normales (RGBA, como el de una imagen)
 * sacado de la propia imagen. La altura de cada píxel visible crece con su distancia al borde de la silueta (un
 * abombado) y un poco con su brillo (el detalle pintado); las normales salen de la pendiente de esa altura.
 */
export interface OpcionesRelieve {
  /** Píxeles hasta los que crece el abombado desde el borde. */
  radio: number;
  /** Cuánto pesa el brillo del píxel en la altura (0: nada). */
  detalle: number;
  /** Cuánto se inclinan las normales con la pendiente. */
  fuerza: number;
}

/** Normales en RGBA (x, y, z de -1..1 a 0..255; alfa, la del sprite) de una imagen RGBA de `ancho`×`alto`. */
export function normalesDeSprite(
  rgba: Uint8ClampedArray,
  ancho: number,
  alto: number,
  o: OpcionesRelieve,
): Uint8ClampedArray {
  const n = ancho * alto;
  // Distancia (en pasos de 8 vecinos) al píxel transparente más cercano, hasta `radio`.
  const dist = new Float32Array(n);
  const cola: number[] = [];
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3]! < 128) cola.push(i);
    else dist[i] = Infinity;
  }
  for (let k = 0; k < cola.length; k++) {
    const i = cola[k]!;
    const x = i % ancho;
    const y = (i - x) / ancho;
    if (dist[i]! >= o.radio) continue;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
        const j = ny * ancho + nx;
        if (dist[j]! > dist[i]! + 1) {
          dist[j] = dist[i]! + 1;
          cola.push(j);
        }
      }
  }
  const altura = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (rgba[i * 4 + 3]! < 128) continue;
    const d = Math.min(dist[i]!, o.radio) / o.radio;
    // Abombado redondo: sube rápido junto al borde y se aplana por dentro.
    const domo = Math.sqrt(1 - (1 - d) * (1 - d));
    const brillo = (rgba[i * 4]! * 0.3 + rgba[i * 4 + 1]! * 0.59 + rgba[i * 4 + 2]! * 0.11) / 255;
    altura[i] = domo + o.detalle * brillo;
  }
  const h = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= ancho || y >= alto ? 0 : altura[y * ancho + x]!;
  const salida = new Uint8ClampedArray(n * 4);
  for (let y = 0; y < alto; y++)
    for (let x = 0; x < ancho; x++) {
      const i = y * ancho + x;
      // La v de la textura crece hacia arriba: «arriba» en la imagen es +y en las normales.
      const nx = (h(x - 1, y) - h(x + 1, y)) * o.fuerza;
      const ny = (h(x, y + 1) - h(x, y - 1)) * o.fuerza;
      const largo = Math.hypot(nx, ny, 1);
      salida[i * 4] = Math.round(((nx / largo) * 0.5 + 0.5) * 255);
      salida[i * 4 + 1] = Math.round(((ny / largo) * 0.5 + 0.5) * 255);
      salida[i * 4 + 2] = Math.round(((1 / largo) * 0.5 + 0.5) * 255);
      // Opaco entero: un texel transparente llegaría a WebGL como (0, 0, 0), una normal que apaga la luz.
      salida[i * 4 + 3] = 255;
    }
  return salida;
}
