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
    'position:fixed;display:none;box-sizing:border-box;margin:0;padding:0 8px;border:2px solid #8fa88a;' +
    'background:#1f2a24;color:#e8efe4;font-family:monospace;font-weight:bold;text-align:center;outline:none';
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
  });

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
  };
}
