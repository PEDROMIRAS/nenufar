import { colocarSobre } from './pantalla';

type Rect = { x: number; y: number; ancho: number; alto: number };

/** Control HTML sobre el canvas: se enseña con un valor y avisa de cada cambio. */
export interface ControlHtml<T> {
  mostrar(valor: T, alCambiar: (valor: T) => void): void;
  ocultar(): void;
}
export type Deslizador = ControlHtml<number>;
export type Casilla = ControlHtml<boolean>;

/**
 * Deslizador HTML de verdad sobre el canvas (`<input type="range">`): se arrastra con el ratón o el
 * dedo, se mueve con las flechas tras enfocarlo con Tab y lo leen los lectores de pantalla.
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

/** Casilla HTML de verdad sobre el canvas (`<input type="checkbox">`), por lo mismo que el deslizador. */
export function crearCasilla(canvas: HTMLCanvasElement, rect: Rect, etiqueta: string): Casilla {
  const control = crearInput('checkbox', etiqueta);
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
    'position:fixed;display:none;box-sizing:border-box;margin:0;accent-color:#ffd27a;cursor:pointer';
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
  control.addEventListener('input', () => cambiar(leer()));
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
  };
}
