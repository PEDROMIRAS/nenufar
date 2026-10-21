import type { Acciones } from '../core/acciones';
import { partirTexto } from '../core/texto';
import { ALTO, ANCHO, FONDO } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

// Caracteres que caben a lo ancho con margen, en la fuente grande y en la normal (monoespaciadas).
const LETRAS_TITULO = 30;
const LETRAS_LINEA = 60;

/** Pantalla de texto que espera a que se pulse o toque: historia, fin de partida, victoria, subida de nivel. */
export class EscenaMensaje implements Escena {
  // Los textos largos se parten aquí una vez, no en cada fotograma.
  private readonly titulos: readonly string[];
  private readonly lineas: readonly string[];

  constructor(
    private readonly titulo: string,
    private readonly color: string,
    lineas: readonly string[],
    private readonly pie: string,
    private readonly alContinuar: () => void,
  ) {
    this.titulos = partirTexto(titulo, LETRAS_TITULO);
    this.lineas = lineas.flatMap((l) => (l ? partirTexto(l, LETRAS_LINEA) : ['']));
  }

  enter(): void {
    anunciar([this.titulo, ...this.lineas, this.pie].filter(Boolean).join('. '));
  }
  exit(): void {}

  update(_dt: number, acciones: Acciones): void {
    if (acciones.confirmar || acciones.toqueX >= 0) this.alContinuar();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = FONDO;
    ctx.fillRect(0, 0, ANCHO, ALTO);
    this.titulos.forEach((t, i) =>
      escribir(ctx, t, ANCHO / 2, 40 + i * 30, this.color, 'center', FUENTE_GRANDE),
    );
    const y = Math.max(96, 40 + this.titulos.length * 30 + 26);
    this.lineas.forEach((linea, i) =>
      escribir(ctx, linea, ANCHO / 2, y + i * 20, '#e8efe4', 'center'),
    );
    escribir(ctx, this.pie, ANCHO / 2, 312, '#aab8a6', 'center');
  }
}
