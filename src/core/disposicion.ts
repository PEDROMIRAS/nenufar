import type { DatosVertical } from './encuadre';
import type { Rect } from './menu';

/** Dónde va cada parte del combate en la interfaz alta (ventana vertical), en unidades lógicas. */
export interface DisposicionCombate {
  /** Arriba: enemigos y heroína. */
  escena: Rect;
  /** Todo el panel de abajo (con el sitio de la pestaña encima de la lista). */
  panel: Rect;
  lista: Rect;
  /** Alto de cada fila de la lista. */
  fila: number;
  descripcion: Rect;
  ficha: Rect;
}

const rect = (): Rect => ({ x: 0, y: 0, ancho: 0, alto: 0 });
const poner = (r: Rect, x: number, y: number, ancho: number, alto: number): void => {
  r.x = x;
  r.y = y;
  r.ancho = ancho;
  r.alto = alto;
};

/** Ancho de una letra de la fuente normal (monoespaciada, 0,6 de su tamaño). */
const ANCHO_LETRA = 7.2;

/** Letras que caben en el nombre de un enemigo al que le tocan `separacion` píxeles, con un respiro a cada lado. */
export function anchoNombre(separacion: number): number {
  return Math.floor((separacion - 8) / ANCHO_LETRA);
}

/**
 * Reparte la interfaz alta de `ancho`×`alto` para un combate con un menú de `n` opciones: la escena arriba y, en
 * una sola columna pegada abajo, la lista, la descripción de lo elegido y la ficha de la heroína. Las filas se
 * encogen (hasta `filaMin`) para que la escena conserve `escenaMin`; si ni así cabe todo, manda el panel.
 * Si se pasa `fuera` se rellena y se devuelve (se pide en cada fotograma: sin asignar memoria).
 */
export function disposicionCombate(
  ancho: number,
  alto: number,
  n: number,
  d: DatosVertical,
  fuera: DisposicionCombate = {
    escena: rect(),
    panel: rect(),
    lista: rect(),
    fila: 0,
    descripcion: rect(),
    ficha: rect(),
  },
): DisposicionCombate {
  const c = d.combate;
  const util = ancho - 2 * c.margen;
  const fijo = c.alturaPestana + c.alturaDescripcion + c.alturaFicha;
  const disponible = alto - c.margen - fijo - d.escenaMin;
  const fila = Math.min(c.fila, Math.max(c.filaMin, disponible / Math.max(1, n)));
  const alturaLista = n * fila;

  const yFicha = alto - c.margen - c.alturaFicha;
  const yDescripcion = yFicha - c.alturaDescripcion;
  const yLista = yDescripcion - alturaLista;
  const yPanel = yLista - c.alturaPestana;

  fuera.fila = fila;
  poner(fuera.ficha, c.margen, yFicha, util, c.alturaFicha);
  poner(fuera.descripcion, c.margen, yDescripcion, util, c.alturaDescripcion);
  poner(fuera.lista, c.margen, yLista, util, alturaLista);
  poner(fuera.panel, c.margen, yPanel, util, alto - c.margen - yPanel);
  poner(fuera.escena, 0, 0, ancho, Math.max(0, yPanel));
  return fuera;
}
