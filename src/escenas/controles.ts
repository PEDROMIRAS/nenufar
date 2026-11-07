import type { Acciones } from '../core/acciones';
import { anunciar } from '../render/accesibilidad';
import { ALTO_FILA, AYUDA_CONTROLES, dibujarControles, TEXTO_CONTROLES } from '../render/controles';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { esTactil, interfaz } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir } from '../render/texto';
import type { Escena } from './escena';

const PIE = esTactil() ? 'Toca para volver' : 'Esc o Enter para volver';
/** Ancho de la lista (las dos columnas), para centrarla. */
const ANCHO_LISTA = 220;

/** Los controles del juego, desde la portada. */
export class EscenaControles implements Escena {
  readonly alta = true;

  constructor(private readonly alVolver: () => void) {}

  enter(): void {
    anunciar(`Controles. ${TEXTO_CONTROLES}. ${PIE}`);
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    if (a.cancelar || a.confirmar || a.toqueX >= 0) {
      sonar('confirmar');
      this.alVolver();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarFondo(ctx);
    dibujarCabecera(ctx, 24, 'Controles');
    // Centrado en la interfaz que toque: 480×352 o, en el móvil de pie, la columna alta.
    const alto = AYUDA_CONTROLES.length * ALTO_FILA;
    const x = (interfaz.ancho - ANCHO_LISTA) / 2;
    const y = (interfaz.alto - alto) / 2;
    dibujarMarco(ctx, x - 20, y - 16, ANCHO_LISTA + 40, alto + 32);
    dibujarControles(ctx, x, y);
    escribir(ctx, PIE, interfaz.ancho / 2, interfaz.alto - 40, PALETA.apagada, 'center');
  }
}
