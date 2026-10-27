import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarCaja, dibujarFondo, dibujarMarco, PALETA } from './marco';
import { ANCHO } from './pantalla';
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
  /** «12», o «12 → 15» si cambia (hecho al rehacer, no en cada fotograma). */
  texto: string;
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
  efecto: '#c89bff',
  sube: '#7fd88a',
  baja: '#e8746a',
};

/** Pantalla de equipo: la rana vestida, las filas con flechas y cómo cambian las estadísticas. */
export function dibujarEquipo(ctx: CanvasRenderingContext2D, v: VistaEquipo): void {
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 6, v.titulo, 20);
  escribir(ctx, v.pista, ANCHO / 2, 38, PALETA.apagada, 'center');

  dibujarMarco(ctx, 16, 56, 168, 228);
  dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, 100, 200, 3);

  for (let i = 0; i < v.filas.length; i++) {
    const f = v.filas[i]!;
    const r = FILAS_EQUIPO[i]!;
    dibujarCaja(ctx, r.x, r.y, r.ancho, r.alto, f.activa ? 'elegida' : 'normal');
    escribir(ctx, f.etiqueta, r.x + r.ancho / 2, r.y + 5, PALETA.claro, 'center');
    escribir(
      ctx,
      f.nombre,
      r.x + r.ancho / 2,
      r.y + 22,
      f.activa ? PALETA.elegida : PALETA.texto,
      'center',
    );
    if (f.flechas) {
      const color = f.activa ? PALETA.cursor : PALETA.texto;
      escribir(ctx, '‹', r.x + ANCHO_FLECHA / 2, r.y + 8, color, 'center', FUENTE_GRANDE);
      escribir(ctx, '›', r.x + r.ancho - ANCHO_FLECHA / 2, r.y + 8, color, 'center', FUENTE_GRANDE);
    }
    if (f.efecto)
      escribir(ctx, f.efecto, r.x + r.ancho / 2, r.y + r.alto + 3, COLOR.efecto, 'center');
  }

  // Estadísticas en dos columnas: en verde lo que sube, en rojo lo que baja.
  dibujarMarco(ctx, 200, 196, 264, 88);
  for (let i = 0; i < v.cambios.length; i++) {
    const c = v.cambios[i]!;
    const x = 210 + (i % 2) * 130;
    const y = 204 + Math.floor(i / 2) * 26;
    const color = c.ahora > c.antes ? COLOR.sube : c.ahora < c.antes ? COLOR.baja : PALETA.texto;
    escribir(ctx, c.nombre, x, y, PALETA.claro);
    escribir(ctx, c.texto, x, y + 12, color);
  }

  dibujarMenu(ctx, v.menu);
}
