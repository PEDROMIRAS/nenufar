import type { Acciones } from '../core/acciones';
import type { Luchador } from '../core/combate';
import {
  coloresDeEquipo,
  describirEfecto,
  guardarPieza,
  piezasDe,
  ponerPieza,
} from '../core/equipo';
import type { Inventario } from '../core/inventario';
import { instantanea, type Instantanea } from '../core/progresion';
import type { EquipoJson, EstadoJson, Estadisticas, ObjetosJson } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import {
  ANCHO_FLECHA,
  dibujarEquipo,
  FILAS_EQUIPO,
  type CambioEstadistica,
  type FilaEquipo,
} from '../render/equipo';
import { dentro } from '../render/pantalla';
import type { Sprite } from '../render/recursos';
import { sonar } from '../render/sonido';
import { recolorear } from '../render/tinte';
import type { Escena } from './escena';

export interface DatosEquipo {
  luchadora: Luchador;
  inventario: Inventario;
  objetos: ObjetosJson;
  estados: Record<string, EstadoJson>;
  /** La hoja de la heroína y su imagen sin recolorear, para enseñarla con el equipo que se mire. */
  sprite: Sprite;
  imagenBase: HTMLImageElement;
}

/**
 * Qué se hace en la pantalla: decidir sobre una pieza recién encontrada (ponérsela o guardarla en la
 * mochila; nunca se pierde) o cambiar arma y armadura entre las que se tienen, desde el inventario.
 */
export type ModoEquipo = { tipo: 'hallazgo'; clave: string } | { tipo: 'cambiar' };

type Hueco = 'arma' | 'armadura';
const HUECOS: readonly Hueco[] = ['arma', 'armadura'];
const ETIQUETAS: Record<Hueco, string> = { arma: 'Arma', armadura: 'Armadura' };
/** Estadísticas que se enseñan, con la clave de bonos de objetos.json que les afecta. */
const ESTADISTICAS: [keyof Instantanea, keyof Estadisticas, string][] = [
  ['pvMax', 'pv', 'PV máx.'],
  ['pmMax', 'pm', 'PM máx.'],
  ['ataque', 'ataque', 'Ataque'],
  ['magia', 'magia', 'Magia'],
  ['defensa', 'defensa', 'Defensa'],
  ['velocidad', 'velocidad', 'Velocidad'],
];

/** Pantalla de equipo: la rana vestida con lo que se mira, sus estadísticas antes y después, y la decisión. */
export class EscenaEquipo implements Escena {
  private tiempo = 0;
  private activa = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  private readonly menu: MenuVista;
  /** Estadísticas al entrar: el «antes» de la comparación al cambiar desde el inventario. */
  private readonly antes: Instantanea;
  private sprite: Sprite;
  private filas: FilaEquipo[] = [];
  private cambios: CambioEstadistica[] = [];
  private readonly titulo: string;
  private readonly pista: string;

  constructor(
    private readonly d: DatosEquipo,
    private readonly modo: ModoEquipo,
    private readonly alTerminar: () => void,
  ) {
    this.antes = instantanea(d.luchadora);
    this.sprite = d.sprite;
    if (modo.tipo === 'hallazgo') {
      const nueva = this.pieza(modo.clave);
      this.activa = HUECOS.indexOf(nueva.hueco);
      this.titulo = `¡Has encontrado ${nueva.nombre}!`;
      this.pista = 'Lo que no te pongas se guarda en la mochila';
      // Si no llevaba nada en ese hueco, no hay nada que pensar: solo ponérsela.
      const llevaba = d.inventario[nueva.hueco] !== null;
      this.menu = {
        opciones: [
          { texto: 'Ponérmela', detalle: '', disponible: true },
          ...(llevaba ? [{ texto: 'Guardar en la mochila', detalle: '', disponible: true }] : []),
        ],
        seleccion: 0,
      };
    } else {
      this.titulo = 'Equipo';
      this.pista = '↑↓ arma o armadura · ← → cambiar · Enter listo';
      this.menu = { opciones: [{ texto: 'Listo', detalle: '', disponible: true }], seleccion: 0 };
    }
    this.rehacer();
  }

  enter(): void {
    anunciar(
      [
        this.titulo,
        ...this.filas.map((f) => `${f.etiqueta}: ${f.nombre}${f.efecto ? `, ${f.efecto}` : ''}`),
        ...this.cambios
          .filter((c) => c.ahora !== c.antes)
          .map((c) => `${c.nombre} de ${c.antes} a ${c.ahora}`),
      ].join('. '),
    );
  }
  exit(): void {}

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (a.toqueX >= 0) {
      this.tocar(a.toqueX, a.toqueY);
      return;
    }
    if (a.cancelar) {
      // Salir nunca pierde nada: al encontrar una pieza, se guarda en la mochila.
      this.terminar(false);
      return;
    }
    const dy = Math.sign(a.moverY);
    if (dy !== 0 && dy !== this.ultimoY && this.modo.tipo === 'cambiar') {
      this.activa = (this.activa + dy + HUECOS.length) % HUECOS.length;
      sonar('cursor');
      this.rehacer();
      this.anunciarFila();
    }
    this.ultimoY = dy;
    const dx = Math.sign(a.moverX);
    if (dx !== 0 && dx !== this.ultimoX) {
      if (this.modo.tipo === 'cambiar') {
        this.ciclar(dx);
      } else {
        const n = this.menu.opciones.length;
        this.menu.seleccion = (this.menu.seleccion + dx + n) % n;
        sonar('cursor');
        anunciar(this.menu.opciones[this.menu.seleccion]?.texto ?? '');
      }
    }
    this.ultimoX = dx;
    if (a.confirmar) this.elegir(this.menu.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarEquipo(ctx, {
      titulo: this.titulo,
      pista: this.pista,
      sprite: this.sprite,
      tiempo: this.tiempo,
      filas: this.filas,
      cambios: this.cambios,
      menu: this.menu,
    });
  }

