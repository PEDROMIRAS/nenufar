/** Estado de las acciones abstractas en un paso lógico. Lo rellenan las fuentes de `src/input/`. */
export interface Acciones {
  /** Dirección de MOVER, cada eje en -1..1. */
  moverX: number;
  moverY: number;
  confirmar: boolean;
  cancelar: boolean;
  menu: boolean;
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
    toqueX: -1,
    toqueY: -1,
  };
}
