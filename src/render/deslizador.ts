import { colocarSobre } from './pantalla';

type Rect = { x: number; y: number; ancho: number; alto: number };

/** Control HTML sobre el canvas: se enseña con un valor y avisa de cada cambio. */
export interface ControlHtml<T> {
  mostrar(valor: T, alCambiar: (valor: T) => void): void;
  ocultar(): void;
  /** Le da el foco (con las flechas desde el inventario). */
  enfocar(): void;
  /** Si tiene el foco (entonces el menú de debajo no se ve elegido). */
  enfocado(): boolean;
  /** Le quita el foco: las teclas vuelven al juego. */
  soltar(): void;
  /**
   * Qué hacen ↑ y ↓ con el foco en él (pasar al control de arriba o de abajo). Sin `abajo`, ↓ suelta
   * el foco y las teclas vuelven al juego; sin `arriba`, ↑ es del control.
   */
  enlazar(arriba: (() => void) | null, abajo: (() => void) | null): void;
}
export type Deslizador = ControlHtml<number>;
export type Casilla = ControlHtml<boolean>;

/**
 * Deslizador HTML de verdad sobre el canvas (`<input type="range">`): se arrastra con el ratón o el
 * dedo, se mueve con ← → tras enfocarlo y lo leen los lectores de pantalla.
 */
export function crearDeslizador(
  canvas: HTMLCanvasElement,
  rect: Rect,
  etiqueta: string,
): Deslizador {
  const control = crearInput('range', etiqueta);
  control.min = '0';
  control.max = '1';
  control.step = '0.05';
  return sobreCanvas(
    control,
    canvas,
    rect,
    (v) => (control.value = String(v)),
    () => Number(control.value),
  );
}

/** Casilla HTML de verdad sobre el canvas (`<input type="checkbox">`); Enter la marca como Espacio. */
export function crearCasilla(canvas: HTMLCanvasElement, rect: Rect, etiqueta: string): Casilla {
  const control = crearInput('checkbox', etiqueta);
  control.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.repeat) control.click();
  });
  return sobreCanvas(
    control,
    canvas,
    rect,
    (v) => (control.checked = v),
    () => control.checked,
  );
}

function crearInput(tipo: string, etiqueta: string): HTMLInputElement {
  const control = document.createElement('input');
  control.type = tipo;
  control.setAttribute('aria-label', etiqueta);
  control.style.cssText =
    'position:fixed;display:none;box-sizing:border-box;margin:0;accent-color:#c9b6ff;cursor:pointer';
  document.body.append(control);
  return control;
}

function sobreCanvas<T>(
  control: HTMLInputElement,
  canvas: HTMLCanvasElement,
  rect: Rect,
  escribir: (valor: T) => void,
  leer: () => T,
): ControlHtml<T> {
  let cambiar: (valor: T) => void = () => {};
  let arriba: (() => void) | null = null;
  let abajo: (() => void) | null = null;
  control.addEventListener('input', () => cambiar(leer()));
  // ↓ o Tab devuelven las teclas al juego (o pasan al control de abajo); ↑, al de arriba si lo hay.
  control.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Tab') {
      e.preventDefault();
      control.blur();
      if (e.key === 'ArrowDown') abajo?.();
    } else if (e.key === 'ArrowUp' && arriba) {
      e.preventDefault();
      control.blur();
      arriba();
    }
  });
  const colocar = (): void => void colocarSobre(control, canvas, rect);
  return {
    mostrar(valor, alCambiar) {
      cambiar = alCambiar;
      escribir(valor);
      control.style.display = 'block';
      colocar();
      addEventListener('resize', colocar);
    },
    ocultar() {
      control.style.display = 'none';
      removeEventListener('resize', colocar);
      control.blur();
    },
    enfocar: () => control.focus(),
    enfocado: () => document.activeElement === control,
    soltar: () => control.blur(),
    enlazar(a, b) {
      arriba = a;
      abajo = b;
    },
  };
}