  private tocar(x: number, y: number): void {
    const boton = opcionTocada(x, y, this.menu.opciones.length);
    if (boton >= 0) {
      this.elegir(boton);
      return;
    }
    if (this.modo.tipo !== 'cambiar') return;
    const i = FILAS_EQUIPO.findIndex((r) => dentro(x, y, r));
    const r = FILAS_EQUIPO[i];
    if (!r) return;
    this.activa = i;
    if (x < r.x + ANCHO_FLECHA) this.ciclar(-1);
    else if (x >= r.x + r.ancho - ANCHO_FLECHA) this.ciclar(1);
    else this.rehacer();
  }

  private elegir(i: number): void {
    this.terminar(this.modo.tipo === 'hallazgo' && i === 0);
  }

  /** Al encontrar una pieza: ponérsela (la de antes va a la mochila) o guardarla. */
  private terminar(ponerla: boolean): void {
    sonar('confirmar');
    const { luchadora, inventario, objetos } = this.d;
    if (this.modo.tipo === 'hallazgo') {
      if (ponerla) ponerPieza(luchadora, inventario, objetos, this.modo.clave);
      else guardarPieza(inventario, this.modo.clave);
    }
    this.alTerminar();
  }

  /** Cambia la pieza del hueco elegido por la siguiente (o la anterior) que se tiene. */
  private ciclar(dir: number): void {
    const { luchadora, inventario, objetos } = this.d;
    const hueco = HUECOS[this.activa]!;
    const lista = piezasDe(inventario, objetos, hueco);
    if (lista.length < 2) return;
    const actual = lista.indexOf(inventario[hueco] ?? '');
    const siguiente = lista[(actual + dir + lista.length) % lista.length]!;
    ponerPieza(luchadora, inventario, objetos, siguiente);
    sonar('cursor');
    this.rehacer();
    this.anunciarFila();
  }

  private anunciarFila(): void {
    const f = this.filas[this.activa];
    if (f) anunciar(`${f.etiqueta}: ${f.nombre}${f.efecto ? `, ${f.efecto}` : ''}`);
  }

  private pieza(clave: string): EquipoJson {
    const p = this.d.objetos.equipo[clave];
    if (!p) throw new Error(`Equipo desconocido: ${clave}`);
    return p;
  }

  /** Lo que se ve: con la pieza encontrada puesta (sin ponérsela aún) o con el equipo de verdad. */
  private rehacer(): void {
    const { luchadora, inventario, objetos, estados, sprite, imagenBase } = this.d;
    const claveNueva = this.modo.tipo === 'hallazgo' ? this.modo.clave : null;
    const nueva = claveNueva ? this.pieza(claveNueva) : null;
    const vista: Inventario =
      nueva && claveNueva ? { ...inventario, [nueva.hueco]: claveNueva } : inventario;
    this.filas = HUECOS.map((hueco, i) => {
      const clave = vista[hueco];
      const p = clave ? objetos.equipo[clave] : undefined;
      return {
        etiqueta: nueva?.hueco === hueco ? `${ETIQUETAS[hueco]} · nueva` : ETIQUETAS[hueco],
        nombre: p?.nombre ?? 'Nada',
        efecto: p?.efecto ? describirEfecto(p.efecto, estados) : '',
        flechas: !nueva && piezasDe(inventario, objetos, hueco).length > 1,
        activa: i === this.activa,
      };
    });
    // Con una pieza encontrada, «ahora» es lo de hoy más lo que suma la nueva y menos lo que suma la de ese hueco.
    const vieja = nueva ? objetos.equipo[inventario[nueva.hueco] ?? ''] : undefined;
    const ahora = instantanea(luchadora);
    this.cambios = ESTADISTICAS.map(([clave, bono, nombre]) => ({
      nombre,
      antes: nueva ? ahora[clave] : this.antes[clave],
      ahora: ahora[clave] + (nueva?.bonos[bono] ?? 0) - (vieja?.bonos[bono] ?? 0),
    }));
    const heroe = luchadora.heroe;
    this.sprite = heroe
      ? {
          imagen: recolorear(imagenBase, coloresDeEquipo(heroe, vista, objetos)),
          datos: sprite.datos,
        }
      : sprite;
  }
}
