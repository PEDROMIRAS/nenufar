import { camaraAtaque, encuadrar, zoomMaximo, type Encuadre } from '../core/camaraCombate';
import type { Combate, Luchador } from '../core/combate';
import { escalaHoja } from '../core/hoja';
import { partirTexto } from '../core/texto';
import { anchoNombre, disposicionCombate, type DisposicionCombate } from '../core/disposicion';
import { opacidadMensaje, type MensajesCombate } from '../core/mensajes';
import { IMPACTO, MENU_COMBATE } from '../data/datos';
import ritmo from '../data/ritmo.json';
import { ANCHO, aPixel, area, interfaz, rellenarArea } from './pantalla';
import { movimientoReducido } from './accesibilidad';
import { dibujarFotograma, type Sprite } from './recursos';
import type { FondoSala } from './mundo/mundo';
import { conRelieve, escribir, FAMILIA, FUENTE_GRANDE } from './texto';
import { dibujarCaja, dibujarFila, dibujarMarco, dibujarPestana, PALETA, rombo } from './marco';
import type { Rect } from '../core/menu';
import type { MenuVista } from './menu';

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
  /** Los últimos mensajes del combate, que se ven arriba y se apagan solos (`core/mensajes.ts`). */
  mensajes: MensajesCombate;
  /** Primera opción a la vista de la lista (cuando no caben todas) y segundos desde que se abrió el menú. */
  primera: number;
  entrada: number;
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
  /** El ataque en curso es un golpe fuerte (crítico, cargado o en un combate contra un jefe): la cámara se acerca más. */
  ataqueFuerte: boolean;
  /**
   * Cámara con que se dibujó el último fotograma (la escribe el dibujo) y cómo estaba al empezar el ataque en curso
   * (la copia la escena): un ataque nuevo sale de ahí, sin tirones aunque el anterior aún estuviera cerca.
   */
  camara: Encuadre;
  camaraDesde: Encuadre;
  /**
   * Adónde va la cámara en el ataque en curso: se fija en su primer fotograma (la escena pone `camaraFijada` en
   * falso al empezarlo), para que un enemigo que cae o aparece a mitad no la mueva de golpe.
   */
  camaraObjetivo: Encuadre;
  camaraFijada: boolean;
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
  /** Nombre del menú abierto, en la pestaña sobre la lista («Acción», «Habilidad»…). */
  pestana: string;
  /**
   * Cuántos de los últimos mensajes se dieron con el menú abierto («No quedan PM…»): ocupan la franja de la
   * explicación hasta que se mueve el cursor o cambia el menú. 0 si no hay ninguno. Lo que pasó en los turnos de
   * antes no la tapa.
   */
  aviso: number;
  /** Segundos desde que empezó el combate, también durante la pausa de impacto (mueve el ruido del temblor). */
  tiempoReal: number;
  /** Cuánto se desplaza la escena en este fotograma (píxeles lógicos); la lista, la ficha y los textos, no. */
  temblor: { x: number; y: number };
  /** Opacidad con que empezó el último destello del impacto y segundos desde entonces. */
  destello: number;
  tiempoDestello: number;
  /** Tamaño del número que flota, según el peso del golpe (1 = normal). */
  escalaNumero: number;
  /** Velo negro de la entrada y la salida del combate (0 = nada, 1 = negro). */
  negro: number;
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
/** Alto de una línea de la explicación. */
const LINEA = 14;
/** Medidas del combate sin panel (src/data/menu_combate.json). */
const D = MENU_COMBATE;
const ENEMIGO = { y: 128, escala: 2, separacion: 140, alto: 56 };
/** Primera línea libre bajo la barra de turnos (su texto empieza en y = 10). */
const FIN_BARRA_TURNOS = 26;
/**
 * Primera línea libre bajo la banda de mensajes: ni los nombres de los enemigos (tampoco los de un jefe alto) ni sus
 * avisos suben de aquí, y la cámara no los empuja encima.
 */
