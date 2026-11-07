import type { Combate, Luchador } from '../core/combate';
import { partirTexto } from '../core/texto';
import { anchoNombre, disposicionCombate, type DisposicionCombate } from '../core/disposicion';
import { VERTICAL } from '../data/datos';
import { ANCHO, aPixel, dentro, interfaz, rellenarArea } from './pantalla';
import { movimientoReducido } from './accesibilidad';
import { dibujarFotograma, type Sprite } from './recursos';
import type { FondoSala } from './mundo/mundo';
import { escribir, FUENTE_BOTON, FUENTE_GRANDE } from './texto';
import {
  dibujarCaja,
  dibujarFila,
  dibujarMarco,
  dibujarPestana,
  dibujarTitulo,
  PALETA,
} from './marco';
import type { Rect } from '../core/menu';

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

/** Estado visual que la escena va cambiando según anima los eventos; el dibujo solo lo lee. */
export interface VistaCombate {
  combate: Combate;
  sprite: Sprite;
  /** Hojas de monstruos, efectos y proyectiles, por nombre. */
  hojas: ReadonlyMap<string, Sprite>;
  /** La sala donde empezó el combate, que se ve desenfocada y oscurecida detrás (en 3D). */
  fondo: FondoSala;
  tiempo: number;
  /** Enemigos que se ven: los que aparecen a mitad de combate entran con su evento, no antes. */
  enemigos: Luchador[];
  /** Orden de la ronda que se está animando y posición en él de quien tiene el turno. */
  orden: readonly Luchador[];
  turno: number;
  /** PV y textos que se ven (van por detrás del combate mientras se animan los eventos). */
  pv: Map<Luchador, number>;
  textoPv: Map<Luchador, string>;
  /** PM de la heroína que se ven: avanzan con los eventos, no con el valor final del combate. */
  pmHeroina: number;
  textoPm: string;
  /** Estados activos que se ven, como texto («Veneno · Furia»). */
  estados: Map<Luchador, string>;
  registro: [string, string];
  /** Menú de la heroína; null mientras no le toca elegir. */
  menu: MenuVista | null;
  /** Enemigo señalado mientras se elige objetivo. */
  apuntado: Luchador | null;
  /** Luchador que parpadea porque acaba de recibir un golpe (o una cura), y número que flota sobre él. */
  golpeado: Luchador | null;
  flotante: string;
  flotanteCura: boolean;
  tiempoGolpe: number;
  /** Quien acaba de golpear (anima su ataque) y desde cuándo. */
  atacante: Luchador | null;
  tiempoAtaque: number;
  /** Hacia quién va ese ataque (allí vuela el proyectil, si lo hay). */
  objetivoAtaque: Luchador | null;
  /** Efecto que se ve sobre quien recibe un golpe («corte», «impacto»…) y desde cuándo. */
  efecto: string;
  efectoEn: Luchador | null;
  tiempoEfecto: number;
  /** Segundos desde que cayó la heroína; negativo mientras sigue en pie. */
  tiempoCaida: number;
  /** Quién se ve preparando un golpe cargado y si la heroína se ve defendiendo. */
  cargando: Set<Luchador>;
  defendiendo: boolean;
  /** Texto grande del final («¡Victoria!»…); vacío mientras se lucha. */
  titulo: string;
  /** Nombre del menú abierto, en la pestaña del panel («Acción», «Habilidad»…). */
  pestana: string;
  /**
   * Hay un aviso dado con el menú abierto («No quedan PM…»): ocupa el sitio de la descripción hasta que
   * se mueve el cursor o cambia el menú. Lo que pasó en los turnos de antes no la tapa.
   */
  aviso: boolean;
}

