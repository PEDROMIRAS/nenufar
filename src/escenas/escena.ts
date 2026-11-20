import type { Acciones } from '../core/acciones';

export interface Escena {
  /** ¿Pinta el mapa 3D que llena la ventana? Las demás (menús) lo ocultan para que no quede su último fotograma a los lados. */
  readonly conMundo?: boolean;
  /** ¿Dibuja en coordenadas de la ventana (el mapa) y no con la interfaz de 480×352 centrada? */
  readonly ventana?: boolean;
  /** ¿Está adaptada a la interfaz alta (ventana vertical)? Si no, en vertical sigue con los 480×352 centrados. */
  readonly alta?: boolean;
  /**
   * Dónde debe acabar por abajo el cartel «Mando conectado», en coordenadas lógicas de la escena, si a su altura de
   * siempre taparía algo (el panel del combate en horizontal). Sin él, la altura de siempre.
   */
  readonly bajoCartel?: number;
  enter(): void;
  update(dt: number, acciones: Acciones): void;
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
  exit(): void;
}
