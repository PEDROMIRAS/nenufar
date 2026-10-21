/** Estado de las acciones abstractas en un paso lógico. Lo rellenan las fuentes de `src/input/`. */
export interface Acciones {
  /** Dirección de MOVER, cada eje en -1..1. */
  moverX: number;
  moverY: number;
  confirmar: boolean;
  cancelar: boolean;
  menu: boolean;
  /** Tecla I: en combate enseña u oculta la ayuda de las opciones; en el mapa abre y cierra el inventario. */
  info: boolean;
  /** CORRER mantenido (Mayúsculas); en táctil, el botón del mapa la deja puesta o la quita. */
  correr: boolean;
  /** Dónde se tocó o se hizo clic en este paso, en píxeles lógicos; -1 si no hubo toque. */
  toqueX: number;
  toqueY: number;
}

/** Acciones en reposo: nada pulsado ni tocado. */
export function crearAcciones(): Acciones {
  return {
    moverX: 0,
    moverY: 0,
    confirmar: false,
    cancelar: false,
    menu: false,
    info: false,
    correr: false,
    toqueX: -1,
    toqueY: -1,
  };
}
