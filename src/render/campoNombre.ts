import { PALETA } from './marco';
import { colocarSobre } from './pantalla';

/** Rectángulo en píxeles lógicos del juego. */
interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface CampoNombre {
  /** Lo enseña vacío, con `sugerencia` de texto de ayuda; Enter llama a `alEnviar` y Escape a `alCancelar`. */
  mostrar(sugerencia: string, alEnviar: () => void, alCancelar: () => void): void;
  ocultar(): void;
  leer(): string;
  /** Devuelve el foco al campo (con ↑ desde los botones). */
  enfocar(): void;
  /** Si se está escribiendo; si no, las teclas son del juego (los botones de debajo). */
  enfocado(): boolean;
}

/**
 * Campo de texto HTML de verdad sobre el canvas, para escribir el nombre: así sale el teclado del
 * móvil y lo leen los lectores de pantalla.
 */
export function crearCampoNombre(
  canvas: HTMLCanvasElement,
  rect: Rect,
  maximo: number,
): CampoNombre {
  let enviar = (): void => {};
  let cancelar = (): void => {};
  const campo = document.createElement('input');
  campo.type = 'text';
  campo.maxLength = maximo;
  campo.autocomplete = 'off';
  campo.spellcheck = false;
  campo.setAttribute('aria-label', 'Nombre de tu rana');
  campo.style.cssText =
    'position:fixed;display:none;box-sizing:border-box;margin:0;padding:0 8px;border:2px solid ' +
    `${PALETA.filete};background:#0b0814;color:${PALETA.texto};font-family:monospace;font-weight:bold;text-align:center;outline:none`;
  document.body.append(campo);

  const colocar = (): void => {
    const escala = colocarSobre(campo, canvas, rect);
    // Al menos 16 px: con menos, Safari de iOS hace zoom al tocar el campo.
    campo.style.fontSize = `${Math.max(16, 14 * escala)}px`;
  };
  campo.addEventListener('keydown', (e) => {
    if (e.repeat) return; // un Enter mantenido desde la pantalla anterior no lo envía solo
    if (e.key === 'Enter') enviar();
    else if (e.key === 'Escape') cancelar();
    else if (e.key === 'ArrowDown' || e.key === 'Tab') {
      // Bajar a los botones: sin el foco en el campo, las flechas vuelven a ser del juego.
      e.preventDefault();
      campo.blur();
    }
  });
  // Sin el contorno del navegador, el borde dice dónde está el foco.
  campo.addEventListener('focus', () => (campo.style.borderColor = PALETA.cursor));
  campo.addEventListener('blur', () => (campo.style.borderColor = PALETA.filete));

  return {
    mostrar(sugerencia, alEnviar, alCancelar) {
      enviar = alEnviar;
      cancelar = alCancelar;
      campo.value = '';
      campo.placeholder = sugerencia;
      campo.style.display = 'block';
      colocar();
      addEventListener('resize', colocar);
      campo.focus();
    },
    ocultar() {
      campo.style.display = 'none';
      removeEventListener('resize', colocar);
      campo.blur();
    },
    leer: () => campo.value,
    enfocar: () => campo.focus(),
    enfocado: () => document.activeElement === campo,
  };
}
