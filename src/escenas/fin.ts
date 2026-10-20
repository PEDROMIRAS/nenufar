import type { Acciones } from '../core/acciones';
import { ALTO, ANCHO } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';

/** Final de la partida (derrota o victoria) con su resumen; al continuar se vuelve al título. */
export class EscenaFin implements Escena {
  constructor(
    private readonly titulo: string,
    private readonly color: string,
    private readonly lineas: readonly string[],
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
    escribir(ctx, 'Pulsa o toca para volver al título', ANCHO / 2, 312, '#aab8a6', 'center');
  }
}
