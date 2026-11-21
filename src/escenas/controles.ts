import { dispositivo, type Dispositivo } from '../input/dispositivo';
import type { Acciones } from '../core/acciones';
import { anunciar } from '../render/accesibilidad';
import { cargarAjustes, guardarAjustes } from '../render/almacen';
import { dibujarMenu, opcionTocada, type MenuVista } from '../render/menu';
import { ALTO_FILA, ayudaControles, dibujarControles, textoControles } from '../render/controles';
import { dibujarCabecera, dibujarFondo, dibujarMarco } from '../render/marco';
import { interfaz } from '../render/pantalla';
import { sonar } from '../render/sonido';
import type { Escena } from './escena';

const PIE: Record<Dispositivo, string> = {
  teclado: 'Esc para volver',
  tactil: 'Toca Volver',
  mando: 'B para volver',
};
/** Ancho de la lista (las dos columnas), para centrarla. */
const ANCHO_LISTA = 220;
const RETO = (si: boolean): string => `Reto en la portada: ${si ? 'sí' : 'no'}`;

/**
 * Los controles del juego, desde la portada, y dos botones: quitar o poner el botón «Reto del día» de la portada
 * (lo mismo que la casilla «Reto» de Ajustes, pero sin tener que empezar una partida) y Volver.
 */
export class EscenaControles implements Escena {
  readonly alta = true;
  private conReto = true;
  private readonly menu: MenuVista = {
    opciones: [
      { texto: RETO(true), detalle: '', disponible: true },
      { texto: 'Volver', detalle: '', disponible: true },
    ],
    seleccion: 1,
  };
  /** Dirección del fotograma anterior; null hasta el primero, para ignorar la que se trae pulsada. */
  private ultimo: number | null = null;

  constructor(private readonly alVolver: () => void) {}

  enter(): void {
    this.conReto = !cargarAjustes().retoOculto;
    this.menu.opciones[0]!.texto = RETO(this.conReto);
    this.menu.seleccion = 1;
    this.ultimo = null;
    anunciar(`Controles. ${textoControles()}. ${RETO(this.conReto)}. ${PIE[dispositivo()]}`);
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    if (a.cancelar) return this.volver();
    if (a.toqueX >= 0) {
      const i = opcionTocada(a.toqueX, a.toqueY, this.menu.opciones.length);
      if (i >= 0) this.usar(i);
      return;
    }
    const dir = Math.sign(a.moverX) || Math.sign(a.moverY);
    if (this.ultimo !== null && dir !== 0 && dir !== this.ultimo) {
      this.menu.seleccion = this.menu.seleccion === 0 ? 1 : 0;
      sonar('cursor');
      anunciar(this.menu.opciones[this.menu.seleccion]!.texto);
    }
    this.ultimo = dir;
    if (a.confirmar) this.usar(this.menu.seleccion);
  }

  private usar(i: number): void {
    this.menu.seleccion = i;
    if (i === 1) return this.volver();
    this.conReto = !this.conReto;
    guardarAjustes({ retoOculto: !this.conReto });
    this.menu.opciones[0]!.texto = RETO(this.conReto);
    sonar('confirmar');
    anunciar(RETO(this.conReto));
  }

  private volver(): void {
    sonar('confirmar');
    this.alVolver();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarFondo(ctx);
    dibujarCabecera(ctx, 24, 'Controles');
    // Centrado entre la cabecera y los botones, en la interfaz que toque (480×352 o la columna alta).
    const alto = ayudaControles().length * ALTO_FILA;
    const x = (interfaz.ancho - ANCHO_LISTA) / 2;
    const y = Math.round((interfaz.alto - 60 - alto) / 2);
    dibujarMarco(ctx, x - 20, y - 16, ANCHO_LISTA + 40, alto + 32);
    dibujarControles(ctx, x, y);
    dibujarMenu(ctx, this.menu);
  }
}
