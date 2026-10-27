import type { Acciones } from '../core/acciones';

export interface Escena {
  /** ¿Pinta el mapa 3D que llena la ventana? Las demás (menús) lo ocultan para que no quede su último fotograma a los lados. */
  readonly conMundo?: boolean;
  /** ¿Dibuja en coordenadas de la ventana (el mapa) y no con la interfaz de 480×352 centrada? */
  readonly ventana?: boolean;
  enter(): void;
  update(dt: number, acciones: Acciones): void;
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
  exit(): void;
}
