import type { Acciones } from '../core/acciones';
import { partirTexto } from '../core/texto';
import { dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { ANCHO } from '../render/pantalla';
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
    /** Los párrafos tal cual (sin partir): es lo que se lee en voz alta. */
    private readonly parrafos: readonly string[],
    private readonly pie: string,
    private readonly alContinuar: () => void,
  ) {
    this.titulos = partirTexto(titulo, LETRAS_TITULO);
    this.lineas = parrafos.flatMap((l) => (l ? partirTexto(l, LETRAS_LINEA) : ['']));
  }

  enter(): void {
    // Párrafos enteros, no las líneas partidas para la pantalla (cortarían frases a la mitad); el
    // punto solo se añade donde no hay ya uno.
    anunciar(
      [this.titulo, ...this.parrafos, this.pie]
        .filter(Boolean)
        .map((t) => (/[.!?…:]$/.test(t) ? t : `${t}.`))
        .join(' '),
    );
  }
  exit(): void {}

  update(_dt: number, acciones: Acciones): void {
    if (acciones.confirmar || acciones.toqueX >= 0) this.alContinuar();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarFondo(ctx);
    dibujarMarco(ctx, 16, 16, ANCHO - 32, 320);
    for (let i = 0; i < this.titulos.length; i++)
      escribir(ctx, this.titulos[i]!, ANCHO / 2, 40 + i * 30, this.color, 'center', FUENTE_GRANDE);
    const y = Math.max(96, 40 + this.titulos.length * 30 + 26);
    for (let i = 0; i < this.lineas.length; i++)
      escribir(ctx, this.lineas[i]!, ANCHO / 2, y + i * 20, PALETA.texto, 'center');
    escribir(ctx, this.pie, ANCHO / 2, 312, PALETA.apagada, 'center');
  }
}
