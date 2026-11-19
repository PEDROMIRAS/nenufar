import type { Acciones } from '../core/acciones';
import type { Escena } from './escena';

/** Pila de escenas: solo la de arriba recibe la entrada y se dibuja (el combate tapa el mapa entero). */
export class PilaEscenas {
  private readonly escenas: Escena[] = [];
  /** Velo negro encima de todo, que se aclara: segundos que le quedan y los que dura. */
  private velo = 0;
  private veloTotal = 0;

  /**
   * `alCambiar` se avisa, antes de entrar, de si la escena de arriba dibuja en coordenadas de la ventana y de si
   * pide la interfaz alta (ventana vertical).
   */
  constructor(private readonly alCambiar: (ventana: boolean, alta: boolean) => void = () => {}) {}

  apilar(escena: Escena): void {
    this.alCambiar(escena.ventana === true, escena.alta === true);
    this.escenas.push(escena);
    escena.enter();
  }

  desapilar(): void {
    this.escenas.pop()?.exit();
    const arriba = this.escenas[this.escenas.length - 1];
    this.alCambiar(arriba?.ventana === true, arriba?.alta === true);
  }

  /** Sustituye la escena de arriba (por ejemplo, el mapa de una zona por el de la siguiente). */
  cambiar(escena: Escena): void {
    this.desapilar();
    this.apilar(escena);
  }

  /**
   * La pantalla sale de negro en `segundos`, sea cual sea la escena de arriba: tras un combate, que acaba fundido a
   * negro, lo que venga después (el mapa, la frase del jefe, la subida de nivel, el equipo…) aparece sin saltos.
   */
  fundirDesdeNegro(segundos: number): void {
    this.velo = this.veloTotal = segundos;
  }

  update(dt: number, acciones: Acciones): void {
    if (this.velo > 0) this.velo = Math.max(0, this.velo - dt);
    this.escenas[this.escenas.length - 1]?.update(dt, acciones);
  }

  /** ¿Hay alguna escena que cumpla `prueba` en cualquier nivel de la pila? Sin asignar memoria. */
  alguna(prueba: (escena: Escena) => boolean): boolean {
    for (let i = 0; i < this.escenas.length; i++) if (prueba(this.escenas[i]!)) return true;
    return false;
  }

  /** ¿La escena de arriba usa el mapa 3D? */
  get conMundo(): boolean {
    return this.escenas[this.escenas.length - 1]?.conMundo === true;
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.escenas[this.escenas.length - 1]?.draw(ctx, alpha);
    if (this.velo > 0) {
      // Todo el lienzo, sea cual sea la forma de colocar de la escena.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.globalAlpha = this.velo / this.veloTotal;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }
  }
}
