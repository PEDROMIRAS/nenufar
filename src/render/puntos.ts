import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO, FONDO } from './pantalla';
import { escribir, FUENTE_GRANDE } from './texto';

/** Una fila de la pantalla de puntos: qué se mejora, cuánto da un punto y cómo queda. */
export interface FilaPuntos {
  nombre: string;
  /** «+5» por punto. */
  porPunto: string;
  /** «45», o «45 → 55» con los puntos puestos. */
  valor: string;
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
  y: 66 + i * 30,
  ancho: ANCHO - 32,
  alto: 26,
}));
/** Zonas de «−» y «+» dentro de cada fila, como desplazamiento desde su borde izquierdo. */
export const SIGNO = { menos: 300, mas: 404, ancho: 44 };

const COLOR = {
  fila: '#2b3a33',
  borde: '#8fa88a',
  activa: '#ffd27a',
  texto: '#e8efe4',
  tenue: '#aab8a6',
  sube: '#7fd88a',
};

/** Pantalla de puntos de mejora: una fila por cosa que se puede mejorar, con − y +, y el menú. */
export function dibujarPuntos(ctx: CanvasRenderingContext2D, v: VistaPuntos): void {
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, v.titulo, ANCHO / 2, 8, COLOR.activa, 'center', FUENTE_GRANDE);
  escribir(ctx, v.libres, ANCHO / 2, 36, COLOR.texto, 'center');
  escribir(ctx, v.pista, ANCHO / 2, 50, COLOR.tenue, 'center');

  v.filas.forEach((f, i) => {
    const r = FILAS_PUNTOS[i]!;
    ctx.fillStyle = COLOR.fila;
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    if (f.activa) {
      ctx.fillStyle = COLOR.activa;
      ctx.fillRect(r.x, r.y, 3, r.alto);
    }
    const y = r.y + 7;
    escribir(ctx, f.nombre, r.x + 12, y, f.activa ? COLOR.activa : COLOR.texto);
    escribir(ctx, f.porPunto, r.x + 120, y, COLOR.tenue);
    escribir(ctx, f.valor, r.x + 190, y, f.sube ? COLOR.sube : COLOR.texto);
    for (const [dx, signo] of [
      [SIGNO.menos, '−'],
      [SIGNO.mas, '+'],
    ] as const) {
      ctx.fillStyle = f.activa ? COLOR.activa : COLOR.borde;
      ctx.fillRect(r.x + dx, r.y + 2, SIGNO.ancho, r.alto - 4);
      ctx.fillStyle = COLOR.fila;
      ctx.fillRect(r.x + dx + 2, r.y + 4, SIGNO.ancho - 4, r.alto - 8);
      escribir(ctx, signo, r.x + dx + SIGNO.ancho / 2, y, COLOR.texto, 'center');
    }
  });

  dibujarMenu(ctx, v.menu);
}
