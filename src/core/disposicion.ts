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

let cachePausa: {
  ancho: number;
  alto: number;
  disposicion: ReturnType<typeof disposicionPausa>;
} | null = null;

/** `disposicionPausa` recordada: se pide en cada fotograma y en cada toque, y solo cambia con el tamaño. */
export function disposicionPausaCacheada(
  ancho: number,
  alto: number,
  d: DatosVertical,
): ReturnType<typeof disposicionPausa> {
  if (!cachePausa || cachePausa.ancho !== ancho || cachePausa.alto !== alto)
    cachePausa = { ancho, alto, disposicion: disposicionPausa(ancho, alto, d) };
  return cachePausa.disposicion;
}

const contiene = (rc: Rect, x: number, y: number): boolean =>
  x >= rc.x && x < rc.x + rc.ancho && y >= rc.y && y < rc.y + rc.alto;

/** Sección bajo el toque con las pestañas y los botones verticales: 0-4 pestañas, 5 Seguir, 6 Salir; -1 ninguna. */
export function seccionTocadaAlta(
  x: number,
  y: number,
  p: ReturnType<typeof disposicionPausa>,
): number {
  const pestana = p.pestanas.findIndex((rc) => contiene(rc, x, y));
  if (pestana >= 0) return pestana;
  const boton = p.botones.findIndex((rc) => contiene(rc, x, y));
  return boton >= 0 ? 5 + boton : -1;
}

/**
 * Dónde van los controles de Ajustes (casillas de sonido y calidad, deslizadores de música y efectos) y desde
 * qué altura la lista de controles, dentro del contenido `c` de la pausa vertical: uno bajo otro, a ancho completo.
 */
export function disposicionAjustes(
  c: Rect,
  d: DatosVertical,
): { sonido: Rect; calidad: Rect; musica: Rect; efectos: Rect; controlesY: number } {
  const sangria = d.menu.margen + 4;
  const x = c.x + sangria;
  const ancho = c.ancho - 2 * sangria;
  const control = 40;
  const sonido = r(x, c.y + 32, control, control);
  const calidad = r(x, sonido.y + control + 4, control, control);
  const musica = r(x, calidad.y + control + 22, ancho, control);
  const efectos = r(x, musica.y + control + 22, ancho, control);
  return { sonido, calidad, musica, efectos, controlesY: efectos.y + control + 14 };
}

/** Índice de la tarjeta (o botón, o casilla) de `rects` bajo el toque (x, y); -1 si ninguna. */
export function tarjetaTocada(x: number, y: number, rects: readonly Rect[]): number {
  return rects.findIndex((rc) => contiene(rc, x, y));
}

/** Letras de la fuente normal que caben en `ancho` píxeles lógicos. */
export function letrasEnAncho(ancho: number): number {
  return Math.max(0, Math.floor(ancho / ANCHO_LETRA));
}

/**
 * Qué se toca en la pantalla de puntos: la fila bajo (x, y), contando también el hueco hasta la siguiente, y
 * qué hay en ella: −1 (el «−»), 1 (el «+») o 0 (el resto). `signo` da `menos` y `mas` como desplazamiento desde el
 * borde izquierdo de la fila; alrededor de cada uno se toca hasta `holgura` de más, sin pasar de la mitad del
 * hueco entre los dos (para que no se pisen cuando están juntos).
 */
export function toquePuntos(
  x: number,
  y: number,
  filas: readonly Rect[],
  signo: { menos: number; mas: number; ancho: number },
  holgura = 22,
): { fila: number; signo: -1 | 0 | 1 } {
  const fila = filas.findIndex((f) => contiene({ ...f, y: f.y - 2, alto: f.alto + 4 }, x, y));
  const f = filas[fila];
  if (!f) return { fila: -1, signo: 0 };
  const dx = x - f.x;
  const h = Math.min(holgura, Math.max(0, (signo.mas - signo.menos - signo.ancho) / 2));
  if (dx >= signo.menos - h && dx < signo.menos + signo.ancho + h) return { fila, signo: -1 };
  return { fila, signo: dx >= signo.mas - h ? 1 : 0 };
}

/**
 * Pantalla de equipo en la interfaz alta, de arriba abajo: la rana, las filas de arma y armadura (a ancho
 * completo, con sitio debajo para dos líneas de efecto) y las estadísticas; los botones van abajo aparte.
 * La cabecera ocupa hasta `y = 100` (hasta dos líneas de título y dos de pista).
 */
export function disposicionEquipo(
  ancho: number,
  alto: number,
  d: DatosVertical,
): { rana: Rect; filas: Rect[]; estadisticas: Rect } {
  const m = d.menu.margen;
  const util = ancho - 2 * m;
  const rana = r(m, 100, util, 112);
  const paso = d.menu.boton + 2 * 13 + 10;
  const filas = [0, 1].map((i) => r(m, rana.y + rana.alto + m + i * paso, util, d.menu.boton));
  const estadisticas = r(m, filas[1]!.y + paso, util, 88);
  return { rana, filas, estadisticas };
}

/**
 * Qué se toca en una fila de equipo: la fila bajo (x, y) y `dir`: −1 en los `anchoFlecha` de la izquierda, 1 en
 * los de la derecha y 0 en medio (solo la elige).
 */
export function toqueEquipo(
  x: number,
  y: number,
  filas: readonly Rect[],
  anchoFlecha: number,
): { fila: number; dir: -1 | 0 | 1 } {
  const fila = filas.findIndex((f) => contiene(f, x, y));
  const f = filas[fila];
  if (!f) return { fila: -1, dir: 0 };
  if (x < f.x + anchoFlecha) return { fila, dir: -1 };
  return { fila, dir: x >= f.x + f.ancho - anchoFlecha ? 1 : 0 };
}
