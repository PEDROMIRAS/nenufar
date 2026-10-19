/** Estado de las acciones abstractas en un paso lógico. Lo rellenan las fuentes de `src/input/`. */
export interface Acciones {
  /** Dirección de MOVER, cada eje en -1..1. */
  moverX: number;
  moverY: number;
  confirmar: boolean;
  cancelar: boolean;
  menu: boolean;
}
