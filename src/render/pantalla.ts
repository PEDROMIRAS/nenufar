import { cargarAjustes, guardarAjustes } from './almacen';

/** Resolución lógica: una sala de 15×11 tiles de 32 px. */
export const ANCHO = 480;
export const ALTO = 352;
/** Fondo común de las pantallas de menú (título aparte, que tiene su sala). */
export const FONDO = '#10161a';

// En vertical, en el móvil, se recomienda girarlo; quien elige jugar así ve el juego a todo el ancho.
const MOVIL_VERTICAL = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

/**
 * Fija la resolución lógica y escala el canvas al mayor múltiplo entero que quepa en la ventana.
 * En un móvil en vertical, si se ha elegido jugar así, la escala no es entera: con ella el juego
 * se quedaría a dos tercios del ancho y el texto no se leería.
 */
export function prepararPantalla(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  ctx.imageSmoothingEnabled = false;

  let vertical = cargarAjustes().jugarEnVertical;
  document.body.classList.toggle('vertical', vertical);
  document.getElementById('jugar-vertical')?.addEventListener('click', () => {
    vertical = true;
    document.body.classList.add('vertical');
    guardarAjustes({ jugarEnVertical: true });
    ajustar();
  });

  const ajustar = (): void => {
    const dpr = window.devicePixelRatio || 1;
    // Múltiplo entero en píxeles físicos, no CSS: en un móvil con dpr 3 cada píxel lógico ocupa N×N píxeles reales.
    const cabe = Math.min((innerWidth * dpr) / ANCHO, (innerHeight * dpr) / ALTO);
    const escala = vertical && MOVIL_VERTICAL.matches ? cabe : Math.max(1, Math.floor(cabe));
    canvas.style.width = `${(ANCHO * escala) / dpr}px`;
    canvas.style.height = `${(ALTO * escala) / dpr}px`;
  };
  ajustar();
  addEventListener('resize', ajustar);
  return ctx;
}

/** ¿El punto (x, y), en píxeles lógicos, cae dentro del rectángulo? */
export function dentro(
  x: number,
  y: number,
  r: { x: number; y: number; ancho: number; alto: number },
): boolean {
  return x >= r.x && x < r.x + r.ancho && y >= r.y && y < r.y + r.alto;
}
