import type { Combate, Luchador } from '../core/combate';
import { ALTO, ANCHO } from './pantalla';
import { dibujarFotograma } from './monstruo';
import type { Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

export interface OpcionMenu {
  texto: string;
  /** Texto pequeño bajo la opción (el coste en PM de una habilidad…). */
  detalle: string;
  disponible: boolean;
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
  /** La sala donde empezó el combate, que se ve oscurecida detrás. */
  fondo: HTMLCanvasElement;
  tiempo: number;
  /** PV y textos que se ven (van por detrás del combate mientras se animan los eventos). */
  pv: Map<Luchador, number>;
  textoPv: Map<Luchador, string>;
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
}

const COLOR = {
  /** Oscurece la sala de fondo para que se lean los luchadores y los textos. */
  velo: 'rgba(10, 12, 16, 0.6)',
  panel: 'rgba(0, 0, 0, 0.45)',
  pv: '#d8584a',
  pm: '#5a8bd8',
  cura: '#7fd88a',
  barraFondo: '#3a2a2a',
  boton: '#2b3a33',
  botonActivo: '#4f6b5a',
  borde: '#8fa88a',
  apagado: '#6b6b6b',
  aviso: '#ffd27a',
  estado: '#c89bff',
};
const ENEMIGO = { y: 128, escala: 2, separacion: 140, alto: 56, topeMinimo: 44 };
const HEROINA = { x: 120, y: 236, escala: 2 };
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
  const enemigos = v.combate.enemigos;
  return l.esHeroina ? HEROINA.x : xEnemigo(enemigos.indexOf(l), enemigos.length);
}

function centroY(l: Luchador): number {
  return l.esHeroina ? HEROINA.y - 28 : ENEMIGO.y - 26;
}

/** Centro horizontal del enemigo `i` de `n`, repartidos alrededor del centro de la pantalla. */
export function xEnemigo(i: number, n: number): number {
  return ANCHO / 2 + (i - (n - 1) / 2) * ENEMIGO.separacion;
}

/**
 * Rectángulo del botón `i` de un menú de `n` opciones. Hasta 5 caben en una fila; más, en una
 * rejilla de 3 columnas que ocupa también el registro. Altos de sobra para un dedo.
 */
export function rectOpcion(
  i: number,
  n: number,
): { x: number; y: number; ancho: number; alto: number } {
  if (n <= 5) {
    const ancho = (ANCHO - 32 - (n - 1) * 8) / n;
    return { x: 16 + i * (ancho + 8), y: 292, ancho, alto: 48 };
  }
  const ancho = (ANCHO - 32 - 2 * 8) / 3;
  return { x: 16 + (i % 3) * (ancho + 8), y: 252 + Math.floor(i / 3) * 46, ancho, alto: 40 };
}

export function dibujarCombate(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const { combate } = v;
  ctx.drawImage(v.fondo, 0, 0);
  ctx.fillStyle = COLOR.velo;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  dibujarOrden(ctx, combate);
  combate.enemigos.forEach((e, i) =>
    dibujarEnemigo(ctx, v, e, xEnemigo(i, combate.enemigos.length)),
  );
  dibujarHeroina(ctx, v);
  dibujarProyectil(ctx, v);
  dibujarEfecto(ctx, v);
  dibujarFlotante(ctx, v);

  const enRejilla = v.menu !== null && v.menu.opciones.length > 5;
  if (!enRejilla) {
    // Registro de las dos últimas acciones.
    ctx.fillStyle = COLOR.panel;
    ctx.fillRect(8, 256, ANCHO - 16, 32);
    escribir(ctx, v.registro[0], 16, 259, '#aab8a6');
    escribir(ctx, v.registro[1], 16, 273);
  }
  dibujarMenu(ctx, v.menu);

  if (v.titulo) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    escribir(ctx, v.titulo, ANCHO / 2, 140, COLOR.aviso, 'center', FUENTE_GRANDE);
    escribir(ctx, 'Pulsa o toca para continuar', ANCHO / 2, 180, '#e8efe4', 'center');
  }
}

export function dibujarMenu(ctx: CanvasRenderingContext2D, menu: MenuVista | null): void {
  // Sin menú se dejan los cinco huecos apagados, para que la pantalla no salte.
  const n = menu?.opciones.length ?? 5;
  for (let i = 0; i < n; i++) {
    const r = rectOpcion(i, n);
    const opcion = menu?.opciones[i];
    const elegida = menu !== null && i === menu.seleccion;
    ctx.fillStyle = elegida ? COLOR.botonActivo : COLOR.boton;
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    if (elegida) {
      ctx.fillStyle = COLOR.borde;
      ctx.fillRect(r.x, r.y, r.ancho, 2);
      ctx.fillRect(r.x, r.y + r.alto - 2, r.ancho, 2);
    }
    if (!opcion) continue;
    const color = opcion.disponible ? '#e8efe4' : COLOR.apagado;
    const conDetalle = opcion.detalle !== '';
    const y = r.y + r.alto / 2 - (conDetalle ? 13 : 7);
    escribir(ctx, opcion.texto, r.x + r.ancho / 2, y, color, 'center');
    if (conDetalle) escribir(ctx, opcion.detalle, r.x + r.ancho / 2, y + 14, COLOR.pm, 'center');
  }
}