const TOPE_ESCENA = D.finTurnos + 2 + D.mensajes * D.lineaMensaje;
/** Escala de la heroína (su sitio, abajo a la izquierda junto a la lista, lo da `disposicionCombate`). */
const HEROINA = { escala: 2 };
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
  /** Lo que tiene cada nombre de enemigo a lo ancho: la separación o, si va solo, lo que hay hasta el borde. */
  anchoNombre: ENEMIGO.separacion,
  centro: CENTRO_ENEMIGOS,
  heroinaX: D.horizontal.heroinaX,
  heroinaY: 0,
  tituloY: 112,
};
/** Reparto del combate (`disposicionCombate`); se rellena de nuevo en cada llamada (sin asignar memoria). */
const DISP: DisposicionCombate = disposicionCombate(1, 1, 1, false, D);
function disposicion(n: number): DisposicionCombate {
  return disposicionCombate(interfaz.ancho, interfaz.alto, n, interfaz.alta, D, DISP);
}

function colocar(v: VistaCombate): void {
  colocarEscena(v);
  // Un jefe va solo: su nombre largo cabe en una línea y no baja sobre su cabeza («Sacerdote de la luna falsa»).
  G.anchoNombre =
    v.enemigos.length === 1 ? 2 * Math.min(G.centro, G.ancho - G.centro) : G.separacion;
}

