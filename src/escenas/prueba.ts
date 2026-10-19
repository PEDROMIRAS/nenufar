import type { Escena } from './escena';
import { ALTO, ANCHO } from '../render/pantalla';

const LADO = 16;

// shortcut: escena provisional para ver el bucle (un cuadrado que va y vuelve); se sustituye por la sala en el paso 4.
export class EscenaPrueba implements Escena {
  private x = 0;
  private xAnterior = 0;
  private velocidad = 120;

  enter(): void {}
  exit(): void {}

  update(dt: number): void {
    this.xAnterior = this.x;
    this.x += this.velocidad * dt;
    if (this.x < 0 || this.x > ANCHO - LADO) {
      this.x = Math.min(Math.max(this.x, 0), ANCHO - LADO);
      this.velocidad = -this.velocidad;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.fillStyle = '#1d3b2a';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    const x = this.xAnterior + (this.x - this.xAnterior) * alpha;
    ctx.fillStyle = '#c89bff';
    ctx.fillRect(Math.round(x), (ALTO - LADO) / 2, LADO, LADO);
  }
}
