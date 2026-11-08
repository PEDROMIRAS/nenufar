import { botonesAltosCacheados, filasLista, letrasEnAncho } from '../core/disposicion';
import type { Rect } from '../core/menu';
import { VERTICAL } from '../data/datos';
import { dibujarMenu, type MenuVista } from './combate';
import {
  dibujarCabecera,
  dibujarCaja,
  dibujarFila,
  dibujarFondo,
  dibujarMarco,
  PALETA,
} from './marco';
import { ANCHO, interfaz } from './pantalla';
import { escribir, partirCacheado } from './texto';

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

/** Lo mismo en la interfaz alta: filas apiladas a ancho completo, con − y + pegados a la derecha. Recordado por tamaño. */
let altas: { ancho: number; alto: number; filas: Rect[]; signo: typeof SIGNO } | null = null;

function disposicionAlta(): NonNullable<typeof altas> {
  if (!altas || altas.ancho !== interfaz.ancho || altas.alto !== interfaz.alto) {
    const botones = botonesAltosCacheados(2, interfaz.ancho, interfaz.alto, VERTICAL);
    const { filas } = filasLista(7, 94, botones[0]!.y - 12, interfaz.ancho, VERTICAL);
    const mas = filas[0]!.ancho - 6 - 44;
    altas = {
      ancho: interfaz.ancho,
      alto: interfaz.alto,
      filas,
      signo: { menos: mas - 50, mas, ancho: 44 },
    };
  }
  return altas;
}

/** Las filas de las mejoras ahora (para dibujar y para tocar). */
export const filasPuntos = (): readonly Rect[] =>
  interfaz.alta ? disposicionAlta().filas : FILAS_PUNTOS;
/** Dónde están − y + dentro de cada fila ahora. */
export const signos = (): typeof SIGNO => (interfaz.alta ? disposicionAlta().signo : SIGNO);

const SUBE = '#7fd88a';

/** Pantalla de puntos de mejora: una fila por cosa que se puede mejorar, con − y +, y el menú. */
export function dibujarPuntos(ctx: CanvasRenderingContext2D, v: VistaPuntos): void {
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 6, v.titulo, 20);
  const alta = interfaz.alta;
  const centro = interfaz.ancho / 2;
  escribir(ctx, v.libres, centro, 36, PALETA.texto, 'center');
  const filas = filasPuntos();
  const signo = signos();
  if (alta) {
    // La pista, partida al ancho, y el marco tras las filas.
    const lineas = partirCacheado(
      v.pista,
      letrasEnAncho(interfaz.ancho - 2 * VERTICAL.menu.margen),
    );
    for (let i = 0; i < lineas.length; i++)
      escribir(ctx, lineas[i]!, centro, 52 + i * 14, PALETA.apagada, 'center');
    const ultima = filas[filas.length - 1]!;
    dibujarMarco(ctx, 8, 86, interfaz.ancho - 16, ultima.y + ultima.alto - 78);
  } else {
    escribir(ctx, v.pista, centro, 52, PALETA.apagada, 'center');
    dibujarMarco(ctx, 8, 66, ANCHO - 16, 218);
  }

  for (let i = 0; i < v.filas.length; i++) {
    const f = v.filas[i]!;
    const r = filas[i]!;
    dibujarFila(ctx, r.x, r.y, r.ancho, r.alto, '', '', f.activa ? 'elegida' : 'normal');
    const colorNombre = f.activa ? PALETA.elegida : PALETA.texto;
    if (alta) {
      // Nombre y, debajo, lo que da cada punto; el valor entre los dos y los signos.
      escribir(ctx, f.nombre, r.x + 16, r.y + 4, colorNombre);
      escribir(ctx, f.porPunto, r.x + 16, r.y + 19, PALETA.claro);
      escribir(ctx, f.valor, r.x + 106, r.y + (r.alto - 12) / 2, f.sube ? SUBE : PALETA.texto);
    } else {
      const y = r.y + 7;
      escribir(ctx, f.nombre, r.x + 16, y, colorNombre);
      escribir(ctx, f.porPunto, r.x + 120, y, PALETA.claro);
      escribir(ctx, f.valor, r.x + 200, y, f.sube ? SUBE : PALETA.texto);
    }
    dibujarSigno(ctx, r.x + signo.menos, r.y, r.alto, '−', f.activa, f.puedeQuitar);
    dibujarSigno(ctx, r.x + signo.mas, r.y, r.alto, '+', f.activa, f.puedePoner);
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
