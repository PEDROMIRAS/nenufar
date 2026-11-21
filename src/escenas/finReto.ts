import type { Acciones } from '../core/acciones';
import { filaTocada } from '../core/menu';
import { anunciar } from '../render/accesibilidad';
import { dibujarCaja, dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { interfaz } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir, FUENTE_BOTON, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';

/** Alto de cada botón y aire entre ellos: en vertical, más altos (para el dedo). */
const BOTON = { alto: 32, separacion: 6 };
const BOTON_ALTO = { alto: 40, separacion: 8 };
const MARGEN = 32;
const boton = (): typeof BOTON => (interfaz.alta ? BOTON_ALTO : BOTON);
/** Alto de todos los botones juntos. */
const altoBotones = (): number => {
  const b = boton();
  return OPCIONES.length * b.alto + (OPCIONES.length - 1) * b.separacion;
};
/** Primera y última línea de texto de la tarjeta (sin desplazar) y el aire entre el texto y los botones en vertical. */
const ARRIBA = 36;
const FIN_TEXTO = 230;
/** Lo que ocupa la línea «¡Nuevo récord!»: sin récord, lo de debajo sube eso (si no, quedaba un hueco). */
const LINEA_RECORD = 30;
const AIRE_BOTONES = 28;
const OPCIONES = ['Otra vez', 'Portada'] as const;

/** Lo que dice la tarjeta, ya escrito. */
export interface LineasFinReto {
  titulo: string;
  resultado: string;
  /** «Tu mejor de hoy con la rana ronin» y, debajo, el resultado (en dos líneas: en el móvil no cabe en una). */
  mejor: string;
  mejorValor: string;
  nuevo: boolean;
  dias: string;
}

/**
 * Tarjeta final del reto del día: el resultado, el mejor de hoy con esa rana, los días jugados y dos botones,
 * «Otra vez» (elegido: una pulsación vuelve al mismo mapa) y «Portada». Un toque usa el botón; cancelar va a la
 * portada.
 */
export class EscenaFinReto implements Escena {
  readonly alta = true;

  private seleccion = 0;
  /** Dirección del fotograma anterior; null hasta el primero, para ignorar la que se trae pulsada. */
  private ultimo: number | null = null;
  private hecha = false;

  constructor(
    private readonly lineas: LineasFinReto,
    private readonly alOtraVez: () => void,
    private readonly alPortada: () => void,
  ) {}

  private anunciado = false;

  enter(): void {
    this.anunciado = false;
  }

  private anunciarTodo(): void {
    const l = this.lineas;
    anunciar(
      [
        l.titulo,
        l.resultado,
        `${l.mejor}: ${l.mejorValor}`,
        l.nuevo ? '¡Nuevo récord!' : '',
        l.dias,
        OPCIONES[0],
      ]
        .filter((t) => t)
        .join('. '),
    );
  }
  exit(): void {}

  /**
   * Cuánto baja todo: en la interfaz alta, el texto y los botones van juntos y centrados en la pantalla (con los
   * botones abajo del todo quedaba un hueco de media pantalla); en horizontal, nada.
   */
  private bajar(): number {
    if (!interfaz.alta) return 0;
    const alto = this.finTexto() - ARRIBA + AIRE_BOTONES + altoBotones();
    return Math.max(0, Math.round((interfaz.alto - alto) / 2) - ARRIBA);
  }

  /** Dónde acaba el texto (sin desplazar): sin récord nuevo, una línea antes. */
  private finTexto(): number {
    return FIN_TEXTO - (this.lineas.nuevo ? 0 : LINEA_RECORD);
  }

  /** Dónde empiezan los botones: en horizontal, abajo, dentro del marco; en vertical, bajo el texto. */
  private yFilas(): number {
    if (interfaz.alta) return this.finTexto() + AIRE_BOTONES + this.bajar();
    return interfaz.alto - 32 - altoBotones() - 12;
  }

  update(_dt: number, a: Acciones): void {
    if (!this.anunciado) {
      // Se anuncia en el primer fotograma a la vista, no al apilarse: tras ganar un combate se apila debajo de
      // otras pantallas (nivel, frase del jefe) y, si se leyera en enter(), la taparían antes de verse.
      this.anunciado = true;
      this.anunciarTodo();
    }
    if (this.hecha) return;
    if (a.cancelar) {
      this.usar(1);
      return;
    }
    if (a.toqueX >= 0) {
      const b = boton();
      const caja = {
        x: MARGEN,
        y: this.yFilas(),
        ancho: interfaz.ancho - 2 * MARGEN,
        alto: OPCIONES.length * (b.alto + b.separacion),
      };
      const i = filaTocada(a.toqueX, a.toqueY, caja, b.alto + b.separacion, OPCIONES.length);
      if (i >= 0) this.usar(i);
      return;
    }
    // Arriba y abajo (o izquierda y derecha) cambian de botón.
    const dir = Math.sign(a.moverY) || Math.sign(a.moverX);
    if (this.ultimo !== null && dir !== 0 && dir !== this.ultimo) {
      this.seleccion = (this.seleccion + dir + OPCIONES.length) % OPCIONES.length;
      sonar('cursor');
      anunciar(OPCIONES[this.seleccion]!);
    }
    this.ultimo = dir;
    if (a.confirmar) this.usar(this.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const l = this.lineas;
    dibujarFondo(ctx);
    dibujarMarco(ctx, 16, 16, interfaz.ancho - 32, interfaz.alto - 32);
    const centro = interfaz.ancho / 2;
    const b = this.bajar();
    escribir(ctx, 'Reto del día', centro, ARRIBA + b, PALETA.apagada, 'center');
    escribir(ctx, l.titulo, centro, 62 + b, PALETA.elegida, 'center', FUENTE_GRANDE);
    escribir(ctx, l.resultado, centro, 104 + b, PALETA.texto, 'center');
    escribir(ctx, l.mejor, centro, 140 + b, PALETA.claro, 'center');
    escribir(ctx, l.mejorValor, centro, 160 + b, PALETA.claro, 'center');
    if (l.nuevo) escribir(ctx, '¡Nuevo récord!', centro, 186 + b, PALETA.cursor, 'center');
    escribir(ctx, l.dias, centro, 216 - (l.nuevo ? 0 : LINEA_RECORD) + b, PALETA.apagada, 'center');
    // Botones en caja, como los de las demás pantallas.
    const y = this.yFilas();
    const medidas = boton();
    const ancho = interfaz.ancho - 2 * MARGEN;
    for (let i = 0; i < OPCIONES.length; i++) {
      const elegida = i === this.seleccion;
      const yBoton = y + i * (medidas.alto + medidas.separacion);
      dibujarCaja(ctx, MARGEN, yBoton, ancho, medidas.alto, elegida ? 'elegida' : 'normal');
      escribir(
        ctx,
        OPCIONES[i]!,
        centro,
        yBoton + (medidas.alto - 14) / 2,
        elegida ? PALETA.elegida : PALETA.texto,
        'center',
        FUENTE_BOTON,
      );
    }
  }

  private usar(i: number): void {
    this.seleccion = i;
    this.hecha = true;
    sonar('confirmar');
    if (i === 0) this.alOtraVez();
    else this.alPortada();
  }
}