const COLOR = {
  /** Oscurece la sala de fondo para que se lean los luchadores y los textos. */
  velo: 'rgba(10, 12, 16, 0.6)',
  panel: 'rgba(0, 0, 0, 0.45)',
  pv: '#d8584a',
  pm: '#5a8bd8',
  cura: '#7fd88a',
  barraFondo: '#3a2a2a',
  aviso: PALETA.elegida,
  estado: '#c89bff',
};
const ENEMIGO = { y: 128, escala: 2, separacion: 140, alto: 56, topeMinimo: 44 };
/** Primera línea libre bajo la barra de turnos (su texto empieza en y = 10). */
const FIN_BARRA_TURNOS = 26;
/** La heroína, abajo a la izquierda, sobre el panel; su ficha va dentro del panel (ver `dibujarPanel`). */
const HEROINA = { x: 48, y: 184, escala: 2 };
/** Centro de los enemigos: algo a la derecha, para dejar sitio a la heroína. */
const CENTRO_ENEMIGOS = ANCHO / 2 + 30;
/**
 * Dónde cae cada cosa del combate en este fotograma: en horizontal, las medidas de siempre; en vertical (interfaz
 * alta), repartidas en la escena de arriba. Se rellena al empezar a dibujar (`colocar`).
 */
const G = {
  ancho: ANCHO,
  enemigoY: ENEMIGO.y,
  escala: ENEMIGO.escala,
  separacion: ENEMIGO.separacion,
  centro: CENTRO_ENEMIGOS,
  heroinaX: HEROINA.x,
  heroinaY: HEROINA.y,
  tituloY: 112,
};
/** Reparto del panel apilado en vertical; se rellena de nuevo en cada llamada (sin asignar memoria). */
const DISP: DisposicionCombate = disposicionCombate(1, 1, 1, VERTICAL);
function disposicion(n: number): DisposicionCombate {
  return disposicionCombate(
    interfaz.ancho,
    interfaz.alto,
    Math.max(VERTICAL.combate.filas, n),
    VERTICAL,
    DISP,
  );
}

function colocar(v: VistaCombate): void {
  G.ancho = interfaz.ancho;
  if (!interfaz.alta) {
    G.enemigoY = ENEMIGO.y;
    G.escala = ENEMIGO.escala;
    G.separacion = ENEMIGO.separacion;
    G.centro = CENTRO_ENEMIGOS;
    G.heroinaX = HEROINA.x;
    G.heroinaY = HEROINA.y;
    G.tituloY = 112;
    return;
  }
  const e = disposicion(v.menu?.opciones.length ?? 0).escena;
  G.separacion = e.ancho / Math.max(1, v.enemigos.length);
  G.centro = e.ancho / 2;
  G.enemigoY = Math.max(ENEMIGO.y, Math.round(e.alto * 0.42));
  G.heroinaX = 40;
  G.heroinaY = e.alto - 16;
  G.tituloY = Math.round(e.alto / 2 - 46);
  // Los sprites se achican lo justo para que no se pisen con los de al lado.
  let ancho = 1;
  for (const en of v.enemigos) {
    const hoja = en.monstruo && v.hojas.get(en.monstruo.sprite);
    if (hoja) ancho = Math.max(ancho, hoja.datos.frameWidth);
  }
  G.escala = Math.min(ENEMIGO.escala, (G.separacion - 8) / ancho);
}

/** Segundos que dura la animación de ataque de un enemigo (3 fotogramas a 10 fps y un respiro). */
const DURACION_ATAQUE = 0.45;
/** Segundos que tarda un proyectil en llegar, y lo mínimo que se ve un ataque antes de su golpe. */
const VUELO = 0.25;
const ANTICIPO_MINIMO = 0.2;
/** Hoja con los efectos de golpe (una animación por efecto). */
const EFECTOS = 'efectos';

function hojaDe(v: VistaCombate, l: Luchador): Sprite | undefined {
  return l.esHeroina ? v.sprite : l.monstruo ? v.hojas.get(l.monstruo.sprite) : undefined;
}

function animacionAtaque(l: Luchador): string {
  return l.heroe?.combate.ataque ?? 'atacar';
}

/** Segundos que dura el efecto que se ve ahora (0 si no hay ninguno). */
export function duracionEfecto(v: VistaCombate): number {
  const anim = v.hojas.get('efectos')?.datos.animations[v.efecto];
  return anim ? anim.frames / anim.fps : 0;
}

