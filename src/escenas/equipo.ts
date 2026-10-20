import type { Acciones } from '../core/acciones';
import type { Luchador } from '../core/combate';
import { describirPieza, equipar } from '../core/equipo';
import type { Inventario } from '../core/inventario';
import type { EstadoJson, ObjetosJson } from '../core/types';
import { opcionTocada } from '../render/combate';
import { dibujarComparacion, OPCIONES_EQUIPO, type FichaPieza } from '../render/equipo';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/** Al encontrar una pieza de equipo: se compara con la que se lleva y la heroína decide si cambia. */
export class EscenaEquipo implements Escena {
  private seleccion = 0;
  private ultimoX = 0;
  private readonly titulo: string;
  private readonly actual: FichaPieza;
  private readonly nueva: FichaPieza;

  constructor(
    private readonly luchadora: Luchador,
    private readonly inventario: Inventario,
    private readonly objetos: ObjetosJson,
    estados: Record<string, EstadoJson>,
    private readonly clave: string,
    private readonly alTerminar: () => void,
  ) {
    const pieza = objetos.equipo[clave];
    if (!pieza) throw new Error(`Equipo desconocido: ${clave}`);
    const llevada = objetos.equipo[inventario[pieza.hueco] ?? ''];
    this.titulo = pieza.hueco === 'arma' ? '¡Un arma nueva!' : '¡Una armadura nueva!';
    this.actual = llevada
      ? { nombre: llevada.nombre, lineas: describirPieza(llevada, estados) }
      : { nombre: 'Nada', lineas: [] };
    this.nueva = { nombre: pieza.nombre, lineas: describirPieza(pieza, estados) };
  }

  enter(): void {
    const ficha = (f: FichaPieza): string => [f.nombre, ...f.lineas].join(', ');
    anunciar(
      `${this.titulo} Llevas: ${ficha(this.actual)}. Nueva: ${ficha(this.nueva)}. Enter para cambiar, Escape para dejarla.`,
    );
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    if (a.toqueX >= 0) {
      const i = opcionTocada(a.toqueX, a.toqueY, OPCIONES_EQUIPO.length);
      if (i >= 0) this.decidir(i === 0);
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) this.seleccion = 1 - this.seleccion;
    this.ultimoX = dir;
    if (a.confirmar) this.decidir(this.seleccion === 0);
    else if (a.cancelar) this.decidir(false);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarComparacion(ctx, this.titulo, this.actual, this.nueva, this.seleccion);
  }

  /** Si cambia, se pone la nueva y la vieja se descarta; si no, la nueva se queda donde estaba. */
  private decidir(cambiar: boolean): void {
    if (cambiar) equipar(this.luchadora, this.inventario, this.objetos, this.clave);
    this.alTerminar();
  }
}
