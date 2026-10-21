import type { Acciones } from '../core/acciones';

/** Una fuente de entrada (teclado, táctil...). `leer` se llama una vez por paso lógico. */
export interface FuenteEntrada {
  /** Escribe MOVER solo si la fuente tiene dirección; activa botones pero nunca los apaga. */
  leer(acciones: Acciones): void;
}

/** Junta varias fuentes: los botones se suman y, en MOVER, gana la última que tenga dirección. */
export function leerFuentes(fuentes: readonly FuenteEntrada[], acciones: Acciones): void {
  acciones.moverX = 0;
  acciones.moverY = 0;
  acciones.confirmar = false;
  acciones.cancelar = false;
  acciones.menu = false;
  acciones.info = false;
  acciones.correr = false;
  acciones.toqueX = -1;
  acciones.toqueY = -1;
  for (let i = 0; i < fuentes.length; i++) fuentes[i]?.leer(acciones);
}