/** Segundos desde que `l` empieza su animación de ataque hasta que el golpe llega (y se ve el daño). */
export function anticipoAtaque(v: VistaCombate, l: Luchador): number {
  const hoja = hojaDe(v, l);
  const anim = hoja?.datos.animations[animacionAtaque(l)];
  if (!hoja || !anim) return ANTICIPO_MINIMO;
  // El golpe sale en el fotograma marcado (el proyectil de la maga) o en el segundo.
  const suelta = (hoja.datos.castReleaseFrame ?? 1) / anim.fps;
  return Math.max(ANTICIPO_MINIMO, suelta + (l.heroe?.combate.proyectil ? VUELO : 0));
}

/** Centro del cuerpo de un luchador en pantalla, donde se dibujan efectos y proyectiles. */
function centroX(v: VistaCombate, l: Luchador): number {
  const enemigos = v.enemigos;
  return l.esHeroina ? G.heroinaX : xEnemigo(enemigos.indexOf(l), enemigos.length);
}

function centroY(l: Luchador): number {
  return l.esHeroina ? G.heroinaY - 28 : G.enemigoY - 26;
}

/** Centro horizontal del enemigo `i` de `n`, repartidos alrededor de `CENTRO_ENEMIGOS`. */
export function xEnemigo(i: number, n: number): number {
  return G.centro + (i - (n - 1) / 2) * G.separacion;
}

const RECT = { x: 0, y: 0, ancho: 0, alto: 0 };

/**
 * Rectángulo del botón `i` de un menú de `n` opciones (escenas fuera del combate). Hasta 6 caben en
 * una fila; más, en una rejilla de 3 columnas. Altos de sobra para un dedo.
 * Devuelve siempre el mismo objeto (se pide en cada fotograma): vale hasta la siguiente llamada.
 */
