import type { Acciones } from '../core/acciones';
import type { Luchador } from '../core/combate';
import { mejorar } from '../core/progresion';
import type { Mejora, ReglasCombate } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import { dentro } from '../render/pantalla';
import { dibujarPuntos, FILAS_PUNTOS, SIGNO, type FilaPuntos } from '../render/puntos';
import { sonar } from '../render/sonido';
import type { Escena } from './escena';

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
    const dy = Math.sign(a.moverY);
    if (dy !== 0 && dy !== this.ultimoY) {
      this.activa = (this.activa + dy + MEJORAS.length) % MEJORAS.length;
      sonar('cursor');
      this.rehacer();
      this.anunciarFila();
    }
    this.ultimoY = dy;
    const dx = Math.sign(a.moverX);
    if (dx !== 0 && dx !== this.ultimoX) this.poner(dx);
    this.ultimoX = dx;
    if (a.confirmar) this.terminar(true);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarPuntos(ctx, {
      titulo: 'Puntos de mejora',
      libres: this.libres,
      pista: '↑↓ elegir · ← → quitar o poner · Enter listo',
      filas: this.filas,
      menu: this.menu,
    });
  }

  private tocar(x: number, y: number): void {
    const boton = opcionTocada(x, y, this.menu.opciones.length);
    if (boton >= 0) {
      this.terminar(boton === 1);
      return;
    }
    const i = FILAS_PUNTOS.findIndex((r) => dentro(x, y, r));
    const r = FILAS_PUNTOS[i];
    if (!r) return;
    this.activa = i;
    const dx = x - r.x;
    if (dx >= SIGNO.menos && dx < SIGNO.menos + SIGNO.ancho) this.poner(-1);
    else if (dx >= SIGNO.mas && dx < SIGNO.mas + SIGNO.ancho) this.poner(1);
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
        porPunto: clave === 'critico' ? `+${mejoras[clave].toFixed(1)}` : `+${mejoras[clave]}`,
        valor: puestos > 0 ? `${antes} → ${this.valor(clave, puestos)}` : antes,
        sube: puestos > 0,
        activa: i === this.activa,
      };
    });
  }

  private anunciarFila(): void {
    const f = this.filas[this.activa];
    if (f) anunciar(`${f.nombre}: ${f.valor}. ${this.libres}`);
  }
}
