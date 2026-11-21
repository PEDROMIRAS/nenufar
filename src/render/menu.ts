import { partirTexto } from '../core/texto';
import { botonesAltosCacheados } from '../core/disposicion';
import { VERTICAL } from '../data/datos';
import { dibujarCaja, PALETA } from './marco';
import { ANCHO, dentro, interfaz } from './pantalla';
import { escribir, FUENTE_BOTON } from './texto';

/**
 * Los botones de abajo de las pantallas de menú (dificultad, nombre, puntos, equipo, extras, controles): dónde
 * cae cada uno, cuál se toca y cómo se dibujan. El combate usa los mismos tipos para su menú, pero lo dibuja en
 * su panel.
 */

export interface OpcionMenu {
  texto: string;
  /** Texto pequeño bajo la opción (el coste en PM de una habilidad…). */
  detalle: string;
  disponible: boolean;
  /** Qué hace, ya partido en líneas; se ve en el panel del registro mientras está elegida. */
  ayuda?: readonly string[];
}

export interface MenuVista {
  opciones: OpcionMenu[];
  seleccion: number;
}

const RECT = { x: 0, y: 0, ancho: 0, alto: 0 };

/**
 * Rectángulo del botón `i` de un menú de `n` opciones (escenas fuera del combate). Hasta 6 caben en
 * una fila; más, en una rejilla de 3 columnas. Altos de sobra para un dedo.
 * Devuelve siempre el mismo objeto (se pide en cada fotograma): vale hasta la siguiente llamada.
 */
function rectOpcion(i: number, n: number): typeof RECT {
  if (interfaz.alta) return botonesAltosCacheados(n, interfaz.ancho, interfaz.alto, VERTICAL)[i]!;
  const r = RECT;
  if (n <= 6) {
    r.ancho = (ANCHO - 32 - (n - 1) * 8) / n;
    r.x = 16 + i * (r.ancho + 8);
    r.y = 292;
    r.alto = 48;
  } else {
    r.ancho = (ANCHO - 32 - 2 * 8) / 3;
    r.x = 16 + (i % 3) * (r.ancho + 8);
    r.y = 252 + Math.floor(i / 3) * 46;
    r.alto = 40;
  }
  return r;
}

/** Opción de un menú de `n` que hay bajo el toque (x, y), o -1 si no hay ninguna. */
export function opcionTocada(x: number, y: number, n: number): number {
  for (let i = 0; i < n; i++) if (dentro(x, y, rectOpcion(i, n))) return i;
  return -1;
}

/** Ancho de una letra de Space Mono en negrita a 14 px y alto de cada línea de un botón. */
const ANCHO_LETRA_BOTON = 8.57;
const LINEA_BOTON = 15;
/** Textos de botón ya partidos en líneas, por ancho de botón: se parten una vez, no en cada fotograma. */
const PARTIDOS = new Map<number, Map<string, readonly string[]>>();

/** El texto de un botón en las líneas que caben en `ancho` píxeles (los nombres largos, en dos). */
function lineasBoton(texto: string, ancho: number): readonly string[] {
  let porTexto = PARTIDOS.get(ancho);
  if (!porTexto) PARTIDOS.set(ancho, (porTexto = new Map()));
  let lineas = porTexto.get(texto);
  if (!lineas) {
    lineas = partirTexto(texto, Math.floor((ancho - 8) / ANCHO_LETRA_BOTON));
    porTexto.set(texto, lineas);
  }
  return lineas;
}

export function dibujarMenu(ctx: CanvasRenderingContext2D, menu: MenuVista | null): void {
  // Sin menú (mientras se animan los turnos o al acabar) no se dibujan botones.
  if (!menu) return;
  const n = menu.opciones.length;
  for (let i = 0; i < n; i++) {
    const r = rectOpcion(i, n);
    const opcion = menu?.opciones[i];
    const elegida = menu !== null && i === menu.seleccion;
    // Una opción apagada no se aclara al elegirla (su gris no se leería): la marca solo el filete.
    const disponible = opcion?.disponible ?? true;
    dibujarCaja(
      ctx,
      r.x,
      r.y,
      r.ancho,
      r.alto,
      elegida ? (disponible ? 'elegida' : 'elegidaApagada') : disponible ? 'normal' : 'apagada',
    );
    if (!opcion) continue;
    const color = !opcion.disponible ? PALETA.apagada : elegida ? PALETA.elegida : PALETA.texto;
    const conDetalle = opcion.detalle !== '';
    const lineas = lineasBoton(opcion.texto, r.ancho);
    // El bloque de líneas (nombre y detalle) centrado en el botón.
    const y = r.y + (r.alto - (lineas.length + (conDetalle ? 1 : 0)) * LINEA_BOTON) / 2 + 1;
    for (let l = 0; l < lineas.length; l++)
      escribir(
        ctx,
        lineas[l]!,
        r.x + r.ancho / 2,
        y + l * LINEA_BOTON,
        color,
        'center',
        FUENTE_BOTON,
      );
    if (conDetalle)
      escribir(
        ctx,
        opcion.detalle,
        r.x + r.ancho / 2,
        y + lineas.length * LINEA_BOTON,
        opcion.disponible ? PALETA.pm : PALETA.apagada,
        'center',
        FUENTE_BOTON,
      );
  }
}
