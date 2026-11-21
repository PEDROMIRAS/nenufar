import type { DatosMenuCombate } from './types';
import type { DatosVertical } from './encuadre';
import type { Rect } from './menu';

const rect = (): Rect => ({ x: 0, y: 0, ancho: 0, alto: 0 });
const poner = (r: Rect, x: number, y: number, ancho: number, alto: number): void => {
  r.x = x;
  r.y = y;
  r.ancho = ancho;
  r.alto = alto;
};

/** Ancho de una letra de la fuente normal (monoespaciada, 0,6 de su tamaño). */
const ANCHO_LETRA = 7.35;

/** Letras que caben en el nombre de un enemigo al que le tocan `separacion` píxeles, con un respiro a cada lado. */
export function anchoNombre(separacion: number): number {
  return Math.floor((separacion - 8) / ANCHO_LETRA);
}

/** Dónde va cada cosa en el combate sin panel (ver `disposicionCombate`), en unidades lógicas de la interfaz. */
export interface DisposicionCombate {
  /** Banda de los últimos mensajes, bajo la barra de turnos. */
  mensajes: Rect;
  /** Pies de los enemigos. */
  enemigoY: number;
  /** Pies de la heroína. */
  heroina: { x: number; y: number };
  /** Las filas de la lista (sin su pestaña ni el relleno de la caja): solo se dibuja con un menú abierto. */
  lista: Rect;
  fila: number;
  /** Filas que caben a la vez (las demás se alcanzan desplazando). */
  visibles: number;
  ficha: Rect;
  /** Franja de abajo con qué hace lo elegido (solo con un menú abierto). */
  explicacion: Rect;
}

/**
 * Reparte el combate sin panel en una interfaz de `ancho`×`alto` para un menú de `n` opciones, en horizontal o en
 * la interfaz alta (`alta`). De arriba abajo: la barra de turnos, la banda de mensajes, los enemigos (el nombre de
 * un jefe alto empieza bajo la banda), y abajo la explicación pegada al borde y la ficha encima (en horizontal, una
 * caja a la derecha; en vertical, a lo ancho). La lista va a la derecha de la heroína, con su borde de abajo sobre la
 * explicación (horizontal) o la ficha (vertical), y crece hacia arriba sin subir sobre lo de los enemigos: las
 * filas se encogen hasta su mínimo y, si ni así caben, `visibles` es menor que `n`.
 * Si se pasa `fuera` se rellena y se devuelve (se pide en cada fotograma: sin asignar memoria).
 */
export function disposicionCombate(
  ancho: number,
  alto: number,
  n: number,
  alta: boolean,
  d: DatosMenuCombate,
  fuera: DisposicionCombate = {
    mensajes: rect(),
    enemigoY: 0,
    heroina: { x: 0, y: 0 },
    lista: rect(),
    fila: 0,
    visibles: 0,
    ficha: rect(),
    explicacion: rect(),
  },
): DisposicionCombate {
  const m = d.margen;
  const o = alta ? d.vertical : d.horizontal;
  const yMensajes = d.finTurnos + 2;
  poner(fuera.mensajes, m, yMensajes, ancho - 2 * m, d.mensajes * d.lineaMensaje);
  const finMensajes = yMensajes + d.mensajes * d.lineaMensaje;
  fuera.enemigoY = finMensajes + d.nombre + d.altoMaxEnemigo + 2;

  const altoExplicacion = o.explicacion;
  const yExplicacion = alto - m - altoExplicacion;
  poner(fuera.explicacion, m, yExplicacion, ancho - 2 * m, altoExplicacion);
  let bajoLista: number;
  if (alta) {
    const yFicha = yExplicacion - d.separacion - d.vertical.ficha;
    poner(fuera.ficha, m, yFicha, ancho - 2 * m, d.vertical.ficha);
    bajoLista = yFicha - d.separacion;
  } else {
    const [anchoFicha, altoFicha] = d.horizontal.ficha;
    poner(
      fuera.ficha,
      ancho - m - anchoFicha,
      yExplicacion - d.separacion - altoFicha,
      anchoFicha,
      altoFicha,
    );
    bajoLista = yExplicacion - d.separacion;
  }

  const xLista = o.heroinaX + d.medioCuerpo + d.separacionLista;
  const anchoLista = alta ? ancho - m - xLista : d.horizontal.anchoLista;
  // Lo que deja el borde de abajo de la lista hasta lo de los enemigos, sin la pestaña ni el relleno de la caja.
  const sitio =
    bajoLista - d.rellenoLista - (fuera.enemigoY + d.bajoEnemigo + d.tituloLista + d.rellenoLista);
  const cuantas = Math.max(1, n);
  const fila = Math.floor(Math.min(o.fila, Math.max(o.filaMin, sitio / cuantas)));
  const visibles = Math.max(1, Math.min(cuantas, Math.floor(sitio / fila)));
  fuera.fila = fila;
  fuera.visibles = visibles;
  const yLista = bajoLista - d.rellenoLista - visibles * fila;
  poner(fuera.lista, xLista, yLista, anchoLista, visibles * fila);
  fuera.heroina.x = o.heroinaX;
  fuera.heroina.y = yLista + visibles * fila;
  return fuera;
}

