import type { Acciones } from '../core/acciones';
import { letrasEnAncho } from '../core/disposicion';
import { partirTexto } from '../core/texto';
import { VERTICAL } from '../data/datos';
import { dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { interfaz } from '../render/pantalla';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/** Caracteres que caben a lo ancho con margen, en la fuente grande y en la normal (monoespaciadas), en 480×352. */
const LETRAS_TITULO = 30;
const LETRAS_LINEA = 60;

/** Letras por línea en la forma de interfaz actual: las de siempre o, en la interfaz alta, las que caben. */
function letras(): { titulo: number; linea: number } {
  if (!interfaz.alta) return { titulo: LETRAS_TITULO, linea: LETRAS_LINEA };
  const util = interfaz.ancho - 4 * VERTICAL.menu.margen;
  return {
    titulo: letrasEnAncho(util, VERTICAL.menu.letraGrande),
    linea: letrasEnAncho(util),
  };
}

/** Pantalla de texto que espera a que se pulse o toque: historia, fin de partida, victoria, subida de nivel. */
export class EscenaMensaje implements Escena {
  readonly alta = true;

  // Los textos largos se parten una vez (y otra si cambia la forma de la interfaz), no en cada fotograma.
  private titulos: readonly string[] = [];
  private lineas: readonly string[] = [];
  private letrasLinea = 0;

  constructor(
    private readonly titulo: string,
    private readonly color: string,
    /** Los párrafos tal cual (sin partir): es lo que se lee en voz alta. */
    private readonly parrafos: readonly string[],
    private readonly pie: string,
    private readonly alContinuar: () => void,
  ) {
    this.partir();
  }

  private partir(): void {
    const l = letras();
    this.letrasLinea = l.linea;
    this.titulos = partirTexto(this.titulo, l.titulo);
    this.lineas = this.parrafos.flatMap((p) => (p ? partirTexto(p, l.linea) : ['']));
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
    if (letras().linea !== this.letrasLinea) this.partir();
    dibujarFondo(ctx);
    const centro = interfaz.ancho / 2;
    dibujarMarco(ctx, 16, 16, interfaz.ancho - 32, interfaz.alto - 32);
    for (let i = 0; i < this.titulos.length; i++)
      escribir(ctx, this.titulos[i]!, centro, 40 + i * 30, this.color, 'center', FUENTE_GRANDE);
    const y = Math.max(96, 40 + this.titulos.length * 30 + 26);
    for (let i = 0; i < this.lineas.length; i++)
      escribir(ctx, this.lineas[i]!, centro, y + i * 20, PALETA.texto, 'center');
    escribir(ctx, this.pie, centro, interfaz.alto - 40, PALETA.apagada, 'center');
  }
}