/** Barra con quién actúa en lo que queda de ronda; el primero es el que tiene el turno. */
function dibujarOrden(ctx: CanvasRenderingContext2D, c: Combate): void {
  escribir(ctx, 'Turno', 12, 10, '#aab8a6');
  let x = 64;
  for (let i = Math.max(0, c.turno - 1); i < c.orden.length; i++) {
    const l = c.orden[i]!;
    if (l.pv <= 0) continue;
    ctx.fillStyle = l.esHeroina ? COLOR.pm : (l.monstruo?.color ?? '#999');
    ctx.fillRect(x, 8, 8, 16);
    escribir(ctx, l.nombre, x + 12, 10);
    x += 24 + l.nombre.length * 7;
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
  return v.golpeado === l && !v.flotanteCura && Math.floor(v.tiempoGolpe * 16) % 2 === 0;
}

/** Altura de la parte de arriba del enemigo, de donde cuelgan su nombre y los avisos. */
function topeEnemigo(v: VistaCombate, e: Luchador): number {
  const sprite = e.monstruo && v.hojas.get(e.monstruo.sprite);
  // Los fotogramas dejan unos píxeles libres por arriba; los jefes grandes no deben pisar la barra de turnos.
  const alto = sprite ? (sprite.datos.frameHeight - 6) * ENEMIGO.escala : ENEMIGO.alto;
  return Math.max(ENEMIGO.topeMinimo, ENEMIGO.y - alto);
}

function dibujarEnemigo(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  e: Luchador,
  x: number,
): void {
  const pv = v.pv.get(e) ?? e.pv;
  if (pv <= 0 && v.golpeado !== e) return;
  const { y } = ENEMIGO;
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
    dibujarFotograma(ctx, sprite, anim, 'down', t, x + dx, y, ENEMIGO.escala);
  }
  escribir(ctx, e.nombre, x, tope - 18, '#e8efe4', 'center');
  if (v.apuntado === e) {
    escribir(
      ctx,
      '▼',
      x,
      tope - 34 + Math.round(Math.sin(v.tiempo * 8) * 2),
      COLOR.aviso,
      'center',
    );
  }
  barra(ctx, x - 40, y + 8, 80, pv / e.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(e) ?? '', x, y + 18, '#e8efe4', 'center');
  escribir(ctx, v.estados.get(e) ?? '', x, y + 32, COLOR.estado, 'center');
  if (v.cargando.has(e)) {
    escribir(ctx, '¡Prepara un golpe fuerte!', x, tope - 36, COLOR.aviso, 'center');
  }
}

function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const h = v.combate.heroina;
  const { x, y, escala } = HEROINA;
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
  const bx = x + 48;
  escribir(ctx, h.nombre, bx, 176);
  escribir(ctx, v.estados.get(h) ?? '', bx + 112, 176, COLOR.estado);
  barra(ctx, bx, 194, 120, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', bx + 128, 190);
  barra(ctx, bx, 212, 120, h.pm / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, bx + 128, 208);
}

/** Proyectil del ataque en curso, en vuelo del atacante al objetivo durante el último tramo antes del golpe. */
function dibujarProyectil(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const a = v.atacante;
  const o = v.objetivoAtaque;
  const nombre = a?.heroe?.combate.proyectil;
  const hoja = nombre ? v.hojas.get(nombre) : undefined;
  if (!a || !o || !hoja) return;
  const t = (v.tiempoAtaque - (anticipoAtaque(v, a) - VUELO)) / VUELO;
  if (t < 0 || t > 1) return;
  const x0 = centroX(v, a);
  const y0 = centroY(a);
  const x1 = centroX(v, o);
  const y1 = centroY(o);
  ctx.save();
  ctx.translate(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t));
  // La hoja mira a la derecha: se gira hacia el objetivo.
  ctx.rotate(Math.atan2(y1 - y0, x1 - x0));
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
  const enemigos = v.combate.enemigos;
  const x = g.esHeroina ? HEROINA.x : xEnemigo(enemigos.indexOf(g), enemigos.length);
  const y = (g.esHeroina ? HEROINA.y - 80 : topeEnemigo(v, g) - 36) - sube;
  const color = v.flotanteCura ? COLOR.cura : g.esHeroina ? COLOR.pv : '#ffffff';
  escribir(ctx, v.flotante, x, y, color, 'center', FUENTE_GRANDE);
}