/**
 * La primera fila a la vista tras tocar la opción `tocada`: si es la última visible y hay más abajo, se desplaza una;
 * si es la primera visible y hay más arriba, también. Así con el dedo se llega a las opciones ocultas.
 */
export function primeraTrasToque(
  tocada: number,
  primera: number,
  visibles: number,
  n: number,
): number {
  if (tocada === primera + visibles - 1 && tocada < n - 1) return primera + 1;
  if (tocada === primera && primera > 0) return primera - 1;
  return primera;
}

/** La primera fila que se ve de una lista de `n` con `visibles` a la vista, para que la `seleccion` se vea. */
export function primeraVisible(
  seleccion: number,
  primera: number,
  visibles: number,
  n: number,
): number {
  let p = primera;
  if (seleccion < p) p = seleccion;
  else if (seleccion >= p + visibles) p = seleccion - visibles + 1;
  return Math.max(0, Math.min(p, Math.max(0, n - visibles)));
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
): {
  sonido: Rect;
  calidad: Rect;
  reto: Rect;
  musica: Rect;
  efectos: Rect;
  temblor: Rect;
  controlesY: number;
} {
  const sangria = d.menu.margen + 4;
  const x = c.x + sangria;
  const ancho = c.ancho - 2 * sangria;
  const control = 40;
  const sonido = r(x, c.y + 32, control, control);
  const calidad = r(x, sonido.y + control + 4, control, control);
  const reto = r(x, calidad.y + control + 4, control, control);
  const musica = r(x, reto.y + control + 22, ancho, control);
  const efectos = r(x, musica.y + control + 22, ancho, control);
  const temblor = r(x, efectos.y + control + 22, ancho, control);
  return { sonido, calidad, reto, musica, efectos, temblor, controlesY: temblor.y + control + 14 };
}

/** Índice de la tarjeta (o botón, o casilla) de `rects` bajo el toque (x, y); -1 si ninguna. */
export function tarjetaTocada(x: number, y: number, rects: readonly Rect[]): number {
  return rects.findIndex((rc) => contiene(rc, x, y));
}

/** Letras que caben en `ancho` píxeles lógicos; sin `letra`, de la fuente normal. */
export function letrasEnAncho(ancho: number, letra = ANCHO_LETRA): number {
  return Math.max(0, Math.floor(ancho / letra));
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

/** Las pestañas Bestiario y Logros, lado a lado arriba, a ancho completo menos márgenes. */
export function pestanasExtras(ancho: number, d: DatosVertical): Rect[] {
  const m = d.menu.margen;
  const w = (ancho - 2 * m - m) / 2;
  return [r(m, 4, w, d.menu.pestana - 4), r(m + w + m, 4, w, d.menu.pestana - 4)];
}
