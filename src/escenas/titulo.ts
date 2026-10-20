import type { Acciones } from '../core/acciones';
import { formatearTiempo, type Records } from '../core/records';
import { ALTO, ANCHO } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import { ponerMusica } from '../render/sonido';
import type { Escena } from './escena';

/** Pantalla de título con los récords guardados. */
export class EscenaTitulo implements Escena {
  private tiempo = 0;
  private readonly lineas: string[];

  constructor(
    records: Records,
    private readonly alEmpezar: () => void,
  ) {
    this.lineas =
      records.partidas === 0
        ? []
        : [
            `Partidas: ${records.partidas} · Victorias: ${records.victorias}`,
            `Nivel más alto: ${records.nivelMaximo}`,
            records.mejorTiempo === null
              ? 'Mejor tiempo: aún sin victoria'
              : `Mejor tiempo: ${formatearTiempo(records.mejorTiempo)}`,
          ];
  }

  enter(): void {}
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    if (acciones.confirmar || acciones.toqueX >= 0) this.alEmpezar();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#10161a';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    escribir(ctx, 'Nenúfar', ANCHO / 2, 70, '#c89bff', 'center', FUENTE_GRANDE);
    escribir(ctx, 'Un dungeon crawler de ranas', ANCHO / 2, 110, '#aab8a6', 'center');
    this.lineas.forEach((linea, i) =>
      escribir(ctx, linea, ANCHO / 2, 170 + i * 20, '#e8efe4', 'center'),
    );
    // Parpadeo lento del aviso para empezar.
    if (Math.floor(this.tiempo * 2) % 2 === 0) {
      escribir(ctx, 'Pulsa o toca para empezar', ANCHO / 2, 290, '#ffd27a', 'center');
    }
  }
}
