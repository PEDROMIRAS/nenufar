import type { Acciones } from '../core/acciones';
import type { Escena } from './escena';

/** Pila de escenas: solo la de arriba recibe la entrada y se dibuja (el combate tapa el mapa entero). */
export class PilaEscenas {
  private readonly escenas: Escena[] = [];

  /** `alCambiar` se avisa, antes de entrar, de si la escena de arriba dibuja en coordenadas de la ventana. */
  constructor(private readonly alCambiar: (ventana: boolean) => void = () => {}) {}

  apilar(escena: Escena): void {
    this.alCambiar(escena.ventana === true);
    this.escenas.push(escena);
    escena.enter();
  }

  desapilar(): void {
    this.escenas.pop()?.exit();
    this.alCambiar(this.escenas[this.escenas.length - 1]?.ventana === true);
  }

  /** Sustituye la escena de arriba (por ejemplo, el mapa de una zona por el de la siguiente). */
  cambiar(escena: Escena): void {
    this.desapilar();
    this.apilar(escena);
  }

  update(dt: number, acciones: Acciones): void {
    this.escenas[this.escenas.length - 1]?.update(dt, acciones);
  }

  /** ¿La escena de arriba usa el mapa 3D? */
  get conMundo(): boolean {
    return this.escenas[this.escenas.length - 1]?.conMundo === true;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.escenas[this.escenas.length - 1]?.draw(ctx, alpha);
  }
}
