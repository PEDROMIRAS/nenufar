import type { Acciones } from '../core/acciones';
import { ALTO, ANCHO } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';

/** Pantalla de texto que espera a que se pulse o toque: fin de partida, victoria, subida de nivel. */
export class EscenaMensaje implements Escena {
  constructor(
    private readonly titulo: string,
    private readonly color: string,
    private readonly lineas: readonly string[],
    private readonly pie: string,
    private readonly alContinuar: () => void,
  ) {}

  enter(): void {}
  exit(): void {}

  update(_dt: number, acciones: Acciones): void {
    if (acciones.confirmar || acciones.toqueX >= 0) this.alContinuar();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0b0d10';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    escribir(ctx, this.titulo, ANCHO / 2, 40, this.color, 'center', FUENTE_GRANDE);
    this.lineas.forEach((linea, i) =>
      escribir(ctx, linea, ANCHO / 2, 96 + i * 20, '#e8efe4', 'center'),
    );
    escribir(ctx, this.pie, ANCHO / 2, 312, '#aab8a6', 'center');
  }
}
