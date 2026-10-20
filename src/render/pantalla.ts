/** Resolución lógica: una sala de 15×11 tiles de 32 px. */
export const ANCHO = 480;
export const ALTO = 352;
/** Fondo común de las pantallas de menú (título aparte, que tiene su sala). */
export const FONDO = '#10161a';

/** Fija la resolución lógica y escala el canvas al mayor múltiplo entero que quepa en la ventana. */
export function prepararPantalla(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  ctx.imageSmoothingEnabled = false;

  const ajustar = (): void => {
    const dpr = window.devicePixelRatio || 1;
    // Múltiplo entero en píxeles físicos, no CSS: en un móvil con dpr 3 cada píxel lógico ocupa N×N píxeles reales.
    const escala = Math.max(
      1,
      Math.floor(Math.min((innerWidth * dpr) / ANCHO, (innerHeight * dpr) / ALTO)),
    );
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
