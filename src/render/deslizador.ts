import { colocarSobre } from './pantalla';

export interface Deslizador {
  /** Lo enseña con el valor `valor` (de 0 a 1); cada movimiento llama a `alCambiar`. */
  mostrar(valor: number, alCambiar: (valor: number) => void): void;
  ocultar(): void;
}

/**
 * Deslizador HTML de verdad sobre el canvas (`<input type="range">`): se arrastra con el ratón o el
 * dedo, se mueve con las flechas tras enfocarlo con Tab y lo leen los lectores de pantalla.
 */
export function crearDeslizador(
  canvas: HTMLCanvasElement,
  rect: { x: number; y: number; ancho: number; alto: number },
  etiqueta: string,
): Deslizador {
  let cambiar: (valor: number) => void = () => {};
  const control = document.createElement('input');
  control.type = 'range';
  control.min = '0';
  control.max = '1';
  control.step = '0.05';
  control.setAttribute('aria-label', etiqueta);
  control.style.cssText =
    'position:fixed;display:none;box-sizing:border-box;margin:0;accent-color:#ffd27a;cursor:pointer';
  control.addEventListener('input', () => cambiar(Number(control.value)));
  document.body.append(control);
  const colocar = (): void => void colocarSobre(control, canvas, rect);

  return {
    mostrar(valor, alCambiar) {
      cambiar = alCambiar;
      control.value = String(valor);
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
