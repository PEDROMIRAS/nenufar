import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { ALTO, ANCHO } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir, FUENTE_TITULO } from '../render/texto';
import type { Escena } from './escena';

// Medio segundo de temblor que se apaga, y el nombre que aparece en otro tanto.
const TEMBLOR = 0.5;
const APARICION = 0.4;

/**
 * Entrada de un jefe: la sala tiembla y su nombre aparece en grande, antes de su frase. Dura
 * `duracion` segundos y se ve entera. «Kero, Señora de la Cripta» → «Kero» en grande y el resto debajo.
 */
export class EscenaPresentacion implements Escena {
  private t = 0;
  private hecho = false;
  private readonly nombre: string;
  private readonly subtitulo: string;

  constructor(
    private readonly fondo: HTMLCanvasElement,
    nombre: string,
    private readonly duracion: number,
    private readonly alTerminar: () => void,
  ) {
    const coma = nombre.indexOf(',');
    this.nombre = coma < 0 ? nombre : nombre.slice(0, coma);
    this.subtitulo = coma < 0 ? '' : nombre.slice(coma + 1).trim();
  }

  enter(): void {
    sonar('aparicion');
    anunciar([this.nombre, this.subtitulo].filter(Boolean).join(', '));
  }
  exit(): void {}

  update(dt: number): void {
    this.t += dt;
    if (this.t >= this.duracion && !this.hecho) {
      this.hecho = true;
      this.alTerminar();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const queda = Math.max(0, 1 - this.t / TEMBLOR);
    const dx = movimientoReducido() ? 0 : Math.round(Math.sin(this.t * 60) * 4 * queda);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.drawImage(this.fondo, dx, 0);
    ctx.fillStyle = 'rgba(8, 4, 12, 0.6)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    ctx.globalAlpha = Math.min(1, this.t / APARICION);
    escribir(ctx, this.nombre, ANCHO / 2, 140, '#d8584a', 'center', FUENTE_TITULO);
    if (this.subtitulo) escribir(ctx, this.subtitulo, ANCHO / 2, 184, '#e8efe4', 'center');
    ctx.globalAlpha = 1;
  }
}
