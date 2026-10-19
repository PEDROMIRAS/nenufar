import type { Sala } from '../core/sala';
import { dibujarObjetos, pintarFondo, pintarVineta } from '../render/sala';
import type { Escena } from './escena';

export class EscenaSala implements Escena {
  private readonly fondo: HTMLCanvasElement;
  private readonly vineta: HTMLCanvasElement;
  private tiempo = 0;

  constructor(
    private readonly sala: Sala,
    private readonly imagenes: readonly HTMLImageElement[],
    private readonly tam: number,
  ) {
    this.fondo = pintarFondo(sala, imagenes, tam);
    this.vineta = pintarVineta(this.fondo.width, this.fondo.height);
  }

  enter(): void {}
  exit(): void {}

  update(dt: number): void {
    this.tiempo += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.fondo, 0, 0);
    dibujarObjetos(ctx, this.sala, this.imagenes, this.tam, this.tiempo);
    ctx.drawImage(this.vineta, 0, 0);
  }
}
