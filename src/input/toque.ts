import { aLogico } from '../render/pantalla';
import type { FuenteEntrada } from './fuente';

/** Píxeles lógicos que puede moverse el dedo entre apoyarse y levantarse para que cuente como toque. */
const HOLGURA = 12;

/**
 * Toques y clics sobre el canvas, en píxeles lógicos: para elegir opciones de un menú tocándolas.
 * Cuentan al levantar el dedo, donde se apoyó, y solo si apenas se movió: un dedo que resbala hacia
 * el botón de al lado (o que arrastra el joystick) no elige nada.
 */
export function crearToque(canvas: HTMLCanvasElement): FuenteEntrada {
  let x = -1;
  let y = -1;
  let dedo: number | null = null;
  let desdeX = 0;
  let desdeY = 0;
  const logico = (e: PointerEvent): [number, number] => aLogico(e.clientX, e.clientY);
  canvas.addEventListener('pointerdown', (e) => {
    dedo = e.pointerId;
    [desdeX, desdeY] = logico(e);
  });
  // En la ventana: el joystick captura el dedo en el body y el pointerup no llega al canvas.
  addEventListener('pointerup', (e) => {
    if (e.pointerId !== dedo) return;
    dedo = null;
    const [hastaX, hastaY] = logico(e);
    if (Math.hypot(hastaX - desdeX, hastaY - desdeY) > HOLGURA) return;
    x = desdeX;
    y = desdeY;
  });
  addEventListener('pointercancel', () => (dedo = null));
  return {
    leer(acciones) {
      if (x < 0) return;
      acciones.toqueX = x;
      acciones.toqueY = y;
      x = y = -1; // un toque cuenta una sola vez
    },
  };
}
