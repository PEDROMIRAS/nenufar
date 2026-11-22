import type { Acciones } from '../core/acciones';
import { habilidadesConocidas, type Luchador } from '../core/combate';
import { describirHabilidad } from '../core/descripciones';
import { ANCHO_LETRA, disposicionHabilidades } from '../core/disposicion';
import { alternarEquipada, puedeCerrar } from '../core/equipadas';
import { efectoToque, filaTocada } from '../core/menu';
import { partirTexto } from '../core/texto';
import type { EstadoJson, HabilidadJson } from '../core/types';
import { VERTICAL } from '../data/datos';
import historia from '../data/historia.json';
import { anunciar } from '../render/accesibilidad';
import { dibujarFila, dibujarFondo, dibujarMarco, PALETA, triangulo } from '../render/marco';
import { interfaz } from '../render/pantalla';
import { sonar } from '../render/sonido';
import { escribir, FUENTE_GRANDE } from '../render/texto';
import type { Escena } from './escena';
import { letras } from './mensaje';

const T = historia.habilidades;
/** Lado de la casilla de equipada, y su sitio dentro de la fila (antes del nombre). */
const CASILLA = 8;
const X_CASILLA = 18;
/** El nombre va tras la casilla: dos letras de hueco. */
const SANGRIA = '  ';

/**
 * Elegir las habilidades equipadas: una fila por cada una que conoce, con su casilla y su coste, y «Listo». Confirmar
 * sobre una la pone o la quita; «Listo» (o Cancelar) cierra si lleva las que debe. A la derecha (horizontal) o debajo
 * (vertical), qué hace la que está bajo el cursor. Con el dedo, el primer toque elige y explica; el segundo la usa.
 */
export class EscenaHabilidades implements Escena {
  readonly alta = true;

  private readonly conocidas: readonly HabilidadJson[];
  private readonly maximo: number;
  private seleccion = 0;
  /** Primera fila a la vista (si no caben todas) y cuántas se ven, según el último dibujo. */
  private primera = 0;
  private visibles = Infinity;
  /** La dirección vertical del paso anterior; null hasta el primero, para ignorar la que se trae pulsada. */
  private ultimoY: number | null = null;
  private hecha = false;
  /** Aviso de lo que no se pudo hacer («quita una antes»), hasta mover el cursor. */
  private aviso = '';
  // Los textos se parten al cambiar la selección o la forma de la interfaz, no en cada fotograma.
  private letrasTitulo = 0;
  private letrasDetalle = 0;
  private titulos: readonly string[] = [];
  private detalle: readonly string[] = [];
  /** «Llevas 2 de 3», rehecho solo al cambiar las equipadas. */
  private textoLlevas = '';

  constructor(
    private readonly l: Luchador,
    private readonly estados: Record<string, EstadoJson>,
    private readonly alCerrar: () => void,
  ) {
    this.conocidas = habilidadesConocidas(l);
    this.maximo = l.heroe?.equipables ?? 0;
    this.textoLlevas = this.llevas();
  }

  private get filas(): number {
    return this.conocidas.length + 1;
  }

