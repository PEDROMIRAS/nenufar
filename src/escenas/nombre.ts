import type { Acciones } from '../core/acciones';
import { limpiarNombre } from '../core/nombre';
import type { HeroeJson } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { guardarNombre } from '../render/almacen';
import type { CampoNombre } from '../render/campoNombre';
import { opcionTocada, type MenuVista } from '../render/combate';
import { dibujarNombre, LARGO_NOMBRE } from '../render/nombre';
import type { Sprite } from '../render/recursos';
import { ponerMusica, sonar } from '../render/sonido';
import type { Escena } from './escena';

/**
 * Nombre de la rana, después de elegirla y antes de la dificultad. Se pide siempre, con el nombre
 * de la rana como sugerencia; vacío, se queda ese.
 */
export class EscenaNombre implements Escena {
  private tiempo = 0;
  private hecho = false;
  private ultimoX = 0;
  private ultimoY = 0;
  private estabaEnCampo = true;
  private readonly menu: MenuVista = {
    opciones: [
      { texto: 'Volver', detalle: '', disponible: true },
      { texto: 'Seguir', detalle: '', disponible: true },
    ],
    seleccion: 1,
  };

  constructor(
    private readonly heroe: HeroeJson,
    private readonly sprite: Sprite,
    private readonly campo: CampoNombre,
    private readonly alSeguir: (nombre: string) => void,
    private readonly alVolver: () => void,
  ) {}

  enter(): void {
    this.hecho = false;
    this.menu.seleccion = 1;
    this.estabaEnCampo = true;
    this.campo.mostrar(
      this.heroe.nombre,
      () => this.seguir(),
      () => this.volver(),
    );
    anunciar(
      `¿Cómo se llama tu rana? Escribe un nombre y pulsa Enter. Si lo dejas vacío será ${this.heroe.nombre}.`,
    );
  }

  exit(): void {
    this.campo.ocultar();
  }

  update(dt: number, a: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    if (a.toqueX >= 0) {
      const i = opcionTocada(a.toqueX, a.toqueY, this.menu.opciones.length);
      if (i === 0) this.volver();
      else if (i === 1) this.seguir();
      return;
    }
    // Con el foco fuera del campo (↓ o Tab desde él), las flechas van por los botones y ↑ vuelve.
    const dx = Math.sign(a.moverX);
    const dy = Math.sign(a.moverY);
    const enCampo = this.campo.enfocado();
    if (!enCampo && this.estabaEnCampo) anunciar(this.menu.opciones[this.menu.seleccion]!.texto);
    this.estabaEnCampo = enCampo;
    if (!enCampo) {
      if (dx !== 0 && dx !== this.ultimoX) {
        this.menu.seleccion = 1 - this.menu.seleccion;
        sonar('cursor');
        anunciar(this.menu.opciones[this.menu.seleccion]!.texto);
      } else if (dy < 0 && dy !== this.ultimoY) {
        this.campo.enfocar();
        anunciar('Nombre de tu rana');
      }
    }
    this.ultimoX = dx;
    this.ultimoY = dy;
    if (a.cancelar) this.volver();
    else if (a.confirmar) {
      if (this.menu.seleccion === 0) this.volver();
      else this.seguir();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarNombre(ctx, this.sprite, this.heroe.nombre, this.tiempo, this.menu);
  }

  private seguir(): void {
    if (this.hecho) return;
    this.hecho = true;
    sonar('confirmar');
    const nombre = limpiarNombre(this.campo.leer(), this.heroe.nombre, LARGO_NOMBRE);
    guardarNombre(this.heroe.nombre, nombre);
    this.alSeguir(nombre);
  }

  private volver(): void {
    if (this.hecho) return;
    this.hecho = true;
    this.alVolver();
  }
}
