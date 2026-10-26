import { cargarAjustes, guardarAjustes } from './almacen';

/** Resolución lógica: una sala de 15×11 tiles de 32 px. */
export const ANCHO = 480;
export const ALTO = 352;
/** Fondo común de las pantallas de menú (título aparte, que tiene su sala). */
export const FONDO = '#10161a';

const TACTIL = window.matchMedia('(pointer: coarse)');

/** ¿Pantalla táctil (móvil, tableta)? */
export const esTactil = (): boolean => TACTIL.matches;

/** Píxeles reales de pantalla por píxel lógico (lo que mide el canvas por dentro entre ANCHO). */
let escalaPantalla = 1;

/**
 * Coordenada lógica redondeada al píxel real de pantalla, no al lógico: con pasos de 1,6 px lógicos por
 * fotograma, redondear a píxeles lógicos daba saltos desiguales (1, 2, 2, 1…) que se veían como tirones.
 */
export const aPixel = (v: number): number => Math.round(v * escalaPantalla) / escalaPantalla;

/**
 * Escala el canvas para que la sala se vea entera y lo más grande posible. Se dibuja en coordenadas
 * lógicas (ANCHO × ALTO), pero el canvas mide por dentro los píxeles reales que ocupa: así lo que se
 * mueve avanza a saltos de píxel real. A todo lo que cabe, también en el ordenador (con el mayor
 * múltiplo entero quedaba un marco negro), aunque algunos píxeles salgan un poco desiguales.
 */
export function prepararPantalla(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');

  // En vertical se recomienda girar el móvil; quien elige jugar así no vuelve a ver el aviso.
  document.body.classList.toggle('vertical', cargarAjustes().jugarEnVertical);
  document.getElementById('jugar-vertical')?.addEventListener('click', () => {
    document.body.classList.add('vertical');
    guardarAjustes({ jugarEnVertical: true });
  });

  // En táctil, pantalla completa con cada toque mientras no lo esté (el navegador solo la da tras un gesto;
  // en el iPhone no existe y se usa el icono de la pantalla de inicio). En el ordenador no: Escape, que
  // abre la pausa, la quitaría.
  addEventListener('pointerdown', () => {
    if (TACTIL.matches && !document.fullscreenElement)
      void document.documentElement.requestFullscreen?.().catch(() => {});
  });

  const ajustar = (): void => {
    const dpr = window.devicePixelRatio || 1;
    // En píxeles físicos, no CSS: en un móvil con dpr 3 cada píxel lógico ocupa N×N píxeles reales.
    const escala = Math.min((innerWidth * dpr) / ANCHO, (innerHeight * dpr) / ALTO);
    canvas.width = Math.round(ANCHO * escala);
    canvas.height = Math.round(ALTO * escala);
    canvas.style.width = `${canvas.width / dpr}px`;
    canvas.style.height = `${canvas.height / dpr}px`;
    escalaPantalla = canvas.width / ANCHO;
    // Cambiar el tamaño borra el estado del contexto: transformación y suavizado van después.
    ctx.setTransform(escalaPantalla, 0, 0, canvas.height / ALTO, 0, 0);
    ctx.imageSmoothingEnabled = false;
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

/** Coloca un elemento HTML fijo sobre el rectángulo `r` (en píxeles lógicos) del canvas; devuelve la escala. */
export function colocarSobre(
  el: HTMLElement,
  canvas: HTMLCanvasElement,
  r: { x: number; y: number; ancho: number; alto: number },
): number {
  const c = canvas.getBoundingClientRect();
  const escala = c.width / ANCHO;
  el.style.left = `${c.left + r.x * escala}px`;
  el.style.top = `${c.top + r.y * escala}px`;
  el.style.width = `${r.ancho * escala}px`;
  el.style.height = `${r.alto * escala}px`;
  return escala;
}