function rectOpcion(i: number, n: number): typeof RECT {
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

export function dibujarCombate(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  colocar(v);
  v.fondo(v.tiempo, 0, posicionProyectil(v));
  // El canvas 2D queda transparente encima de la sala en 3D.
  ctx.fillStyle = COLOR.velo;
  rellenarArea(ctx);

  dibujarOrden(ctx, v);
  for (let i = 0; i < v.enemigos.length; i++)
    dibujarEnemigo(ctx, v, v.enemigos[i]!, xEnemigo(i, v.enemigos.length));
  dibujarHeroina(ctx, v);
  dibujarProyectil(ctx, v);
  dibujarEfecto(ctx, v);
  dibujarFlotante(ctx, v);

  if (interfaz.alta) dibujarPanelVertical(ctx, v);
  else {
    ctx.save();
    ctx.translate(ANCLA_PANEL.x, ANCLA_PANEL.y);
    ctx.scale(PANEL_ESCALA, PANEL_ESCALA);
    ctx.translate(-ANCLA_PANEL.x, -ANCLA_PANEL.y);
    dibujarPanel(ctx, v);
    ctx.restore();
  }

  if (v.titulo) {
    // Velo y un recuadro propio, para que el título no se monte sobre la ficha de la heroína.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    rellenarArea(ctx);
    const ancho = Math.min(280, G.ancho - 16);
    dibujarMarco(ctx, G.ancho / 2 - ancho / 2, G.tituloY, ancho, 92);
    escribir(ctx, v.titulo, G.ancho / 2, G.tituloY + 16, PALETA.elegida, 'center', FUENTE_GRANDE);
    escribir(
      ctx,
      'Pulsa o toca para continuar',
      G.ancho / 2,
      G.tituloY + 60,
      PALETA.texto,
      'center',
    );
  }
}

// Ancho de una letra de la fuente normal y de la de los botones (monoespaciadas, 0,6 de su tamaño) y
// alto de cada línea de un botón.
const ANCHO_LETRA = 7.2;
const ANCHO_LETRA_BOTON = 8.4;
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

/** Nombres cortos para la barra de turnos y sobre cada enemigo («Kero, Señora de la Cripta» → «Kero»), hechos una vez. */
const CORTOS = new WeakMap<Luchador, string>();
const nombreCorto = (l: Luchador): string => {
  let corto = CORTOS.get(l);
  if (corto === undefined) {
    corto = l.nombre.split(',')[0]!;
    CORTOS.set(l, corto);
  }
  return corto;
};

/** Alto de cada línea del nombre de un enemigo cuando no cabe en una. */
const LINEA_NOMBRE = 14;
const NOMBRES = new WeakMap<Luchador, { letras: number; lineas: readonly string[] }>();
/** El nombre corto partido en las líneas que caben en lo que le toca a cada enemigo (una vez por tamaño). */
function lineasNombre(l: Luchador): readonly string[] {
  const letras = anchoNombre(G.separacion);
  let c = NOMBRES.get(l);
  if (!c || c.letras !== letras) {
    c = { letras, lineas: partirTexto(nombreCorto(l), letras) };
    NOMBRES.set(l, c);
  }
  return c.lineas;
}

/** Barra con quién actúa en lo que queda de ronda; el primero es el que tiene el turno. */
function dibujarOrden(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  escribir(ctx, 'Turno', 12, 10, PALETA.claro);
  let x = 64;
  for (let i = v.turno; i < v.orden.length; i++) {
    const l = v.orden[i]!;
    if ((v.pv.get(l) ?? l.pv) <= 0) continue;
    const nombre = nombreCorto(l);
    // Lo que no cabe se resume en «…» en vez de salirse de la pantalla.
    if (x + 12 + nombre.length * ANCHO_LETRA > G.ancho - 8) {
      escribir(ctx, '…', x, 10);
      return;
    }
    ctx.fillStyle = l.esHeroina ? COLOR.pm : (l.monstruo?.color ?? '#999');
    ctx.fillRect(x, 8, 8, 16);
    escribir(ctx, nombre, x + 12, 10);
    x += 24 + nombre.length * 7;
  }
}

/** Colores de las barras de vida y maná, compartidos con el HUD del mapa. */
export const COLOR_BARRA = { pv: COLOR.pv, pm: COLOR.pm };

export function barra(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ancho: number,
  fraccion: number,
  color: string,
): void {
  ctx.fillStyle = COLOR.barraFondo;
  ctx.fillRect(x, y, ancho, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(ancho * Math.max(0, Math.min(1, fraccion))), 6);
}

function parpadea(v: VistaCombate, l: Luchador): boolean {
  if (v.golpeado !== l || v.flotanteCura) return false;
  // 3 destellos por segundo, el tope de WCAG; con menos movimiento, el destello queda fijo.
  return movimientoReducido() || Math.floor(v.tiempoGolpe * 6) % 2 === 0;
}

/** Altura de la parte de arriba del enemigo, de donde cuelgan su nombre y los avisos. */
function topeEnemigo(v: VistaCombate, e: Luchador): number {
  const sprite = e.monstruo && v.hojas.get(e.monstruo.sprite);
  // Los fotogramas dejan unos píxeles libres por arriba; los jefes grandes no deben pisar la barra de turnos.
  const alto = sprite ? (sprite.datos.frameHeight - 6) * G.escala : ENEMIGO.alto;
  return Math.max(ENEMIGO.topeMinimo, G.enemigoY - alto);
}

function dibujarEnemigo(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  e: Luchador,
  x: number,
): void {
  const pv = v.pv.get(e) ?? e.pv;
  if (pv <= 0 && v.golpeado !== e) return;
  const y = G.enemigoY;
  const tope = topeEnemigo(v, e);
  const sprite = e.monstruo && v.hojas.get(e.monstruo.sprite);
  if (sprite) {
    // Golpe: destello blanco; ataque recién hecho: su animación; preparando el golpe cargado: tiembla en guardia.
    let anim = 'idle';
    let t = v.tiempo + x * 0.01;
    let dx = 0;
    if (parpadea(v, e)) anim = 'golpe';
    else if (v.atacante === e && v.tiempoAtaque < DURACION_ATAQUE) {
      anim = 'atacar';
      t = v.tiempoAtaque;
    } else if (v.cargando.has(e)) {
      anim = 'atacar';
      t = 0;
      dx = Math.round(Math.sin(v.tiempo * 40));
    }
    dibujarFotograma(ctx, sprite, anim, 'down', t, x + dx, y, G.escala);
  }
  // Un jefe alto no deja sitio encima del nombre sin pisar la barra de turnos: el aviso de golpe
  // fuerte ocupa entonces el sitio del nombre y la flecha de objetivo va a su izquierda.
  // Un nombre largo se parte en líneas y sube lo que ocupen.
  const lineas = lineasNombre(e);
  const extra = (lineas.length - 1) * LINEA_NOMBRE;
  const sinSitio = tope - 36 - extra < FIN_BARRA_TURNOS;
  const avisoEnNombre = sinSitio && v.cargando.has(e);
  // Nunca sube sobre la barra de turnos: un jefe alto con el nombre en dos líneas lo baja hasta su borde
  // (los fotogramas dejan unos píxeles libres por arriba).
  const yNombre = Math.max(FIN_BARRA_TURNOS, tope - 18 - extra);
  if (avisoEnNombre) escribir(ctx, '¡Golpe fuerte!', x, yNombre, COLOR.aviso, 'center');
  else
    for (let i = 0; i < lineas.length; i++)
      escribir(ctx, lineas[i]!, x, yNombre + i * LINEA_NOMBRE, PALETA.texto, 'center');
  if (v.apuntado === e) {
    const sube = Math.round(Math.sin(v.tiempo * 8) * 2);
    if (sinSitio) {
      const ancho = lineas.reduce((m, l) => Math.max(m, l.length), 0);
      const medio = (avisoEnNombre ? 7 : ancho / 2) * ANCHO_LETRA + 10;
      // A la izquierda del nombre; si ahí no cabe (primer enemigo, pegado al borde), a la derecha.
      if (x - medio < 6) escribir(ctx, '◀', x + medio, yNombre, COLOR.aviso, 'center');
      else escribir(ctx, '▶', x - medio, yNombre, COLOR.aviso, 'center');
    } else escribir(ctx, '▼', x, tope - 34 - extra + sube, COLOR.aviso, 'center');
  }
  const anchoBarra = Math.min(80, G.separacion - 8);
  barra(ctx, x - anchoBarra / 2, y + 8, anchoBarra, pv / e.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(e) ?? '', x, y + 18, PALETA.texto, 'center');
  escribir(ctx, v.estados.get(e) ?? '', x, y + 32, COLOR.estado, 'center');
  if (v.cargando.has(e) && !avisoEnNombre) {
    // Corto: con dos o tres enemigos a la vez, los avisos no deben pisarse (los separa 140 px).
    escribir(ctx, '¡Golpe fuerte!', x, tope - 36 - extra, COLOR.aviso, 'center');
  }
}

function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const h = v.combate.heroina;
  const x = G.heroinaX;
  const y = G.heroinaY;
  const escala = HEROINA.escala;
  let anim = 'idle';
  let t = v.tiempo;
  if (v.tiempoCaida >= 0) {
    anim = 'derrota';
    t = v.tiempoCaida;
  } else if (parpadea(v, h)) anim = 'golpe';
  else if (v.atacante === h && v.tiempoAtaque < DURACION_ATAQUE) {
    anim = animacionAtaque(h);
    t = v.tiempoAtaque;
  }
  // De espaldas, mirando a los enemigos.
  dibujarFotograma(ctx, v.sprite, anim, 'up', t, x, y, escala);
  if (v.defendiendo) escribir(ctx, 'Defendiendo', x, y - 76, COLOR.pm, 'center');
}

