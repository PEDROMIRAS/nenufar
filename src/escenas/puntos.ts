import type { Acciones } from '../core/acciones';
import type { Luchador } from '../core/combate';
import { mejorar } from '../core/progresion';
import type { Mejora, ReglasCombate } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import { dentro, esTactil } from '../render/pantalla';
import {
  dibujarPuntos,
  FILAS_PUNTOS,
  SIGNO,
  type FilaPuntos,
  type VistaPuntos,
} from '../render/puntos';
import { sonar } from '../render/sonido';
import type { Escena } from './escena';

const PISTA = esTactil()
  ? 'Toca − o + para quitar o poner puntos'
  : '↑↓ elegir · ← → quitar o poner · Enter listo';
/** Lo que se toca de más alrededor de − y + (con el dedo, el botón dibujado se queda corto). */
const HOLGURA = 22;

const MEJORAS: [Mejora, string][] = [
  ['pv', 'PV máx.'],
  ['pm', 'PM máx.'],
  ['ataque', 'Ataque'],
  ['magia', 'Magia'],
  ['defensa', 'Defensa'],
  ['velocidad', 'Velocidad'],
  ['critico', 'Crítico'],
];

/**
 * Reparto de los puntos de mejora: se ponen y quitan con − y + y no cuentan hasta pulsar Listo.
 * Salir sin más (Luego, Escape) los guarda para gastarlos otro día desde el inventario.
 */
export class EscenaPuntos implements Escena {
  private activa = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  private readonly puestos = MEJORAS.map(() => 0);
  private filas: FilaPuntos[] = [];
  private libres = '';
  private readonly menu: MenuVista;
  private readonly vista: VistaPuntos;

  constructor(
    private readonly l: Luchador,
    private readonly reglas: ReglasCombate,
    /** Texto del botón de salir sin gastar: «Luego» al subir de nivel, «Volver» desde el inventario. */
    salir: string,
    private readonly alTerminar: () => void,
  ) {
    this.menu = {
      opciones: [
        { texto: salir, detalle: '', disponible: true },
        { texto: 'Listo', detalle: '', disponible: true },
      ],
      seleccion: 1,
    };
    this.rehacer();
    this.vista = {
      titulo: 'Puntos de mejora',
      libres: this.libres,
      pista: PISTA,
      filas: this.filas,
      menu: this.menu,
    };
  }

  enter(): void {
    anunciar(
      `Puntos de mejora. ${this.libres}. Flechas arriba y abajo para elegir, izquierda y derecha para quitar o poner, Enter para terminar.`,
    );
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    if (a.toqueX >= 0) {
      this.tocar(a.toqueX, a.toqueY);
      return;
    }
    if (a.cancelar) {
      this.terminar(false);
      return;
    }
    // Debajo de la última estadística está la fila de botones (activa === MEJORAS.length).
    const enBotones = this.activa === MEJORAS.length;
    const dy = Math.sign(a.moverY);
    if (dy !== 0 && dy !== this.ultimoY) {
      this.activa = (this.activa + dy + MEJORAS.length + 1) % (MEJORAS.length + 1);
      sonar('cursor');
      this.rehacer();
      this.anunciarFila();
    }
    this.ultimoY = dy;
    const dx = Math.sign(a.moverX);
    if (dx !== 0 && dx !== this.ultimoX) {
      if (enBotones) {
        this.menu.seleccion = 1 - this.menu.seleccion;
        sonar('cursor');
        this.anunciarFila();
      } else {
        this.poner(dx);
      }
    }
    this.ultimoX = dx;
    // Desde una estadística, Enter es Listo; en los botones, el elegido.
    if (a.confirmar) this.terminar(!enBotones || this.menu.seleccion === 1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // La misma vista en cada fotograma, puesta al día (crear una nueva sería memoria en el bucle).
    this.vista.libres = this.libres;
    this.vista.filas = this.filas;
    dibujarPuntos(ctx, this.vista);
  }

  private tocar(x: number, y: number): void {
    const boton = opcionTocada(x, y, this.menu.opciones.length);
    if (boton >= 0) {
      this.terminar(boton === 1);
      return;
    }
    // Cada fila cuenta también el hueco hasta la siguiente: no hay toques que caigan en el vacío.
    const i = FILAS_PUNTOS.findIndex((r) => dentro(x, y, { ...r, y: r.y - 2, alto: r.alto + 4 }));
    const r = FILAS_PUNTOS[i];
    if (!r) return;
    this.activa = i;
    const dx = x - r.x;
    if (dx >= SIGNO.menos - HOLGURA && dx < SIGNO.menos + SIGNO.ancho + HOLGURA) this.poner(-1);
    else if (dx >= SIGNO.mas - HOLGURA) this.poner(1);
    else this.rehacer();
  }

  /** Pone (1) o quita (-1) un punto en la fila elegida, si se puede. */
  private poner(dir: number): void {
    const usados = this.puestos.reduce((a, b) => a + b, 0);
    const ahora = this.puestos[this.activa]!;
    if ((dir > 0 && usados >= this.l.puntos) || (dir < 0 && ahora === 0)) return;
    this.puestos[this.activa] = ahora + dir;
    sonar('cursor');
    this.rehacer();
    this.anunciarFila();
  }

  /** Listo gasta los puntos puestos; salir sin más los deja para luego. */
  private terminar(gastar: boolean): void {
    sonar('confirmar');
    if (gastar) {
      MEJORAS.forEach(([clave], i) => {
        for (let n = 0; n < this.puestos[i]!; n++) mejorar(this.l, clave, this.reglas.experiencia);
      });
    }
    this.alTerminar();
  }

  private valor(clave: Mejora, puntos: number): string {
    const n = puntos * this.reglas.experiencia.mejoras[clave];
    const { l } = this;
    if (clave === 'critico')
      return `×${(this.reglas.critico.multiplicador + l.critico + n).toFixed(1)}`;
    const base = clave === 'pv' ? l.pvMax : clave === 'pm' ? l.pmMax : l[clave];
    return `${base + n}`;
  }

  private rehacer(): void {
    const usados = this.puestos.reduce((a, b) => a + b, 0);
    this.libres = `Puntos libres: ${this.l.puntos - usados}`;
    const mejoras = this.reglas.experiencia.mejoras;
    this.filas = MEJORAS.map(([clave, nombre], i) => {
      const puestos = this.puestos[i]!;
      const antes = this.valor(clave, 0);
      return {
        nombre,
        porPunto: `+${clave === 'critico' ? mejoras[clave].toFixed(1) : mejoras[clave]}/punto`,
        valor: puestos > 0 ? `${antes} → ${this.valor(clave, puestos)}` : antes,
        puedeQuitar: puestos > 0,
        puedePoner: usados < this.l.puntos,
        sube: puestos > 0,
        activa: i === this.activa,
      };
    });
    // Un botón solo se ve elegido mientras se está en su fila (o tras tocarlo).
    if (this.activa === MEJORAS.length) {
      if (this.menu.seleccion < 0) this.menu.seleccion = 1;
    } else {
      this.menu.seleccion = -1;
    }
  }

  private anunciarFila(): void {
    const f = this.filas[this.activa];
    if (f) anunciar(`${f.nombre}: ${f.valor}. ${this.libres}`);
    else anunciar(this.menu.opciones[this.menu.seleccion]?.texto ?? '');
  }
}
