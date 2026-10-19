import type { Acciones } from '../core/acciones';
import type { Escena } from './escena';
import { ALTO, ANCHO } from '../render/pantalla';

const LADO = 16;
const VELOCIDAD = 120;
const COLORES = ['#c89bff', '#ffd27a'];

// shortcut: escena provisional para probar bucle y entrada (MOVER mueve, CONFIRMAR cambia el color); se sustituye por la sala en el paso 4.
export class EscenaPrueba implements Escena {
  private x = (ANCHO - LADO) / 2;
  private y = (ALTO - LADO) / 2;
  private xAnterior = this.x;
  private yAnterior = this.y;
  private color = 0;

  enter(): void {}
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    this.xAnterior = this.x;
    this.yAnterior = this.y;
    this.x = Math.min(Math.max(this.x + acciones.moverX * VELOCIDAD * dt, 0), ANCHO - LADO);
    this.y = Math.min(Math.max(this.y + acciones.moverY * VELOCIDAD * dt, 0), ALTO - LADO);
    if (acciones.confirmar) this.color = 1 - this.color;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.fillStyle = '#1d3b2a';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = COLORES[this.color] ?? '#fff';
    ctx.fillRect(
      Math.round(this.xAnterior + (this.x - this.xAnterior) * alpha),
      Math.round(this.yAnterior + (this.y - this.yAnterior) * alpha),
      LADO,
      LADO,
    );
  }
}
