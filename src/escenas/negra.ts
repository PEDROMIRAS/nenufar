import type { Escena } from './escena';

/**
 * Pantalla en negro que no hace nada: sustituye al mapa al caer mientras se carga la zona de la hoguera, para que el
 * mapa viejo no siga vivo (el monstruo que la venció volvería a lanzar el combate y su guardado pisaría el de la vuelta).
 */
export class EscenaNegra implements Escena {
  enter(): void {}
  update(): void {}
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  exit(): void {}
}