/** El panel de abajo se dibuja a esta fracción de su tamaño, anclado abajo en el centro; sus medidas son de ese espacio. */
const PANEL_ESCALA = 1;
const ANCLA_PANEL = { x: ANCHO / 2, y: 346 };

/** Punto de la pantalla → el mismo punto en el espacio del panel (para saber qué fila se toca). */
export function aPanel(x: number, y: number): [number, number] {
  return [
    ANCLA_PANEL.x + (x - ANCLA_PANEL.x) / PANEL_ESCALA,
    ANCLA_PANEL.y + (y - ANCLA_PANEL.y) / PANEL_ESCALA,
  ];
}

/** Panel de abajo: dos columnas (lista y qué hace lo elegido) y, debajo a la derecha, la ficha de la heroína. */
export const LISTA_COMBATE: Rect = { x: 8, y: 201, ancho: 210, alto: 144 };
export const FILA_COMBATE = 24;
/** La lista del menú abierto (`n` opciones) y el alto de sus filas, donde cae el toque: en vertical, apilada abajo. */
export function listaCombate(n: number): Rect {
  return interfaz.alta ? disposicion(n).lista : LISTA_COMBATE;
}
export function filaCombate(n: number): number {
  return interfaz.alta ? disposicion(n).fila : FILA_COMBATE;
}
const PANEL = { x: 8, y: 200, ancho: 464, alto: 146 };
/** Columna derecha: arriba la ficha de la heroína (Pedro, 2026-10-26) y debajo qué hace lo elegido. */
const DERECHA = {
  x: 230,
  ancho: 230,
  yFicha: PANEL.y + 12,
  yTitulo: PANEL.y + 66,
  yTexto: PANEL.y + 90,
};
/** Letras por línea de la descripción en la columna derecha. */
const LETRAS_DERECHA = Math.floor(DERECHA.ancho / 7.2);
/** La ayuda de cada opción, partida al ancho de la columna derecha (una vez por texto). */
const AYUDA_PARTIDA = new WeakMap<
  readonly string[],
  { letras: number; lineas: readonly string[] }
