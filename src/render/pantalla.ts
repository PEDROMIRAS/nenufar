import { cargarAjustes, guardarAjustes } from './almacen';

/** Resolución lógica: una sala de 15×11 tiles de 32 px. */
export const ANCHO = 480;
export const ALTO = 352;
/** Fondo común de las pantallas de menú (título aparte, que tiene su sala). */
export const FONDO = '#10161a';

// En pantallas táctiles (móvil y tableta) el juego llena todo lo que cabe, sin esperar a un
// múltiplo entero: con él se quedaba en dos tercios del ancho en vertical y con franjas en horizontal.
const TACTIL = window.matchMedia('(pointer: coarse)');

/**
 * Fija la resolución lógica y escala el canvas para que la sala se vea entera y lo más grande posible.
 * En el ordenador, al mayor múltiplo entero (pixel art perfecto); en táctil, a todo lo que cabe,
 * aunque algunos píxeles salgan un poco desiguales.
 */
export function prepararPantalla(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  ctx.imageSmoothingEnabled = false;

  // En vertical se recomienda girar el móvil; quien elige jugar así no vuelve a ver el aviso.
  document.body.classList.toggle('vertical', cargarAjustes().jugarEnVertical);
  document.getElementById('jugar-vertical')?.addEventListener('click', () => {
    document.body.classList.add('vertical');
    guardarAjustes({ jugarEnVertical: true });
  });

  const ajustar = (): void => {
    const dpr = window.devicePixelRatio || 1;
    // En píxeles físicos, no CSS: en un móvil con dpr 3 cada píxel lógico ocupa N×N píxeles reales.
    const cabe = Math.min((innerWidth * dpr) / ANCHO, (innerHeight * dpr) / ALTO);
    const escala = TACTIL.matches ? cabe : Math.max(1, Math.floor(cabe));
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
