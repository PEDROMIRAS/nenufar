import type { Acciones } from '../core/acciones';

export interface Escena {
  enter(): void;
  update(dt: number, acciones: Acciones): void;
  draw(ctx: CanvasRenderingContext2D, alpha: number): void;
  exit(): void;
}
