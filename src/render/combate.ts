import type { Combate, Luchador } from '../core/combate';
import { ALTO, ANCHO } from './pantalla';
import type { Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

// shortcut: el combate se dibuja con rectángulos y texto hasta el arte de combate del hito 6.

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
  /** Luchador que parpadea porque acaba de recibir un golpe (o una cura), y número que flota sobre él. */
  golpeado: Luchador | null;
  flotante: string;
  flotanteCura: boolean;
  tiempoGolpe: number;
  /** Quién se ve preparando un golpe cargado y si la heroína se ve defendiendo. */
  cargando: Set<Luchador>;
  defendiendo: boolean;
  /** Texto grande del final («¡Victoria!»…); vacío mientras se lucha. */
  titulo: string;
}

const COLOR = {
  fondo: '#141a1f',
  suelo: '#1f2a24',
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
const ENEMIGO = { y: 128, ancho: 56, alto: 44, separacion: 140 };
const HEROINA = { x: 120, y: 236, escala: 2 };

/** Centro horizontal del enemigo `i` de `n`, repartidos alrededor del centro de la pantalla. */
export function xEnemigo(i: number, n: number): number {
  return ANCHO / 2 + (i - (n - 1) / 2) * ENEMIGO.separacion;
}

/**
 * Rectángulo del botón `i` de un menú de `n` opciones. Hasta 4 caben en una fila; más, en una
 * rejilla de 3 columnas que ocupa también el registro. Altos de sobra para un dedo.
 */
export function rectOpcion(
  i: number,
  n: number,
): { x: number; y: number; ancho: number; alto: number } {
  if (n <= 4) {
    const ancho = (ANCHO - 32 - (n - 1) * 8) / n;
    return { x: 16 + i * (ancho + 8), y: 292, ancho, alto: 48 };
  }
  const ancho = (ANCHO - 32 - 2 * 8) / 3;
  return { x: 16 + (i % 3) * (ancho + 8), y: 252 + Math.floor(i / 3) * 46, ancho, alto: 40 };
}

export function dibujarCombate(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const { combate } = v;
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = COLOR.suelo;
  ctx.fillRect(0, 150, ANCHO, 110);

  dibujarOrden(ctx, combate);
  combate.enemigos.forEach((e, i) =>
    dibujarEnemigo(ctx, v, e, xEnemigo(i, combate.enemigos.length)),
  );
  dibujarHeroina(ctx, v);
  dibujarFlotante(ctx, v);

  const enRejilla = v.menu !== null && v.menu.opciones.length > 4;
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

function dibujarMenu(ctx: CanvasRenderingContext2D, menu: MenuVista | null): void {
  // Sin menú se dejan los cuatro huecos apagados, para que la pantalla no salte.
  const n = menu?.opciones.length ?? 4;
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

function dibujarEnemigo(
  ctx: CanvasRenderingContext2D,
  v: VistaCombate,
  e: Luchador,
  x: number,
): void {
  const pv = v.pv.get(e) ?? e.pv;
  if (pv <= 0 && v.golpeado !== e) return;
  const { y, ancho, alto } = ENEMIGO;
  // Mientras prepara el golpe cargado, se hincha y vibra.
  const hinchado = v.cargando.has(e) ? 6 + Math.round(Math.sin(v.tiempo * 20) * 2) : 0;
  if (!parpadea(v, e)) {
    ctx.fillStyle = e.monstruo?.color ?? '#999';
    ctx.fillRect(
      x - ancho / 2 - hinchado / 2,
      y - alto - hinchado,
      ancho + hinchado,
      alto + hinchado,
    );
  }
  escribir(ctx, e.nombre, x, y - alto - hinchado - 18, '#e8efe4', 'center');
  barra(ctx, x - 40, y + 8, 80, pv / e.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(e) ?? '', x, y + 18, '#e8efe4', 'center');
  escribir(ctx, v.estados.get(e) ?? '', x, y + 32, COLOR.estado, 'center');
  if (v.cargando.has(e)) {
    escribir(ctx, '¡Prepara un golpe fuerte!', x, y - alto - hinchado - 36, COLOR.aviso, 'center');
  }
}

function dibujarHeroina(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const h = v.combate.heroina;
  const { imagen, datos } = v.sprite;
  const anim = datos.animations['idle'];
  const { x, y, escala } = HEROINA;
  if (anim && !parpadea(v, h)) {
    const columna = anim.startColumn + (Math.floor(v.tiempo * anim.fps) % anim.frames);
    const w = datos.frameWidth;
    const a = datos.frameHeight;
    ctx.drawImage(
      imagen,
      columna * w,
      datos.directions.up * a,
      w,
      a,
      x - datos.anchor.x * escala,
      y - datos.anchor.y * escala,
      w * escala,
      a * escala,
    );
  }
  if (v.defendiendo) escribir(ctx, 'Defendiendo', x, y - 76, COLOR.pm, 'center');
  const bx = x + 48;
  escribir(ctx, h.nombre, bx, 176);
  escribir(ctx, v.estados.get(h) ?? '', bx + 112, 176, COLOR.estado);
  barra(ctx, bx, 194, 120, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', bx + 128, 190);
  barra(ctx, bx, 212, 120, h.pm / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, bx + 128, 208);
}

function dibujarFlotante(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const g = v.golpeado;
  if (!g || !v.flotante) return;
  const sube = Math.round(v.tiempoGolpe * 30);
  const enemigos = v.combate.enemigos;
  const x = g.esHeroina ? HEROINA.x : xEnemigo(enemigos.indexOf(g), enemigos.length);
  const y = (g.esHeroina ? HEROINA.y - 80 : ENEMIGO.y - ENEMIGO.alto - 40) - sube;
  const color = v.flotanteCura ? COLOR.cura : g.esHeroina ? COLOR.pv : '#ffffff';
  escribir(ctx, v.flotante, x, y, color, 'center', FUENTE_GRANDE);
}
