import { dibujarMenu, type MenuVista } from './combate';
import { ALTO, ANCHO, FONDO } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

/** Una fila de equipo: el hueco, la pieza que se ve y, si se puede cambiar, sus flechas. */
export interface FilaEquipo {
  etiqueta: string;
  nombre: string;
  /** Efecto especial de la pieza («10 % de Veneno al golpear»), o vacío. */
  efecto: string;
  flechas: boolean;
  activa: boolean;
}

/** Cómo queda una estadística: antes y con el equipo que se ve. */
export interface CambioEstadistica {
  nombre: string;
  antes: number;
  ahora: number;
}

export interface VistaEquipo {
  titulo: string;
  /** Línea de controles bajo el título. */
  pista: string;
  /** La rana con el equipo que se ve (ya recoloreada). */
  sprite: Sprite;
  tiempo: number;
  filas: FilaEquipo[];
  cambios: CambioEstadistica[];
  menu: MenuVista;
}

/** Filas de arma y armadura, en píxeles lógicos (también para saber dónde se toca). */
export const FILAS_EQUIPO = [0, 1].map((i) => ({ x: 200, y: 56 + i * 64, ancho: 264, alto: 44 }));
/** Ancho de la zona de cada flecha dentro de una fila. */
export const ANCHO_FLECHA = 44;

const COLOR = {
  panel: '#1f2a24',
  fila: '#2b3a33',
  borde: '#8fa88a',
  activa: '#ffd27a',
  texto: '#e8efe4',
  tenue: '#aab8a6',
  efecto: '#c89bff',
  sube: '#7fd88a',
  baja: '#e8746a',
};

/** Pantalla de equipo: la rana vestida, las filas con flechas y cómo cambian las estadísticas. */
export function dibujarEquipo(ctx: CanvasRenderingContext2D, v: VistaEquipo): void {
  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, v.titulo, ANCHO / 2, 8, COLOR.activa, 'center', FUENTE_GRANDE);
  escribir(ctx, v.pista, ANCHO / 2, 38, COLOR.tenue, 'center');

  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(16, 56, 168, 228);
  dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, 100, 200, 3);

  v.filas.forEach((f, i) => {
    const r = FILAS_EQUIPO[i]!;
    ctx.fillStyle = COLOR.fila;
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    ctx.fillStyle = f.activa ? COLOR.activa : COLOR.borde;
    ctx.fillRect(r.x, r.y, r.ancho, 2);
    ctx.fillRect(r.x, r.y + r.alto - 2, r.ancho, 2);
    escribir(ctx, f.etiqueta, r.x + r.ancho / 2, r.y + 5, COLOR.tenue, 'center');
    escribir(ctx, f.nombre, r.x + r.ancho / 2, r.y + 22, COLOR.texto, 'center');
    if (f.flechas) {
      const color = f.activa ? COLOR.activa : COLOR.texto;
      escribir(ctx, '‹', r.x + ANCHO_FLECHA / 2, r.y + 8, color, 'center', FUENTE_GRANDE);
      escribir(ctx, '›', r.x + r.ancho - ANCHO_FLECHA / 2, r.y + 8, color, 'center', FUENTE_GRANDE);
    }
    if (f.efecto)
      escribir(ctx, f.efecto, r.x + r.ancho / 2, r.y + r.alto + 3, COLOR.efecto, 'center');
  });

  // Estadísticas en dos columnas: en verde lo que sube, en rojo lo que baja.
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(200, 196, 264, 88);
  v.cambios.forEach((c, i) => {
    const x = 210 + (i % 2) * 130;
    const y = 204 + Math.floor(i / 2) * 26;
    const color = c.ahora > c.antes ? COLOR.sube : c.ahora < c.antes ? COLOR.baja : COLOR.texto;
    escribir(ctx, c.nombre, x, y, COLOR.tenue);
    escribir(ctx, c.ahora === c.antes ? `${c.ahora}` : `${c.antes} → ${c.ahora}`, x, y + 12, color);
  });

  dibujarMenu(ctx, v.menu);
}
