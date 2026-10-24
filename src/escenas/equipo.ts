import type { Acciones } from '../core/acciones';
import type { Luchador } from '../core/combate';
import {
  bonoDe,
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
  type VistaEquipo,
} from '../render/equipo';
import { dentro, esTactil } from '../render/pantalla';
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
  private readonly vista: VistaEquipo;

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
      this.pista = esTactil()
        ? 'Toca las flechas para cambiar de pieza'
        : '↑↓ elegir · ← → cambiar · Enter listo';
      this.menu = { opciones: [{ texto: 'Listo', detalle: '', disponible: true }], seleccion: 0 };
    }
    this.rehacer();
    this.vista = {
      titulo: this.titulo,
      pista: this.pista,
      sprite: this.sprite,
      tiempo: 0,
      filas: this.filas,
      cambios: this.cambios,
      menu: this.menu,
    };
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
      // Arma, armadura y, debajo, Listo (activa === HUECOS.length).
      this.activa = (this.activa + dy + HUECOS.length + 1) % (HUECOS.length + 1);
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
    // La misma vista en cada fotograma, puesta al día (crear una nueva sería memoria en el bucle).
    const v = this.vista;
    v.sprite = this.sprite;
    v.tiempo = this.tiempo;
    v.filas = this.filas;
    v.cambios = this.cambios;
    dibujarEquipo(ctx, v);
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
    const hueco = HUECOS[this.activa];
    if (!hueco) return; // en Listo, ← → no cambian nada
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
    else anunciar(this.menu.opciones[0]?.texto ?? '');
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
    this.cambios = ESTADISTICAS.map(([clave, bono, nombre]) => {
      const antes = nueva ? ahora[clave] : this.antes[clave];
      const nivel = luchadora.nivel;
      const despues =
        ahora[clave] +
        (nueva ? bonoDe(nueva, bono, nivel) : 0) -
        (vieja ? bonoDe(vieja, bono, nivel) : 0);
      const texto = despues === antes ? `${despues}` : `${antes} → ${despues}`;
      return { nombre, antes, ahora: despues, texto };
    });
    const heroe = luchadora.heroe;
    this.sprite = heroe
      ? {
          imagen: recolorear(imagenBase, coloresDeEquipo(heroe, vista, objetos)),
          datos: sprite.datos,
        }
      : sprite;
    // Al cambiar, Listo solo se ve elegido con las flechas en su fila (si no, parecerían dos a la vez).
    if (this.modo.tipo === 'cambiar') this.menu.seleccion = this.activa === HUECOS.length ? 0 : -1;
  }
}
