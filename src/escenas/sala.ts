import type { Acciones } from '../core/acciones';
import { actualizarHeroina, type Heroina } from '../core/heroina';
import type { Sala } from '../core/sala';
import { dibujarHeroina } from '../render/heroina';
import type { Sprite } from '../render/recursos';
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
    private readonly heroina: Heroina,
    private readonly spriteHeroina: Sprite,
  ) {
    this.fondo = pintarFondo(sala, imagenes, tam);
    this.vineta = pintarVineta(this.fondo.width, this.fondo.height);
  }

  enter(): void {}
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    this.tiempo += dt;
    actualizarHeroina(this.heroina, acciones, dt, this.sala, this.tam);
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    const h = this.heroina;
    // Los objetos con la base por encima de los pies quedan detrás de la heroína; el resto, delante.
    const pies = Math.round(h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha);
    ctx.drawImage(this.fondo, 0, 0);
    dibujarObjetos(ctx, this.sala, this.imagenes, this.tam, this.tiempo, -Infinity, pies);
    dibujarHeroina(ctx, this.spriteHeroina, h, alpha);
    dibujarObjetos(ctx, this.sala, this.imagenes, this.tam, this.tiempo, pies, Infinity);
    ctx.drawImage(this.vineta, 0, 0);
  }
}
