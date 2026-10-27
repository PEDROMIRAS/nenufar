import type { Acciones } from '../core/acciones';
import { anunciar } from '../render/accesibilidad';
import { ALTO_FILA, AYUDA_CONTROLES, dibujarControles, TEXTO_CONTROLES } from '../render/controles';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA } from '../render/marco';
import { ALTO, ANCHO, esTactil } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir } from '../render/texto';
import type { Escena } from './escena';

const PIE = esTactil() ? 'Toca para volver' : 'Esc o Enter para volver';
/** Ancho de la lista (las dos columnas), para centrarla. */
const ANCHO_LISTA = 220;

/** Los controles del juego, desde la portada. */
export class EscenaControles implements Escena {
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
    const alto = AYUDA_CONTROLES.length * ALTO_FILA;
    dibujarMarco(
      ctx,
      (ANCHO - ANCHO_LISTA) / 2 - 20,
      (ALTO - alto) / 2 - 16,
      ANCHO_LISTA + 40,
      alto + 32,
    );
    dibujarControles(ctx, (ANCHO - ANCHO_LISTA) / 2, (ALTO - alto) / 2);
    escribir(ctx, PIE, ANCHO / 2, 312, PALETA.apagada, 'center');
  }
}