  enter(): void {
    anunciar(`${this.titulo()}. ${this.textoFila(this.seleccion)}`);
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
    if (this.hecha) return;
    if (a.cancelar) {
      this.cerrar();
      return;
    }
    if (a.toqueX >= 0) {
      const d = this.disposicion();
      const k = filaTocada(a.toqueX, a.toqueY, d.lista, d.fila, d.visibles);
      if (k < 0) return;
      const i = this.primera + k;
      if (efectoToque(this.seleccion, i, true) === 'elegir') this.mover(i);
      else this.activar(i);
      return;
    }
    const dir = Math.sign(a.moverY);
    if (this.ultimoY !== null && dir !== 0 && dir !== this.ultimoY)
      this.mover((this.seleccion + dir + this.filas) % this.filas);
    this.ultimoY = dir;
    if (a.confirmar) this.activar(this.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const l = letras();
    if (l.titulo !== this.letrasTitulo) {
      this.letrasTitulo = l.titulo;
      this.titulos = partirTexto(this.titulo(), l.titulo);
    }
    dibujarFondo(ctx);
    dibujarMarco(ctx, 16, 16, interfaz.ancho - 32, interfaz.alto - 32);
    const centro = interfaz.ancho / 2;
    for (let i = 0; i < this.titulos.length; i++)
      escribir(ctx, this.titulos[i]!, centro, 40 + i * 30, PALETA.claro, 'center', FUENTE_GRANDE);
    const d = this.disposicion();
    this.visibles = d.visibles;
    this.encuadrar();
    for (let k = 0; k < d.visibles; k++) {
      const i = this.primera + k;
      const y = d.lista.y + k * d.fila;
      const hab = this.conocidas[i];
      const estado = i === this.seleccion ? 'elegida' : 'normal';
      if (!hab) {
        dibujarFila(ctx, d.lista.x, y, d.lista.ancho, d.fila, T.listo, this.textoLlevas, estado);
        continue;
      }
      dibujarFila(
        ctx,
        d.lista.x,
        y,
        d.lista.ancho,
        d.fila,
        SANGRIA + hab.nombre,
        `${hab.pm} PM`,
        estado,
      );
      const yc = y + (d.fila - CASILLA) / 2;
      ctx.strokeStyle = PALETA.claro;
      ctx.lineWidth = 1;
      ctx.strokeRect(d.lista.x + X_CASILLA + 0.5, yc + 0.5, CASILLA - 1, CASILLA - 1);
      if (this.l.equipadas.includes(hab.nombre)) {
        ctx.fillStyle = PALETA.claro;
        ctx.fillRect(d.lista.x + X_CASILLA + 2, yc + 2, CASILLA - 4, CASILLA - 4);
      }
    }
    // Flechas de que hay más filas arriba o abajo.
    const xFlecha = d.lista.x + d.lista.ancho / 2;
    if (this.primera > 0) triangulo(ctx, xFlecha, d.lista.y - 4, 10, 6, true, PALETA.claro);
    if (this.primera + d.visibles < this.filas)
      triangulo(ctx, xFlecha, d.lista.y + d.lista.alto + 4, 10, 6, false, PALETA.claro);
    const letrasDetalle = Math.max(10, Math.floor(d.detalle.ancho / ANCHO_LETRA));
    if (letrasDetalle !== this.letrasDetalle) {
      this.letrasDetalle = letrasDetalle;
      this.partirDetalle();
    }
    const linea = VERTICAL.habilidades.lineaDetalle;
    const caben = Math.floor(d.detalle.alto / linea);
    for (let i = 0; i < Math.min(caben, this.detalle.length); i++) {
      const color = this.aviso && i < this.lineasAviso ? PALETA.peligro : PALETA.texto;
      escribir(ctx, this.detalle[i]!, d.detalle.x, d.detalle.y + i * linea, color);
    }
  }

  private lineasAviso = 0;

  private disposicion(): ReturnType<typeof disposicionHabilidades> {
    const yLista = 48 + Math.max(1, this.titulos.length) * 30 + 4;
    return disposicionHabilidades(
      interfaz.ancho,
      interfaz.alto,
      this.filas,
      interfaz.alta,
      yLista,
      VERTICAL,
    );
  }

  /** Que la fila elegida esté a la vista. */
  private encuadrar(): void {
    if (this.seleccion < this.primera) this.primera = this.seleccion;
    else if (this.seleccion >= this.primera + this.visibles)
      this.primera = this.seleccion - this.visibles + 1;
  }

  private titulo(): string {
    return T.titulo.replace('{n}', String(this.maximo));
  }

  private llevas(): string {
    return T.llevas
      .replace('{llevas}', String(this.l.equipadas.length))
      .replace('{n}', String(this.maximo));
  }

  /** Lo que dice una fila: la habilidad con lo que hace y si va equipada, o lo que se lleva en «Listo». */
  private textoFila(i: number): string {
    const hab = this.conocidas[i];
    if (!hab) return `${T.listo}. ${this.llevas()}.`;
    const equipada = this.l.equipadas.includes(hab.nombre) ? ` ${T.equipada}.` : '';
    return `${hab.nombre}, ${hab.pm} PM.${equipada} ${describirHabilidad(hab, this.estados)}`;
  }

  private partirDetalle(): void {
    const aviso = this.aviso ? partirTexto(this.aviso, this.letrasDetalle) : [];
    this.lineasAviso = aviso.length;
    this.detalle = [...aviso, ...partirTexto(this.textoFila(this.seleccion), this.letrasDetalle)];
  }

  private mover(i: number): void {
    this.seleccion = i;
    this.aviso = '';
    this.encuadrar();
    sonar('cursor');
    this.partirDetalle();
    anunciar(this.textoFila(i));
  }

  private activar(i: number): void {
    const hab = this.conocidas[i];
    if (!hab) return this.cerrar();
    const r = alternarEquipada(this.l, hab.nombre);
    this.textoLlevas = this.llevas();
    this.aviso = r === 'llena' ? T.llena.replace('{n}', String(this.maximo)) : '';
    sonar(r === 'llena' ? 'cursor' : 'confirmar');
    this.partirDetalle();
    anunciar(this.aviso || this.textoFila(i));
  }

  private cerrar(): void {
    if (!puedeCerrar(this.l)) {
      this.aviso = T.faltan.replace('{n}', String(this.maximo));
      sonar('cursor');
      this.partirDetalle();
      anunciar(this.aviso);
      return;
    }
    this.hecha = true;
    sonar('confirmar');
    this.alCerrar();
  }
}
