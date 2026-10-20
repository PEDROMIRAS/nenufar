import type { Acciones } from '../core/acciones';
import type { HeroeJson } from '../core/types';
import type { Sprite } from '../render/recursos';
import { dibujarSeleccion, TARJETAS } from '../render/seleccion';
import type { Escena } from './escena';

export interface OpcionHeroina {
  heroe: HeroeJson;
  sprite: Sprite;
}

/** Elección de heroína al empezar la partida. */
export class EscenaSeleccion implements Escena {
  private seleccion = 0;
  private ultimoX = 0;
  private tiempo = 0;
  private elegida = false;

  constructor(
    private readonly opciones: readonly OpcionHeroina[],
    private readonly alElegir: (opcion: OpcionHeroina) => void,
  ) {}

  enter(): void {}
  exit(): void {}

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (this.elegida) return; // la partida se está cargando
    if (a.toqueX >= 0) {
      const i = TARJETAS.findIndex(
        (t) =>
          a.toqueX >= t.x && a.toqueX < t.x + t.ancho && a.toqueY >= t.y && a.toqueY < t.y + t.alto,
      );
      if (i >= 0 && i < this.opciones.length) {
        this.seleccion = i;
        this.elegir();
      }
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) {
      this.seleccion = (this.seleccion + dir + this.opciones.length) % this.opciones.length;
    }
    this.ultimoX = dir;
    if (a.confirmar) this.elegir();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarSeleccion(ctx, this.opciones, this.seleccion, this.tiempo);
  }

  private elegir(): void {
    const opcion = this.opciones[this.seleccion];
    if (!opcion) return;
    this.elegida = true;
    this.alElegir(opcion);
  }
}
