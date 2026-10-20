import type { Acciones } from '../core/acciones';
import { partirEnLineas } from '../core/descripciones';
import type { DificultadJson } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import { dibujarDificultad, type FichaDificultad } from '../render/dificultad';
import { ponerMusica, sonar } from '../render/sonido';
import type { Escena } from './escena';

/** Caracteres por línea dentro de la ficha. */
const LARGO_LINEA = 50;

/** Elección de dificultad, después de elegir la heroína. Empieza en la del medio (Normal). */
export class EscenaDificultad implements Escena {
  private readonly menu: MenuVista;
  private readonly fichas: FichaDificultad[];
  private ultimoX = 0;
  private elegida = false;

  constructor(
    private readonly dificultades: readonly DificultadJson[],
    private readonly subtitulo: string,
    private readonly alElegir: (d: DificultadJson) => void,
    private readonly alVolver: () => void,
  ) {
    this.menu = {
      opciones: dificultades.map((d) => ({ texto: d.nombre, detalle: '', disponible: true })),
      seleccion: Math.floor(dificultades.length / 2),
    };
    this.fichas = dificultades.map((d) => ({
      nombre: d.nombre,
      // Solo la descripción: los multiplicadores no se leen bien sueltos (Difícil aprieta sobre todo
      // quitando recuperación, no subiendo el ataque).
      lineas: partirEnLineas(d.descripcion, LARGO_LINEA),
    }));
  }

  enter(): void {
    anunciar(`Elige dificultad con las flechas. ${this.textoElegida()}`);
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    ponerMusica(null);
    if (this.elegida) return; // la partida se está cargando
    if (a.cancelar) {
      this.alVolver();
      return;
    }
    const n = this.menu.opciones.length;
    if (a.toqueX >= 0) {
      const i = opcionTocada(a.toqueX, a.toqueY, n);
      if (i >= 0) this.elegir(i);
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) {
      this.menu.seleccion = (this.menu.seleccion + dir + n) % n;
      sonar('cursor');
      anunciar(this.textoElegida());
    }
    this.ultimoX = dir;
    if (a.confirmar) this.elegir(this.menu.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarDificultad(ctx, this.subtitulo, this.fichas[this.menu.seleccion]!, this.menu);
  }

  private textoElegida(): string {
    const d = this.dificultades[this.menu.seleccion]!;
    return `${d.nombre}. ${d.descripcion}`;
  }

  private elegir(i: number): void {
    const d = this.dificultades[i];
    if (!d) return;
    this.menu.seleccion = i;
    this.elegida = true;
    sonar('confirmar');
    this.alElegir(d);
  }
}
