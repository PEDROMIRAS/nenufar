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

const r = (x: number, y: number, ancho: number, alto: number): Rect => ({ x, y, ancho, alto });

/**
 * Pausa e inventario en la interfaz alta: las pestañas en una fila arriba, los botones (Seguir y Salir) lado a
 * lado abajo y el contenido de la sección en medio. Devuelve rectángulos nuevos: se llama al cambiar el tamaño.
 */
export function disposicionPausa(
  ancho: number,
  alto: number,
  d: DatosVertical,
): { pestanas: Rect[]; contenido: Rect; botones: Rect[] } {
  const m = d.menu;
  const util = ancho - 2 * m.margen;
  const hueco = m.margen / 2;
  const anchoPestana = (util - 4 * hueco) / 5;
  const pestanas = [0, 1, 2, 3, 4].map((i) =>
    r(m.margen + i * (anchoPestana + hueco), m.margen, anchoPestana, m.pestana),
  );
  const botones = botonesAltos(2, ancho, alto, d);
  const arriba = m.margen + m.pestana + m.margen;
  const abajo = botones[0]!.y - m.margen;
  return { pestanas, contenido: r(m.margen, arriba, util, Math.max(0, abajo - arriba)), botones };
}

/**
 * `n` botones pegados abajo: hasta 3 lado a lado a ancho completo; más, en dos columnas con la última fila
 * abajo. Se numeran de izquierda a derecha y de arriba abajo.
 */
export function botonesAltos(n: number, ancho: number, alto: number, d: DatosVertical): Rect[] {
  const m = d.menu;
  const columnas = n <= 3 ? Math.max(1, n) : 2;
  const filas = Math.ceil(n / columnas);
  const anchoBoton = (ancho - 2 * m.margen - (columnas - 1) * m.margen) / columnas;
  const arriba = alto - m.margen - filas * m.boton - (filas - 1) * m.margen;
  return Array.from({ length: n }, (_, i) =>
    r(
      m.margen + (i % columnas) * (anchoBoton + m.margen),
      arriba + Math.floor(i / columnas) * (m.boton + m.margen),
      anchoBoton,
      m.boton,
    ),
  );
}

/** `n` tarjetas apiladas a ancho completo entre la cabecera y el pie; el reparto del alto, con tope. */
export function tarjetasAltas(n: number, ancho: number, alto: number, d: DatosVertical): Rect[] {
  const m = d.menu;
  const hueco = alto - m.cabecera - m.pie - (n + 1) * m.margen;
  const altoTarjeta = Math.min(m.tarjetaMax, hueco / Math.max(1, n));
  return Array.from({ length: n }, (_, i) =>
    r(
      m.margen,
      m.cabecera + m.margen + i * (altoTarjeta + m.margen),
      ancho - 2 * m.margen,
      altoTarjeta,
    ),
  );
}

/**
 * `n` filas apiladas desde `y0` a ancho completo. Su alto es `fila`, o menos para caber hasta `hasta`, pero
 * nunca menos de `filaMin`: si ni así caben, se pasan de `hasta` (que la ventana lo permita es cosa de quien llama).
 */
export function filasLista(
  n: number,
  y0: number,
  hasta: number,
  ancho: number,
  d: DatosVertical,
): { filas: Rect[]; alto: number } {
  const m = d.menu;
  const fila = Math.max(m.filaMin, Math.min(m.fila, (hasta - y0) / Math.max(1, n)));
  return {
    filas: Array.from({ length: n }, (_, i) =>
      r(m.margen, y0 + i * fila, ancho - 2 * m.margen, fila),
    ),
    alto: n * fila,
  };
}

/** Rejilla de casillas cuadradas del bestiario: las columnas que caben, centradas; `alto` es lo que ocupa. */
export function celdasBestiario(
  n: number,
  ancho: number,
  y0: number,
  d: DatosVertical,
): { celdas: Rect[]; alto: number } {
  const m = d.menu;
  const util = ancho - 2 * m.margen;
  const columnas = Math.max(1, Math.floor((util + m.separacion) / (m.celda + m.separacion)));
  const x0 = (ancho - (columnas * m.celda + (columnas - 1) * m.separacion)) / 2;
  const paso = m.celda + m.separacion;
  const filas = Math.ceil(n / columnas);
  return {
    celdas: Array.from({ length: n }, (_, i) =>
      r(x0 + (i % columnas) * paso, y0 + Math.floor(i / columnas) * paso, m.celda, m.celda),
    ),
    alto: filas * m.celda + Math.max(0, filas - 1) * m.separacion,
  };
}

let cache: { n: number; ancho: number; alto: number; botones: Rect[] } | null = null;

/**
 * `botonesAltos` recordado: se pide en cada fotograma y solo se recalcula si cambian `n`, `ancho` o `alto`
 * (sin asignar memoria el resto del tiempo). No se tocan los rectángulos devueltos.
 */
export function botonesAltosCacheados(
  n: number,
  ancho: number,
  alto: number,
  d: DatosVertical,
): Rect[] {
  if (!cache || cache.n !== n || cache.ancho !== ancho || cache.alto !== alto)
    cache = { n, ancho, alto, botones: botonesAltos(n, ancho, alto, d) };
  return cache.botones;
}
