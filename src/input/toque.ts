import type { FuenteEntrada } from './fuente';

/** Toques y clics sobre el canvas, en píxeles lógicos: para elegir opciones de un menú tocándolas. */
export function crearToque(canvas: HTMLCanvasElement): FuenteEntrada {
  let x = -1;
  let y = -1;
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    x = ((e.clientX - r.left) * canvas.width) / r.width;
    y = ((e.clientY - r.top) * canvas.height) / r.height;
  });
  return {
    leer(acciones) {
      if (x < 0) return;
      acciones.toqueX = x;
      acciones.toqueY = y;
      x = y = -1; // un toque cuenta una sola vez
    },
  };
}
