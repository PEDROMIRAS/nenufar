/** Tamaño lógico de la interfaz de los menús (elegir rana, combate, inventario…): 15×11 tiles de 32 px. */
export const ANCHO = 480;
export const ALTO = 352;
/** La sala del mapa entera: 21×13 tiles de 32 px. Con ella se escala el mapa y el 3D. */
export const SALA_ANCHO = 672;
export const SALA_ALTO = 416;
/** Fondo común de las pantallas de menú (título aparte, que tiene su sala). */
export const FONDO = '#10161a';

const TACTIL = window.matchMedia('(pointer: coarse)');

/** ¿Pantalla táctil (móvil, tableta)? */
export const esTactil = (): boolean => TACTIL.matches;

/**
 * El canvas 2D cubre la ventana entera. Hay dos formas de colocar lo que se dibuja encima:
 * - «ventana» (el mapa): coordenadas lógicas con el origen en la esquina de la ventana, a la escala que hace
 *   caber la sala entera; el HUD se ancla a los lados con `vista`.
 * - «menú» (todo lo demás): la interfaz de 480×352 centrada, a la mayor escala que cabe; `area` es la ventana
 *   entera en esas coordenadas, para los fondos que llenan lo que sobra.
 */
export const vista = { ancho: SALA_ANCHO, alto: SALA_ALTO, hud: 1 };
/**
 * Píxeles CSS por unidad del HUD del mapa: crece con el lado corto de la ventana (lado/300), pero con tope por
 * debajo y por arriba, para que en un móvil se lea y en un monitor grande no tape el mapa.
 */
const HUD_CSS = { divisor: 300, min: 1.25, max: 2.25 };
export const area = { x: 0, y: 0, ancho: ANCHO, alto: ALTO };

let dpr = 1;
let ventana = true;
/** Píxeles reales por píxel lógico y desplazamiento (en píxeles reales) del origen, en cada forma. */
const modos = {
  ventana: { escala: 1, x: 0, y: 0 },
  menu: { escala: 1, x: 0, y: 0 },
};
/** Ancho y alto reales de la ventana. */
const real = { ancho: 1, alto: 1 };
let reajustar = (): void => {};

/** Escala activa: lo que mide un píxel lógico en píxeles reales. */
const activo = () => (ventana ? modos.ventana : modos.menu);

/**
 * Coordenada lógica redondeada al píxel real de pantalla, no al lógico: con pasos de 1,6 px lógicos por
 * fotograma, redondear a píxeles lógicos daba saltos desiguales (1, 2, 2, 1…) que se veían como tirones.
 */
export const aPixel = (v: number): number => Math.round(v * activo().escala) / activo().escala;

/** Rellena toda la ventana (en coordenadas de menú) con el estilo de relleno actual. */
export function rellenarArea(ctx: CanvasRenderingContext2D): void {
  ctx.fillRect(area.x, area.y, area.ancho, area.alto);
}

/** Cambia de forma de colocar (la escena de arriba del mapa usa «ventana»). */
export function fijarModo(esVentana: boolean): void {
  ventana = esVentana;
}

/** Deja el contexto limpio y colocado para la forma activa; se llama antes de dibujar cada fotograma. */
export function colocarContexto(ctx: CanvasRenderingContext2D): void {
  const m = activo();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, real.ancho, real.alto);
  ctx.setTransform(m.escala, 0, 0, m.escala, m.x, m.y);
  ctx.imageSmoothingEnabled = false;
}

/** Punto de la ventana (píxeles CSS) → coordenadas lógicas de la forma activa. */
export function aLogico(clientX: number, clientY: number): [number, number] {
  const m = activo();
  return [(clientX * dpr - m.x) / m.escala, (clientY * dpr - m.y) / m.escala];
}

/** Coordenadas lógicas de la forma activa → píxeles CSS de la ventana. */
export function aVentana(x: number, y: number): [number, number] {
  const m = activo();
  return [(x * m.escala + m.x) / dpr, (y * m.escala + m.y) / dpr];
}

/** Dónde cae la sala del mapa en la ventana, en píxeles CSS: el 3D se encuadra con ella. */
export function rectSala(): { x: number; y: number; ancho: number; alto: number } {
  const ancho = (SALA_ANCHO * modos.ventana.escala) / dpr;
  const alto = (SALA_ALTO * modos.ventana.escala) / dpr;
  return { x: (innerWidth - ancho) / 2, y: (innerHeight - alto) / 2, ancho, alto };
}

/**
 * Pone el canvas del tamaño de la ventana y calcula las dos escalas. A todo lo que cabe (no a múltiplos
 * enteros, que dejaban marcos negros), aunque algunos píxeles salgan un poco desiguales.
 */
export function prepararPantalla(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');

  // En vertical se recomienda girar el móvil; quien elige jugar así no vuelve a ver el aviso hasta recargar.
  document.getElementById('jugar-vertical')?.addEventListener('click', () => {
    document.body.classList.add('vertical');
  });

  // En táctil, pantalla completa con cada toque mientras no lo esté (el navegador solo la da tras un gesto;
  // en el iPhone no existe y se usa el icono de la pantalla de inicio). En el ordenador no: Escape, que
  // abre la pausa, la quitaría.
  // pointerup y no pointerdown: con el dedo, Chrome solo lo cuenta como gesto del usuario al levantarlo.
  addEventListener('pointerup', () => {
    if (TACTIL.matches && !document.fullscreenElement)
      void document.documentElement.requestFullscreen?.().catch(() => {});
  });

  const ajustar = (): void => {
    // En píxeles físicos, no CSS: en un móvil con dpr 3 cada píxel lógico ocupa N×N píxeles reales.
    dpr = window.devicePixelRatio || 1;
    real.ancho = Math.round(innerWidth * dpr);
    real.alto = Math.round(innerHeight * dpr);
    canvas.width = real.ancho;
    canvas.height = real.alto;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    const sala = Math.min(real.ancho / SALA_ANCHO, real.alto / SALA_ALTO);
    const menu = Math.min(real.ancho / ANCHO, real.alto / ALTO);
    // Origen en la esquina de la ventana; la sala queda centrada y lo que sobra a los lados es de la interfaz.
    modos.ventana = { escala: sala, x: 0, y: 0 };
    vista.ancho = real.ancho / sala;
    vista.alto = real.alto / sala;
    const hudCss = Math.min(
      HUD_CSS.max,
      Math.max(HUD_CSS.min, Math.min(innerWidth, innerHeight) / HUD_CSS.divisor),
    );
    vista.hud = (hudCss * dpr) / sala;
    modos.menu = {
      escala: menu,
      x: (real.ancho - ANCHO * menu) / 2,
      y: (real.alto - ALTO * menu) / 2,
    };
    area.x = -modos.menu.x / menu;
    area.y = -modos.menu.y / menu;
    area.ancho = real.ancho / menu;
    area.alto = real.alto / menu;
    reajustar();
  };
  reajustar = () => colocarContexto(ctx);
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
  _canvas: HTMLCanvasElement,
  r: { x: number; y: number; ancho: number; alto: number },
): number {
  const [x, y] = aVentana(r.x, r.y);
  const escala = activo().escala / dpr;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${r.ancho * escala}px`;
  el.style.height = `${r.alto * escala}px`;
  return escala;
}