function colocarEscena(v: VistaCombate): void {
  G.ancho = interfaz.ancho;
  // Los pies de enemigos y heroína no dependen del menú abierto: la escena no salta al cambiar de menú.
  const d = disposicion(v.menu?.opciones.length ?? 0);
  G.enemigoY = d.enemigoY;
  G.heroinaX = d.heroina.x;
  G.heroinaY = d.heroina.y;
  G.tituloY = Math.round((interfaz.alto - 92) / 2);
  if (!interfaz.alta) {
    G.escala = ENEMIGO.escala;
    G.separacion = ENEMIGO.separacion;
    G.centro = CENTRO_ENEMIGOS;
    return;
  }
  G.separacion = interfaz.ancho / Math.max(1, v.enemigos.length);
  G.centro = interfaz.ancho / 2;
  // Los sprites se achican lo justo para que no se pisen con los de al lado.
  let ancho = 1;
  for (const en of v.enemigos) {
    const hoja = en.monstruo && v.hojas.get(en.monstruo.sprite);
    if (hoja) ancho = Math.max(ancho, hoja.datos.frameWidth / escalaHoja(hoja.datos));
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

export function dibujarCombate(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  colocar(v);
  colocarCamara(v);
  const { x: tx, y: ty } = v.temblor;
  v.fondo(v.tiempo, tx, ty, luzProyectil(v));
  // El canvas 2D queda transparente encima de la sala en 3D.
  ctx.fillStyle = COLOR.velo;
  rellenarArea(ctx);

  // La escena tiembla con la sala de fondo; el panel, no.
  ctx.save();
  ctx.translate(Math.round(tx), Math.round(ty));
  dibujarOrden(ctx, v);
  const c = v.camara;
  if (c.zoom !== 1) {
    ctx.translate(c.x, c.y);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);
  }
  for (let i = 0; i < v.enemigos.length; i++)
    dibujarEnemigo(ctx, v, v.enemigos[i]!, xEnemigo(i, v.enemigos.length));
  dibujarHeroina(ctx, v);
  dibujarProyectil(ctx, v);
  dibujarEfecto(ctx, v);
  dibujarFlotante(ctx, v);
  ctx.restore();
  dibujarDestello(ctx, v);

  // Sin panel: los mensajes arriba, la ficha abajo y, cuando le toca a la heroína, la lista junto a ella y la
  // explicación abajo del todo.
  const d = disposicion(v.menu?.opciones.length ?? 0);
  dibujarMensajes(ctx, v, d);
  dibujarFicha(ctx, v, d);
  if (v.menu) {
    dibujarLista(ctx, v, d);
    dibujarExplicacion(ctx, v, d);
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
  if (v.negro > 0) {
    ctx.fillStyle = '#000';
    ctx.globalAlpha = Math.min(1, v.negro);
    rellenarArea(ctx);
    ctx.globalAlpha = 1;
  }
}

/** Destello blanco del impacto sobre la escena (no sobre la lista ni la ficha), que se apaga enseguida. */
function dibujarDestello(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const opacidad = v.destello * Math.max(0, 1 - v.tiempoDestello / IMPACTO.destello.duracion);
  if (opacidad <= 0) return;
  // Hasta lo de abajo (la lista, si está abierta, o la ficha).
  const abajo = bordeCamara(v);
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = opacidad;
  ctx.fillRect(area.x, area.y, area.ancho, abajo - area.y);
  ctx.globalAlpha = 1;
}

/** Ancho de una letra de Space Mono en negrita a 12 px (0,612 de su tamaño). */
const ANCHO_LETRA = 7.35;
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
/**
 * El nombre corto partido en las líneas que caben en lo que le toca a cada enemigo (una vez por tamaño). Una
 * palabra que no cabe ni sola se corta con «…» para no montarse con la del vecino.
 */
function lineasNombre(l: Luchador): readonly string[] {
  const letras = anchoNombre(G.anchoNombre);
  let c = NOMBRES.get(l);
  if (!c || c.letras !== letras) {
    const lineas = partirTexto(nombreCorto(l), letras).map((t) =>
      t.length > letras ? `${t.slice(0, Math.max(1, letras - 1))}…` : t,
    );
    c = { letras, lineas };
    NOMBRES.set(l, c);
  }
  return c.lineas;
}

/** Barra con quién actúa en lo que queda de ronda; el primero es el que tiene el turno. */
function dibujarOrden(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  // Una banda oscura con el filete lavanda de los marcos y, en ella, quién actúa en lo que queda de ronda: cada
  // uno en su cajita con una pestaña de su color; el que tiene el turno, resaltado y con el rombo del cursor.
  // A todo el ancho de la ventana (en horizontal, la interfaz de 480 va centrada y quedaban los lados sin banda).
  ctx.fillStyle = 'rgba(9, 7, 18, 0.6)';
  ctx.fillRect(area.x, area.y, area.ancho, FIN_BARRA_TURNOS - 1 - area.y);
  ctx.fillStyle = PALETA.filete;
  ctx.fillRect(area.x, FIN_BARRA_TURNOS - 1, area.ancho, 1);
  escribir(ctx, 'Turno', 10, 7, PALETA.apagada);
  let x = 64;
  for (let i = v.turno; i < v.orden.length; i++) {
    const l = v.orden[i]!;
    if ((v.pv.get(l) ?? l.pv) <= 0) continue;
    const nombre = nombreCorto(l);
    const ancho = Math.ceil(16 + nombre.length * ANCHO_LETRA);
    // Lo que no cabe se resume en «…» en vez de salirse de la pantalla.
    if (x + ancho > G.ancho - 6) {
      escribir(ctx, '…', x, 7, PALETA.apagada);
      return;
    }
    const actua = i === v.turno;
    dibujarCaja(ctx, x, 4, ancho, 17, actua ? 'elegida' : 'normal');
    ctx.fillStyle = l.esHeroina ? COLOR.pm : (l.monstruo?.color ?? '#999');
    ctx.fillRect(x + 3, 7, 3, 11);
    escribir(ctx, nombre, x + 10, 7, actua ? PALETA.elegida : PALETA.texto);
    if (actua) rombo(ctx, x - 1, 12, 6, PALETA.cursor);
    x += ancho + 7;
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
  const alto = sprite
    ? (sprite.datos.frameHeight / escalaHoja(sprite.datos) - 6) * G.escala
    : ENEMIGO.alto;
  return Math.max(TOPE_ESCENA + D.nombre, G.enemigoY - alto);
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
  const sinSitio = tope - 36 - extra < TOPE_ESCENA;
  const avisoEnNombre = sinSitio && v.cargando.has(e);
  // Nunca sube sobre los mensajes: un jefe alto con el nombre en dos líneas lo baja hasta su borde
  // (los fotogramas dejan unos píxeles libres por arriba).
  const yNombre = Math.max(TOPE_ESCENA, tope - 18 - extra);
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

/** Las filas de la lista del menú abierto (`n` opciones), su alto y cuántas se ven: donde cae el toque. */
export function listaCombate(n: number): Rect {
  return disposicion(n).lista;
}
export function filaCombate(n: number): number {
  return disposicion(n).fila;
}
export function visiblesCombate(n: number): number {
  return disposicion(n).visibles;
}

/** Dónde acaba el cartel del mando en el combate: en horizontal, justo sobre la ficha; en vertical, donde siempre. */
export function bajoCartelCombate(): number | undefined {
  return interfaz.alta ? undefined : disposicion(0).ficha.y - 4;
}

/** La ayuda de cada opción, partida a un ancho (una vez por texto y ancho). */
const AYUDA_PARTIDA = new WeakMap<
  readonly string[],
  { letras: number; lineas: readonly string[] }
>();

function ayudaPartida(ayuda: readonly string[], letras: number): readonly string[] {
  let c = AYUDA_PARTIDA.get(ayuda);
  if (!c || c.letras !== letras) {
    c = { letras, lineas: partirTexto(ayuda.join(' '), letras) };
    AYUDA_PARTIDA.set(ayuda, c);
  }
  return c.lineas;
}

/** Mensajes y avisos partidos a un ancho (cambian poco: se guardan; uno por ancho de uso). */
const AVISOS = new Map<string, readonly string[]>();
const MENSAJES = new Map<string, readonly string[]>();

function avisoPartido(
  texto: string,
  cache: Map<string, readonly string[]>,
  letras: number,
): readonly string[] {
  let lineas = cache.get(texto);
  if (!lineas) {
    // Los avisos llevan números (daño…): se vacía de vez en cuando para que no crezca sin fin.
    if (cache.size > 200) cache.clear();
    lineas = texto ? partirTexto(texto, letras) : [];
    cache.set(texto, lineas);
  }
  return lineas;
}

/** Cuántas letras caben en `ancho` con `letras` cacheadas por ancho: se vacía la caché si cambia (girar el móvil). */
const ANCHOS_CACHE = new Map<Map<string, readonly string[]>, number>();
function letrasPara(cache: Map<string, readonly string[]>, ancho: number): number {
  const letras = Math.max(1, Math.floor(ancho / ANCHO_LETRA));
  if (ANCHOS_CACHE.get(cache) !== letras) {
    cache.clear();
    ANCHOS_CACHE.set(cache, letras);
  }
  return letras;
}

/**
 * Los últimos mensajes, arriba bajo la barra de turnos: el más nuevo en la última línea de la banda y los
 * anteriores encima, cada uno con su opacidad (`opacidadMensaje`): se apagan solos.
 */
function dibujarMensajes(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  d: DisposicionCombate,
): void {
  const b = d.mensajes;
  const m = v.mensajes;
  const letras = letrasPara(MENSAJES, b.ancho);
  let linea = D.mensajes;
  for (let i = m.textos.length - 1; i >= 0 && linea > 0; i--) {
    const alfa = opacidadMensaje(m, i, v.tiempoReal, ritmo.mensajes);
    const lineas = avisoPartido(m.textos[i]!, MENSAJES, letras);
    for (let k = lineas.length - 1; k >= 0 && linea > 0; k--) {
      linea--;
      if (alfa <= 0) continue;
      ctx.globalAlpha = alfa;
      escribir(ctx, lineas[k]!, b.x, b.y + linea * D.lineaMensaje, PALETA.texto);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * La lista del menú abierto, junto a la heroína: la pestaña con el nombre del menú encima, las filas que caben
 * (desde `v.primera`) y una flecha en el borde si hay más arriba o abajo. Entra deslizándose desde la rana (sin
 * deslizar con «menos movimiento»).
 */
function dibujarLista(ctx: CanvasRenderingContext2D, v: VistaCombate, d: DisposicionCombate): void {
  const menu = v.menu!;
  const n = menu.opciones.length;
  const r = d.lista;
  const pad = D.rellenoLista;
  const p = movimientoReducido() ? 1 : Math.min(1, v.entrada / D.entradaLista);
  const x = r.x - Math.round((1 - p) * D.deslizamiento);
  ctx.globalAlpha = p;
  dibujarCaja(ctx, x - pad, r.y - pad, r.ancho + 2 * pad, r.alto + 2 * pad, 'normal');
  dibujarPestana(ctx, x + 4, r.y - pad - D.tituloLista, v.pestana);
  for (let k = 0; k < d.visibles; k++) {
    const i = v.primera + k;
    if (i >= n) break;
    const o = menu.opciones[i]!;
    const elegida = i === menu.seleccion;
    const estado = o.disponible
      ? elegida
        ? 'elegida'
        : 'normal'
      : elegida
        ? 'elegidaApagada'
        : 'apagada';
    // En filas altas (el móvil de pie) el coste va bajo el nombre: en una columna estrecha no cabe al lado.
    dibujarFila(
      ctx,
      x,
      r.y + k * d.fila,
      r.ancho,
      d.fila,
      o.texto,
      o.detalle,
      estado,
      d.fila >= 30,
    );
  }
  if (v.primera > 0) escribir(ctx, '▲', x + r.ancho - 4, r.y - pad - 12, PALETA.cursor, 'right');
  if (v.primera + d.visibles < n)
    escribir(ctx, '▼', x + r.ancho - 4, r.y + r.alto - 2, PALETA.cursor, 'right');
  ctx.globalAlpha = 1;
}

/** La franja de abajo: qué hace lo elegido o, si acaba de darse con el menú abierto, el aviso («No quedan PM»). */
function dibujarExplicacion(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  d: DisposicionCombate,
): void {
  const e = d.explicacion;
  const ayudaElegida = v.menu?.opciones[v.menu.seleccion]?.ayuda;
  // Sin nada que decir (elegir enemigo, Volver), no hay franja: una caja vacía abajo era otro panel fijo.
  if (v.aviso === 0 && !ayudaElegida) return;
  dibujarCaja(ctx, e.x, e.y, e.ancho, e.alto, 'normal');
  const letras = letrasPara(AVISOS, e.ancho - 20);
  const maxLineas = Math.max(1, Math.floor((e.alto - 8) / LINEA));
  const x = e.x + 10;
  const y = e.y + 6;
  if (v.aviso > 0) dibujarAviso(ctx, v, x, y, letras, maxLineas, AVISOS);
  else {
    const ayuda = v.menu?.opciones[v.menu.seleccion]?.ayuda;
    if (!ayuda) return;
    const lineas = ayudaPartida(ayuda, letras);
    for (let i = 0; i < lineas.length && i < maxLineas; i++)
      escribir(ctx, lineas[i]!, x, y + i * LINEA, PALETA.texto);
  }
}

/** Los últimos mensajes dados con el menú abierto (como mucho dos: «No quedan PM…» y su pista). */
function dibujarAviso(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  x: number,
  y: number,
  letras: number,
  maxLineas: number,
  cache: Map<string, readonly string[]>,
): void {
  const reg = v.mensajes.textos;
  let linea = 0;
  for (let r = Math.max(0, reg.length - Math.min(v.aviso, 2)); r < reg.length; r++) {
    const lineas = avisoPartido(reg[r]!, cache, letras);
    for (let i = 0; i < lineas.length && linea < maxLineas; i++, linea++)
      escribir(ctx, lineas[i]!, x, y + linea * LINEA, COLOR.aviso);
  }
}

/** La ficha de la heroína, siempre a la vista: nombre (o su estado, si no cabe al lado), PV y PM. */
function dibujarFicha(ctx: CanvasRenderingContext2D, v: VistaCombate, d: DisposicionCombate): void {
  const f = d.ficha;
  dibujarCaja(ctx, f.x, f.y, f.ancho, f.alto, 'normal');
  const h = v.combate.heroina;
  const fx = f.x + 8;
  const ancho = f.ancho - 16 - 46;
  // Los estados van tras el nombre si caben; si no, en su lugar (saber que está quemada importa más que leer su
  // nombre, y «Quemadura» se quedaba en «Quema…»), y solo se cortan si ni así caben.
  const estados = v.estados.get(h) ?? '';
  const xEstados = fx + (h.nombre.length + 1) * ANCHO_LETRA;
  const fin = f.x + f.ancho - 8;
  const y = f.y + 3;
  if (estados === '' || xEstados + estados.length * ANCHO_LETRA <= fin) {
    escribir(ctx, h.nombre, fx, y, PALETA.texto);
    escribir(ctx, estados, xEstados, y, COLOR.estado);
  } else {
    const sitio = Math.floor((fin - fx) / ANCHO_LETRA);
    const texto = estados.length > sitio ? `${estados.slice(0, Math.max(0, sitio - 1))}…` : estados;
    escribir(ctx, texto, fx, y, COLOR.estado);
  }
  barra(ctx, fx, y + 17, ancho, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', fx + ancho + 6, y + 13);
  barra(ctx, fx, y + 30, ancho, v.pmHeroina / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, fx + ancho + 6, y + 26);
}

/** Lo de la escena que la cámara no debe sacar del marco, el marco y el encuadre pedido (reutilizados). */
const CONTENIDO = { arriba: 0, abajo: 0 };
const MARCO = { arriba: 0, abajo: 0 };
const LADOS = { izquierda: 0, derecha: 0 };
const MARCO_LADOS = { izquierda: 0, derecha: 0 };
/** Ensancha `LADOS` para que quepa lo que mide `ancho` centrado en `x`. */
function abarcar(x: number, ancho: number): void {
  LADOS.izquierda = Math.min(LADOS.izquierda, x - ancho / 2);
  LADOS.derecha = Math.max(LADOS.derecha, x + ancho / 2);
}
/** Píxeles que bajan los pies de la heroína bajo su ancla (2 de la hoja × 2 de escala). */
const PIES_HEROINA = 4;
/** Lo que ocupa bajo su ancla un enemigo: barra de vida, PV y estados (`dibujarEnemigo`). */
const BAJO_ENEMIGO = 46;

/**
 * Borde de abajo de la escena: con el menú abierto, lo alto de la lista (con su pestaña); sin él, la ficha en
 * vertical (va a lo ancho) y casi el borde de la pantalla en horizontal (la ficha va a la derecha, encima).
 */
function bordeCamara(v: VistaCombate): number {
  const d = disposicion(v.menu?.opciones.length ?? 0);
  if (v.menu) return d.lista.y - D.rellenoLista - D.tituloLista;
  return interfaz.alta ? d.ficha.y : interfaz.alto - D.margen;
}

/**
 * Cámara de este fotograma (en `v.camara`): durante un ataque, la escena (sin la barra de turnos ni el panel) se
 * acerca al punto entre quien ataca y quien recibe; el fondo 3D se queda quieto, así que el primer plano se separa
 * de él. El acercamiento nunca saca del marco los nombres de los enemigos ni los pies de la heroína, ni nada por
 * los lados de la pantalla.
 */
function colocarCamara(v: VistaCombate): void {
  const a = v.atacante;
  const o = v.objetivoAtaque;
  const camara = IMPACTO.camara;
  if (!a || !o || !camara) {
    v.camara.zoom = 1;
    return;
  }
  if (!v.camaraFijada) {
    v.camaraFijada = true;
    let arriba = Infinity;
    // Lo más a los lados que se dibuja: la heroína y, de cada enemigo, lo más ancho entre su sprite, su nombre, su
    // barra, sus textos y el aviso de golpe fuerte (en vertical, con nombres largos, tocan el borde).
    LADOS.izquierda = G.heroinaX;
    LADOS.derecha = G.heroinaX;
    abarcar(G.heroinaX, Math.max(32 * HEROINA.escala, 'Defendiendo'.length * ANCHO_LETRA));
    for (let i = 0; i < v.enemigos.length; i++) {
      const e = v.enemigos[i]!;
      if ((v.pv.get(e) ?? e.pv) <= 0 && v.golpeado !== e) continue;
      const hoja = e.monstruo && v.hojas.get(e.monstruo.sprite);
      let letras = Math.max(
        (v.textoPv.get(e) ?? '').length,
        (v.estados.get(e) ?? '').length,
        v.cargando.has(e) ? '¡Golpe fuerte!'.length : 0,
      );
      for (const l of lineasNombre(e)) letras = Math.max(letras, l.length);
      abarcar(
        xEnemigo(i, v.enemigos.length),
        Math.max(
          hoja ? (hoja.datos.frameWidth / escalaHoja(hoja.datos)) * G.escala : 0,
          letras * ANCHO_LETRA,
          Math.min(80, G.separacion - 8),
        ),
      );
    }
    MARCO_LADOS.izquierda = Math.min(0, LADOS.izquierda);
    MARCO_LADOS.derecha = Math.max(G.ancho, LADOS.derecha);
    for (const e of v.enemigos) {
      if ((v.pv.get(e) ?? e.pv) <= 0 && v.golpeado !== e) continue;
      // Lo más alto que dibuja cada enemigo (`dibujarEnemigo`): el aviso de golpe fuerte o la flecha sobre el
      // nombre si caben; si no, el nombre, que nunca sube de la barra de turnos.
      const extra = (lineasNombre(e).length - 1) * LINEA_NOMBRE;
      const tope = topeEnemigo(v, e);
      const aviso = tope - 36 - extra;
      arriba = Math.min(
        arriba,
        aviso >= TOPE_ESCENA ? aviso : Math.max(TOPE_ESCENA, tope - 18 - extra),
      );
    }
    CONTENIDO.abajo = Math.max(G.heroinaY + PIES_HEROINA, G.enemigoY + BAJO_ENEMIGO);
    CONTENIDO.arriba = Number.isFinite(arriba) ? arriba : CONTENIDO.abajo;
    // El marco nunca es más estrecho que lo que ya se ve sin acercarse.
    MARCO.arriba = Math.min(TOPE_ESCENA, CONTENIDO.arriba);
    MARCO.abajo = Math.max(bordeCamara(v), CONTENIDO.abajo);
    encuadrar(
      zoomMaximo(camara, v.ataqueFuerte),
      (centroX(v, a) + centroX(v, o)) / 2,
      (centroY(a) + centroY(o)) / 2,
      CONTENIDO,
      MARCO,
      v.camaraObjetivo,
      LADOS,
      MARCO_LADOS,
    );
  }
  camaraAtaque(
    v.tiempoAtaque,
    anticipoAtaque(v, a),
    camara,
    v.camaraDesde,
    v.camaraObjetivo,
    v.camara,
  );
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

/**
 * Dónde está el proyectil en la pantalla, con el acercamiento de la cámara: ahí se pone su luz en la sala 3D, que
 * no se acerca (el proyectil, sí: se dibuja dentro de la escena).
 */
const LUZ = { nombre: '', x: 0, y: 0, angulo: 0 };
function luzProyectil(v: VistaCombate): typeof LUZ | null {
  const p = posicionProyectil(v);
  if (!p) return null;
  const c = v.camara;
  LUZ.nombre = p.nombre;
  LUZ.x = c.x + c.zoom * (p.x - c.x);
  LUZ.y = c.y + c.zoom * (p.y - c.y);
  LUZ.angulo = p.angulo;
  return LUZ;
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

/** Letras del número que flota, de 0 a 64 px, hechas una vez (no se crea un texto nuevo en cada fotograma). */
const FUENTES_NUMERO = Array.from({ length: 65 }, (_, px) => `bold ${px}px ${FAMILIA}`);
// Con contorno y sombra, como los títulos: con solo la sombra fina se perdían sobre el fondo.
FUENTES_NUMERO.forEach((f, px) => {
  if (px >= 16) conRelieve(f, px);
});
const TAMANO_NUMERO = 24;

/** Letra del número que flota: aparece un poco más grande y se asienta en su tamaño, sin rebote. */
function fuenteNumero(v: VistaCombate): string {
  const p = Math.min(1, v.tiempoGolpe / IMPACTO.numero.asentar);
  const asentado = 1 - (1 - p) * (1 - p);
  const escala = v.escalaNumero * (1.15 - 0.15 * asentado);
  return FUENTES_NUMERO[Math.min(64, Math.round(TAMANO_NUMERO * escala))]!;
}

function dibujarFlotante(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const g = v.golpeado;
  if (!g || !v.flotante) return;
  const fuente = fuenteNumero(v);
  const sube = Math.round(v.tiempoGolpe * 30);
  const enemigos = v.enemigos;
  const color = v.flotanteCura ? COLOR.cura : g.esHeroina ? COLOR.pv : '#ffffff';
  if (g.esHeroina) {
    escribir(ctx, v.flotante, G.heroinaX, G.heroinaY - 80 - sube, color, 'center', fuente);
    return;
  }
  // A la derecha del nombre (que ocupa unos 36 px a cada lado), para no taparlo mientras sube.
  const x = xEnemigo(enemigos.indexOf(g), enemigos.length) + 42;
  escribir(ctx, v.flotante, x, topeEnemigo(v, g) - 30 - sube, color, 'left', fuente);
}
