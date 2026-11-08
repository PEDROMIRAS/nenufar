import { disposicionEquipo, letrasEnAncho } from '../core/disposicion';
import type { Rect } from '../core/menu';
import { VERTICAL } from '../data/datos';
import { dibujarMenu, type MenuVista } from './combate';
import { dibujarCabecera, dibujarCaja, dibujarFondo, dibujarMarco, PALETA, rombo } from './marco';
import { ANCHO, interfaz } from './pantalla';
import { dibujarFotograma, type Sprite } from './recursos';
import { escribir, FUENTE_GRANDE, partirCacheado } from './texto';

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

/** La disposición de la interfaz alta, recordada mientras no cambia el tamaño. */
let alta: { ancho: number; alto: number; d: ReturnType<typeof disposicionEquipo> } | null = null;

function disposicionAlta(): ReturnType<typeof disposicionEquipo> {
  if (!alta || alta.ancho !== interfaz.ancho || alta.alto !== interfaz.alto)
    alta = {
      ancho: interfaz.ancho,
      alto: interfaz.alto,
      d: disposicionEquipo(interfaz.ancho, interfaz.alto, VERTICAL),
    };
  return alta.d;
}

/** Las filas de arma y armadura ahora (para dibujar y para tocar). */
export const filasEquipo = (): readonly Rect[] =>
  interfaz.alta ? disposicionAlta().filas : FILAS_EQUIPO;

const COLOR = {
  efecto: '#c89bff',
  sube: '#7fd88a',
  baja: '#e8746a',
};

/** Pantalla de equipo: la rana vestida, las filas con flechas y cómo cambian las estadísticas. */
export function dibujarEquipo(ctx: CanvasRenderingContext2D, v: VistaEquipo): void {
  dibujarFondo(ctx);
  const esAlta = interfaz.alta;
  const disposicion = esAlta ? disposicionAlta() : null;
  const centro = interfaz.ancho / 2;
  if (disposicion) {
    // El título (a 24 px de letra, partido si no cabe) y la pista, una línea bajo otra.
    const titulo = partirCacheado(v.titulo, letrasEnAncho((interfaz.ancho - 16) / 2));
    for (let i = 0; i < titulo.length; i++)
      escribir(ctx, titulo[i]!, centro, 6 + i * 26, PALETA.claro, 'center', FUENTE_GRANDE);
    const yFilete = 6 + titulo.length * 26;
    ctx.fillStyle = PALETA.filete;
    ctx.fillRect(centro - 80, yFilete, 160, 1);
    rombo(ctx, centro, yFilete, 6, PALETA.cursor);
    const pista = partirCacheado(v.pista, letrasEnAncho(interfaz.ancho - 2 * VERTICAL.menu.margen));
    for (let i = 0; i < pista.length; i++)
      escribir(ctx, pista[i]!, centro, yFilete + 8 + i * 14, PALETA.apagada, 'center');
    const rana = disposicion.rana;
    dibujarMarco(ctx, rana.x, rana.y, rana.ancho, rana.alto);
    dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, centro, rana.y + 98, 3);
  } else {
    dibujarCabecera(ctx, 6, v.titulo, 20);
    escribir(ctx, v.pista, ANCHO / 2, 38, PALETA.apagada, 'center');
    dibujarMarco(ctx, 16, 56, 168, 228);
    dibujarFotograma(ctx, v.sprite, 'idle', 'down', v.tiempo, 100, 200, 3);
  }

  const filas = filasEquipo();
  for (let i = 0; i < v.filas.length; i++) {
    const f = v.filas[i]!;
    const r = filas[i]!;
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
    if (f.efecto) {
      // El efecto va debajo; en la interfaz alta, partido al ancho (dos líneas como mucho).
      const lineas = esAlta
        ? partirCacheado(f.efecto, letrasEnAncho(r.ancho))
        : partirCacheado(f.efecto, 999);
      for (let l = 0; l < lineas.length; l++)
        escribir(
          ctx,
          lineas[l]!,
          r.x + r.ancho / 2,
          r.y + r.alto + 3 + l * 13,
          COLOR.efecto,
          'center',
        );
    }
  }

  // Estadísticas en dos columnas: en verde lo que sube, en rojo lo que baja.
  const e = disposicion?.estadisticas ?? { x: 200, y: 196, ancho: 264, alto: 88 };
  dibujarMarco(ctx, e.x, e.y, e.ancho, e.alto);
  for (let i = 0; i < v.cambios.length; i++) {
    const c = v.cambios[i]!;
    const x = e.x + 10 + (i % 2) * (e.ancho / 2 - 2);
    const y = e.y + 8 + Math.floor(i / 2) * 26;
    const color = c.ahora > c.antes ? COLOR.sube : c.ahora < c.antes ? COLOR.baja : PALETA.texto;
    escribir(ctx, c.nombre, x, y, PALETA.claro);
    escribir(ctx, c.texto, x, y + 12, color);
  }

  dibujarMenu(ctx, v.menu);
}