>();

function ayudaPartida(ayuda: readonly string[], letras = LETRAS_DERECHA): readonly string[] {
  let c = AYUDA_PARTIDA.get(ayuda);
  if (!c || c.letras !== letras) {
    c = { letras, lineas: partirTexto(ayuda.join(' '), letras) };
    AYUDA_PARTIDA.set(ayuda, c);
  }
  return c.lineas;
}

/** Letras por línea del registro en la columna izquierda, sin llegar a la ficha. */
const LETRAS_IZQUIERDA = Math.floor((DERECHA.x - 8 - (PANEL.x + 14)) / 7.2);

/** Avisos del registro partidos al ancho de cada columna (cambian poco: se guardan). */
const AVISOS = new Map<string, readonly string[]>();
const REGISTRO = new Map<string, readonly string[]>();
/** Lo mismo para el panel apilado de la interfaz alta, que parte a otro ancho. */
const AVISOS_V = new Map<string, readonly string[]>();
const REGISTRO_V = new Map<string, readonly string[]>();

function avisoPartido(texto: string, cache = AVISOS, letras = LETRAS_DERECHA): readonly string[] {
  let lineas = cache.get(texto);
  if (!lineas) {
    // Los avisos llevan números (daño…): se vacía de vez en cuando para que no crezca sin fin.
    if (cache.size > 200) cache.clear();
    lineas = texto ? partirTexto(texto, letras) : [];
    cache.set(texto, lineas);
  }
  return lineas;
}

