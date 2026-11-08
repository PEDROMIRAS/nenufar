import type { Acciones } from '../core/acciones';
import type { OpcionEvento } from '../core/eventos';
import { efectoToque, filaTocada } from '../core/menu';
import { partirTexto } from '../core/texto';
import { anunciar } from '../render/accesibilidad';
import { dibujarFila, dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { interfaz } from '../render/pantalla';
import { ponerMusica, sonar } from '../render/sonido';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';
import { letras } from './mensaje';

const ALTO_FILA = 28;
const MARGEN = 32;

/**
 * Elección de un evento: título, lo que se ve, una lista de opciones (las apagadas se ven pero no se eligen)
 * y, bajo ella, qué hace la elegida. Con el dedo, el primer toque elige y explica; el segundo la usa. Cancelar
 * elige la última opción (marcharse).
 */
export class EscenaEvento implements Escena {
  readonly alta = true;

  private seleccion: number;
  private ultimoY = 0;
  private hecha = false;
  // Los textos se parten una vez, y otra si cambia la forma de la interfaz.
  private letrasLinea = 0;
  private titulos: readonly string[] = [];
  private descripcion: readonly string[] = [];
  private detalles: readonly (readonly string[])[] = [];

  constructor(
    private readonly titulo: string,
    private readonly texto: string,
    private readonly opciones: readonly OpcionEvento[],
    private readonly alElegir: (clave: OpcionEvento['clave']) => void,
  ) {
    // Empieza en la primera opción que se puede elegir.
    this.seleccion = Math.max(
      0,
      opciones.findIndex((o) => o.activa),
    );
    this.partir();
  }

  private partir(): void {
    const l = letras();
    this.letrasLinea = l.linea;
    this.titulos = partirTexto(this.titulo, l.titulo);
    this.descripcion = partirTexto(this.texto, l.linea);
    this.detalles = this.opciones.map((o) => partirTexto(o.descripcion, l.linea));
  }

  /** Dónde cae cada cosa; lo usan el dibujo y el toque para coincidir. */
  private disposicion(): { yFilas: number; yDetalle: number } {
    const yFilas = 48 + this.titulos.length * 30 + this.descripcion.length * 20 + 20;
    return { yFilas, yDetalle: yFilas + this.opciones.length * ALTO_FILA + 16 };
  }

  enter(): void {
    anunciar(`${this.titulo}. ${this.texto} ${this.textoElegida()}`);
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    ponerMusica(null);
    if (this.hecha) return;
    if (a.cancelar) {
      this.elegir(this.opciones.length - 1);
      return;
    }
    if (a.toqueX >= 0) {
      const caja = {
        x: MARGEN,
        y: this.disposicion().yFilas,
        ancho: interfaz.ancho - 2 * MARGEN,
        alto: this.opciones.length * ALTO_FILA,
      };
      const i = filaTocada(a.toqueX, a.toqueY, caja, ALTO_FILA, this.opciones.length);
      if (i < 0) return;
      if (efectoToque(this.seleccion, i, true) === 'elegir') this.mover(i);
      else this.elegir(i);
      return;
    }
    const dir = Math.sign(a.moverY);
    if (dir !== 0 && dir !== this.ultimoY) {
      const n = this.opciones.length;
      this.mover((this.seleccion + dir + n) % n);
    }
    this.ultimoY = dir;
    if (a.confirmar) this.elegir(this.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (letras().linea !== this.letrasLinea) this.partir();
    dibujarFondo(ctx);
    dibujarMarco(ctx, 16, 16, interfaz.ancho - 32, interfaz.alto - 32);
    const centro = interfaz.ancho / 2;
    for (let i = 0; i < this.titulos.length; i++)
      escribir(ctx, this.titulos[i]!, centro, 40 + i * 30, PALETA.claro, 'center', FUENTE_GRANDE);
    const yTexto = 48 + this.titulos.length * 30;
    for (let i = 0; i < this.descripcion.length; i++)
      escribir(ctx, this.descripcion[i]!, centro, yTexto + i * 20, PALETA.texto, 'center');
    const { yFilas, yDetalle } = this.disposicion();
    this.opciones.forEach((o, i) => {
      const elegida = i === this.seleccion;
      const estado = o.activa
        ? elegida
          ? 'elegida'
          : 'normal'
        : elegida
          ? 'elegidaApagada'
          : 'apagada';
      dibujarFila(
        ctx,
        MARGEN,
        yFilas + i * ALTO_FILA,
        interfaz.ancho - 2 * MARGEN,
        ALTO_FILA,
        o.texto,
        '',
        estado,
      );
    });
    const lineas = this.detalles[this.seleccion] ?? [];
    for (let i = 0; i < lineas.length; i++)
      escribir(ctx, lineas[i]!, centro, yDetalle + i * 20, PALETA.apagada, 'center');
  }

  private textoElegida(): string {
    const o = this.opciones[this.seleccion];
    return o ? `${o.texto}. ${o.descripcion}` : '';
  }

  private mover(i: number): void {
    this.seleccion = i;
    sonar('cursor');
    anunciar(this.textoElegida());
  }

  private elegir(i: number): void {
    const o = this.opciones[i];
    if (!o?.activa) return;
    this.seleccion = i;
    this.hecha = true;
    sonar('confirmar');
    this.alElegir(o.clave);
  }
}
