import type { Acciones } from '../core/acciones';
import type { HeroeJson } from '../core/types';
import type { Sprite } from '../render/recursos';
import { dibujarSeleccion, TARJETAS } from '../render/seleccion';
import { ponerMusica } from '../render/sonido';
import { anunciar } from '../render/accesibilidad';
import { dentro } from '../render/pantalla';
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

  enter(): void {
    anunciar(`Elige heroína con las flechas: ${this.opciones[0]?.heroe.nombre ?? ''}`);
  }
  exit(): void {}

  update(dt: number, a: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    if (this.elegida) return; // la partida se está cargando
    if (a.toqueX >= 0) {
      const i = TARJETAS.findIndex((t) => dentro(a.toqueX, a.toqueY, t));
      if (i >= 0 && i < this.opciones.length) {
        this.seleccion = i;
        this.elegir();
      }
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) {
      this.seleccion = (this.seleccion + dir + this.opciones.length) % this.opciones.length;
      anunciar(this.opciones[this.seleccion]?.heroe.nombre ?? '');
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
