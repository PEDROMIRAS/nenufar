import { letrasEnAncho } from '../core/disposicion';
import { partirTexto } from '../core/texto';
import { VERTICAL } from '../data/datos';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { PALETA } from '../render/marco';
import { interfaz, rellenarArea } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir, FUENTE_TITULO } from '../render/texto';
import type { FondoSala } from '../render/mundo/mundo';
import type { Escena } from './escena';

// Medio segundo de temblor que se apaga, y el nombre que aparece en otro tanto.
const TEMBLOR = 0.5;
const APARICION = 0.4;
/** Alto de una línea del nombre (letra de 32 px). */
const ALTO_LINEA = 36;

/**
 * Entrada de un jefe: la sala tiembla y su nombre aparece en grande, antes de su frase. Dura
 * `duracion` segundos y se ve entera. «Kero, Señora de la Cripta» → «Kero» en grande y el resto debajo.
 */
export class EscenaPresentacion implements Escena {
  readonly conMundo = true;
  readonly alta = true;

  private t = 0;
  private hecho = false;
  private readonly nombre: string;
  private readonly subtitulo: string;
  /** El nombre partido en líneas al ancho de la fuente del título, y con cuántas letras por línea se partió. */
  private lineas: string[] = [];
  private letras = 0;

  constructor(
    private readonly fondo: FondoSala,
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
    this.fondo(this.t, dx, null);
    ctx.fillStyle = 'rgba(8, 4, 12, 0.6)';
    rellenarArea(ctx);
    ctx.globalAlpha = Math.min(1, this.t / APARICION);
    // El nombre, en grande y partido si no cabe (en el móvil de pie, «Sacerdote de la luna falsa» no cabe en una línea).
    const letras = letrasEnAncho(
      interfaz.ancho - 2 * VERTICAL.menu.margen,
      VERTICAL.menu.letraTitulo,
    );
    if (letras !== this.letras) {
      this.letras = letras;
      this.lineas = partirTexto(this.nombre, letras);
    }
    const centro = interfaz.ancho / 2;
    const y0 = interfaz.alto / 2 - 36 - ((this.lineas.length - 1) * ALTO_LINEA) / 2;
    for (let i = 0; i < this.lineas.length; i++)
      escribir(
        ctx,
        this.lineas[i]!,
        centro,
        y0 + i * ALTO_LINEA,
        '#d8584a',
        'center',
        FUENTE_TITULO,
      );
    if (this.subtitulo)
      escribir(
        ctx,
        this.subtitulo,
        centro,
        y0 + (this.lineas.length - 1) * ALTO_LINEA + 44,
        PALETA.texto,
        'center',
      );
    ctx.globalAlpha = 1;
  }
}
