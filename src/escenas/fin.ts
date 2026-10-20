import type { Acciones } from '../core/acciones';
import { ALTO, ANCHO } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';

// shortcut: pantallas de fin y victoria mínimas; las de verdad (con estadísticas) son del hito 5.
/** Final de la partida (derrota o victoria); al continuar se empieza otra con un mapa nuevo. */
export class EscenaFin implements Escena {
  constructor(
    private readonly titulo: string,
    private readonly color: string,
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
    escribir(ctx, this.titulo, ANCHO / 2, 130, this.color, 'center', FUENTE_GRANDE);
    escribir(ctx, 'Pulsa o toca para empezar otra', ANCHO / 2, 180, '#e8efe4', 'center');
  }
}
