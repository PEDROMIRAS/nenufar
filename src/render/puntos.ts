import { dibujarMenu, type MenuVista } from './combate';
import {
  dibujarCabecera,
  dibujarCaja,
  dibujarFila,
  dibujarFondo,
  dibujarMarco,
  PALETA,
} from './marco';
import { ANCHO } from './pantalla';
import { escribir } from './texto';

/** Una fila de la pantalla de puntos: qué se mejora, cuánto da un punto y cómo queda. */
export interface FilaPuntos {
  nombre: string;
  /** «+5/punto». */
  porPunto: string;
  /** «45», o «45 → 55» con los puntos puestos. */
  valor: string;
  /** Se puede quitar o poner un punto (si no, el botón se ve apagado). */
  puedeQuitar: boolean;
  puedePoner: boolean;
  /** Tiene puntos puestos (el valor se ve en verde). */
  sube: boolean;
  activa: boolean;
}

export interface VistaPuntos {
  titulo: string;
  /** «Puntos libres: 2». */
  libres: string;
  pista: string;
  filas: FilaPuntos[];
  menu: MenuVista;
}

/** Filas de las mejoras, en píxeles lógicos (también para saber dónde se toca). */
export const FILAS_PUNTOS = Array.from({ length: 7 }, (_, i) => ({
  x: 16,
  y: 70 + i * 30,
  ancho: ANCHO - 32,
  alto: 26,
}));
/** Zonas de «−» y «+» dentro de cada fila, como desplazamiento desde su borde izquierdo. */
export const SIGNO = { menos: 300, mas: 404, ancho: 44 };

const SUBE = '#7fd88a';

/** Pantalla de puntos de mejora: una fila por cosa que se puede mejorar, con − y +, y el menú. */
export function dibujarPuntos(ctx: CanvasRenderingContext2D, v: VistaPuntos): void {
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 6, v.titulo, 20);
  escribir(ctx, v.libres, ANCHO / 2, 36, PALETA.texto, 'center');
  escribir(ctx, v.pista, ANCHO / 2, 52, PALETA.apagada, 'center');
  dibujarMarco(ctx, 8, 66, ANCHO - 16, 218);

  for (let i = 0; i < v.filas.length; i++) {
    const f = v.filas[i]!;
    const r = FILAS_PUNTOS[i]!;
    dibujarFila(ctx, r.x, r.y, r.ancho, r.alto, '', '', f.activa ? 'elegida' : 'normal');
    const y = r.y + 7;
    escribir(ctx, f.nombre, r.x + 16, y, f.activa ? PALETA.elegida : PALETA.texto);
    escribir(ctx, f.porPunto, r.x + 120, y, PALETA.claro);
    escribir(ctx, f.valor, r.x + 200, y, f.sube ? SUBE : PALETA.texto);
    dibujarSigno(ctx, r.x + SIGNO.menos, r.y, r.alto, '−', f.activa, f.puedeQuitar);
    dibujarSigno(ctx, r.x + SIGNO.mas, r.y, r.alto, '+', f.activa, f.puedePoner);
  }

  dibujarMenu(ctx, v.menu);
}

/** Botón − o +; apagado (borde oscuro, signo gris) cuando no hace nada: sin puntos que quitar o poner. */
function dibujarSigno(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alto: number,
  signo: string,
  activa: boolean,
  sirve: boolean,
): void {
  const estado = !sirve ? 'apagada' : activa ? 'elegida' : 'normal';
  dibujarCaja(ctx, x, y + 2, SIGNO.ancho, alto - 4, estado);
  escribir(ctx, signo, x + SIGNO.ancho / 2, y + 7, sirve ? PALETA.texto : PALETA.apagada, 'center');
}