/** Panel de la interfaz alta: pestaña, lista, qué hace lo elegido y la ficha de la heroína, en una columna. */
function dibujarPanelVertical(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const menu = v.menu;
  const n = menu?.opciones.length ?? 0;
  const d = disposicion(n);
  const c = VERTICAL.combate;
  dibujarMarco(
    ctx,
    d.panel.x,
    d.panel.y + c.alturaPestana,
    d.panel.ancho,
    d.panel.alto - c.alturaPestana,
  );
  const pie = d.descripcion;
  const letras = Math.floor((pie.ancho - 16) / ANCHO_LETRA);
  if (menu) {
    dibujarPestana(ctx, d.panel.x + 8, d.panel.y + c.alturaPestana - 14, v.pestana);
    for (let i = 0; i < n; i++) {
      const o = menu.opciones[i]!;
      const elegida = i === menu.seleccion;
      const estado = o.disponible
        ? elegida
          ? 'elegida'
          : 'normal'
        : elegida
          ? 'elegidaApagada'
          : 'apagada';
      dibujarFila(
        ctx,
        d.lista.x,
        d.lista.y + i * d.fila,
        d.lista.ancho,
        d.fila,
        o.texto,
        o.detalle,
        estado,
      );
    }
    const elegida = menu.opciones[menu.seleccion];
    if (elegida) dibujarTitulo(ctx, pie.x + 8, pie.y + 2, pie.ancho - 16, elegida.texto);
    if (v.aviso && v.registro[1]) {
      let y = pie.y + 26;
      for (let r = 0; r < v.registro.length; r++) {
        const lineas = avisoPartido(v.registro[r]!, AVISOS_V, letras);
        for (let i = 0; i < lineas.length; i++, y += 14)
          escribir(ctx, lineas[i]!, pie.x + 8, y, COLOR.aviso);
      }
    } else if (elegida?.ayuda) {
      const lineas = ayudaPartida(elegida.ayuda, letras);
      for (let i = 0; i < lineas.length; i++)
        escribir(ctx, lineas[i]!, pie.x + 8, pie.y + 26 + i * 14, PALETA.texto);
    }
  } else {
    // Mientras se animan los turnos, el registro ocupa el sitio de la lista.
    let y = d.lista.y + 8;
    for (let r = 0; r < v.registro.length; r++, y += 4) {
      const lineas = avisoPartido(v.registro[r]!, REGISTRO_V, letras);
      for (let i = 0; i < lineas.length; i++, y += 14)
        escribir(ctx, lineas[i]!, d.lista.x + 8, y, r === 0 ? PALETA.claro : PALETA.texto);
    }
  }
  const h = v.combate.heroina;
  const f = d.ficha;
  const fx = f.x + 8;
  const ancho = f.ancho - 16 - 56;
  escribir(ctx, h.nombre, fx, f.y + 2, PALETA.texto);
  escribir(ctx, v.estados.get(h) ?? '', fx + 100, f.y + 2, COLOR.estado);
  barra(ctx, fx, f.y + 18, ancho, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', fx + ancho + 8, f.y + 14);
  barra(ctx, fx, f.y + 32, ancho, v.pmHeroina / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, fx + ancho + 8, f.y + 28);
}

function dibujarPanel(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  dibujarMarco(ctx, PANEL.x, PANEL.y, PANEL.ancho, PANEL.alto);
  const menu = v.menu;
  if (menu) {
    dibujarPestana(ctx, PANEL.x + 8, PANEL.y - 14, v.pestana);
    const n = menu.opciones.length;
    const { x, y, ancho } = LISTA_COMBATE;
    for (let i = 0; i < n; i++) {
      const o = menu.opciones[i]!;
      const elegida = i === menu.seleccion;
      const estado = o.disponible
        ? elegida
          ? 'elegida'
          : 'normal'
        : elegida
          ? 'elegidaApagada'
          : 'apagada';
      dibujarFila(ctx, x, y + i * FILA_COMBATE, ancho, FILA_COMBATE, o.texto, o.detalle, estado);
    }
    const elegida = menu.opciones[menu.seleccion];
    if (elegida) dibujarTitulo(ctx, DERECHA.x, DERECHA.yTitulo, DERECHA.ancho, elegida.texto);
    if (v.aviso && v.registro[1]) {
      // Un aviso reciente con el menú abierto («No quedan PM…» y la pista que lo sigue) ocupa el
      // sitio de la descripción hasta que caduca el registro.
      let y = DERECHA.yTexto;
      for (let r = 0; r < v.registro.length; r++) {
        const lineas = avisoPartido(v.registro[r]!);
        for (let i = 0; i < lineas.length; i++, y += 14)
          escribir(ctx, lineas[i]!, DERECHA.x, y, COLOR.aviso);
      }
    } else if (elegida?.ayuda) {
      const lineas = ayudaPartida(elegida.ayuda);
      for (let i = 0; i < lineas.length; i++)
        escribir(ctx, lineas[i]!, DERECHA.x, DERECHA.yTexto + i * 14, PALETA.texto);
    }
  } else {
    // Mientras se animan los turnos, el panel cuenta lo que pasa en la columna izquierda
    // (la derecha es de la ficha).
    let y = PANEL.y + 14;
    for (let r = 0; r < v.registro.length; r++, y += 4) {
      const lineas = avisoPartido(v.registro[r]!, REGISTRO, LETRAS_IZQUIERDA);
      for (let i = 0; i < lineas.length; i++, y += 14)
        escribir(ctx, lineas[i]!, PANEL.x + 14, y, r === 0 ? PALETA.claro : PALETA.texto);
    }
  }
  // La ficha de la heroína, siempre a la vista.
  const h = v.combate.heroina;
  const fx = DERECHA.x;
  const fy = DERECHA.yFicha;
  escribir(ctx, h.nombre, fx, fy, PALETA.texto);
  escribir(ctx, v.estados.get(h) ?? '', fx + 120, fy, COLOR.estado);
  barra(ctx, fx, fy + 18, 140, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', fx + 148, fy + 14);
  barra(ctx, fx, fy + 34, 140, v.pmHeroina / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, fx + 148, fy + 30);
}

/** Dónde va el proyectil del ataque en curso (y de qué hoja es), o null si no hay ninguno en vuelo. */
const PROYECTIL = { nombre: '', x: 0, y: 0, angulo: 0 };
function posicionProyectil(v: VistaCombate): typeof PROYECTIL | null {
  const a = v.atacante;
  const o = v.objetivoAtaque;
  const nombre = a?.heroe?.combate.proyectil;
  if (!a || !o || !nombre) return null;
  const t = (v.tiempoAtaque - (anticipoAtaque(v, a) - VUELO)) / VUELO;
  if (t < 0 || t > 1) return null;
  const x0 = centroX(v, a);
  const y0 = centroY(a);
  const x1 = centroX(v, o);
  const y1 = centroY(o);
  PROYECTIL.nombre = nombre;
  PROYECTIL.x = x0 + (x1 - x0) * t;
  PROYECTIL.y = y0 + (y1 - y0) * t;
  PROYECTIL.angulo = Math.atan2(y1 - y0, x1 - x0);
  return PROYECTIL;
}

/** Proyectil del ataque en curso, en vuelo del atacante al objetivo durante el último tramo antes del golpe. */
function dibujarProyectil(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const p = posicionProyectil(v);
  const hoja = p ? v.hojas.get(p.nombre) : undefined;
  if (!p || !hoja) return;
  ctx.save();
  ctx.translate(aPixel(p.x), aPixel(p.y));
  // La hoja mira a la derecha: se gira hacia el objetivo.
  ctx.rotate(p.angulo);
  dibujarFotograma(ctx, hoja, 'vuelo', 'right', v.tiempo, 0, 0, 2);
  ctx.restore();
}

function dibujarEfecto(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const l = v.efectoEn;
  const hoja = v.hojas.get(EFECTOS);
  const anim = hoja?.datos.animations[v.efecto];
  if (!l || !hoja || !anim || v.tiempoEfecto >= anim.frames / anim.fps) return;
  dibujarFotograma(ctx, hoja, v.efecto, 'down', v.tiempoEfecto, centroX(v, l), centroY(l), 2);
}

function dibujarFlotante(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const g = v.golpeado;
  if (!g || !v.flotante) return;
  const sube = Math.round(v.tiempoGolpe * 30);
  const enemigos = v.enemigos;
  const color = v.flotanteCura ? COLOR.cura : g.esHeroina ? COLOR.pv : '#ffffff';
  if (g.esHeroina) {
    escribir(ctx, v.flotante, G.heroinaX, G.heroinaY - 80 - sube, color, 'center', FUENTE_GRANDE);
    return;
  }
  // A la derecha del nombre (que ocupa unos 36 px a cada lado), para no taparlo mientras sube.
  const x = xEnemigo(enemigos.indexOf(g), enemigos.length) + 42;
  escribir(ctx, v.flotante, x, topeEnemigo(v, g) - 30 - sube, color, 'left', FUENTE_GRANDE);
}
