import type { Combate, Luchador } from '../core/combate';
import { ALTO, ANCHO } from './pantalla';
import type { Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

// shortcut: el combate se dibuja con rectángulos y texto hasta el arte de combate del hito 6.

/** Botones del menú de acciones, en píxeles lógicos. Altos de sobra para un dedo (48 px reales o más). */
export const BOTONES = [
  { accion: 'atacar', texto: 'Atacar', x: 16, y: 292, ancho: 144, alto: 48 },
  { accion: 'defender', texto: 'Defender', x: 168, y: 292, ancho: 144, alto: 48 },
  { accion: 'huir', texto: 'Huir', x: 320, y: 292, ancho: 144, alto: 48 },
] as const;
export type AccionMenu = (typeof BOTONES)[number]['accion'];

/** Estado visual que la escena va cambiando según anima los eventos; el dibujo solo lo lee. */
export interface VistaCombate {
  combate: Combate;
  sprite: Sprite;
  tiempo: number;
  /** PV y textos que se ven (van por detrás del combate mientras se animan los eventos). */
  pv: Map<Luchador, number>;
  textoPv: Map<Luchador, string>;
  textoPm: string;
  registro: [string, string];
  seleccion: number;
  menuActivo: boolean;
  puedeHuir: boolean;
  /** Luchador que parpadea porque acaba de recibir un golpe, y número que flota sobre él. */
  golpeado: Luchador | null;
  flotante: string;
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
  barraFondo: '#3a2a2a',
  boton: '#2b3a33',
  botonActivo: '#4f6b5a',
  borde: '#8fa88a',
  apagado: '#6b6b6b',
  aviso: '#ffd27a',
};
const ENEMIGO = { x: ANCHO / 2, y: 128, ancho: 56, alto: 44 };
const HEROINA = { x: 120, y: 236, escala: 2 };

export function dibujarCombate(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  const { combate } = v;
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  ctx.fillStyle = COLOR.suelo;
  ctx.fillRect(0, 150, ANCHO, 110);

  dibujarOrden(ctx, combate);
  for (const e of combate.enemigos) dibujarEnemigo(ctx, v, e);
  dibujarHeroina(ctx, v);
  dibujarFlotante(ctx, v);

  // Registro de las dos últimas acciones.
  ctx.fillStyle = COLOR.panel;
  ctx.fillRect(8, 256, ANCHO - 16, 32);
  escribir(ctx, v.registro[0], 16, 259, '#aab8a6');
  escribir(ctx, v.registro[1], 16, 273);

  BOTONES.forEach((b, i) => {
    const disponible = v.menuActivo && (b.accion !== 'huir' || v.puedeHuir);
    ctx.fillStyle = v.menuActivo && i === v.seleccion ? COLOR.botonActivo : COLOR.boton;
    ctx.fillRect(b.x, b.y, b.ancho, b.alto);
    if (v.menuActivo && i === v.seleccion) {
      ctx.fillStyle = COLOR.borde;
      ctx.fillRect(b.x, b.y, b.ancho, 2);
      ctx.fillRect(b.x, b.y + b.alto - 2, b.ancho, 2);
    }
    escribir(
      ctx,
      b.texto,
      b.x + b.ancho / 2,
      b.y + 17,
      disponible ? '#e8efe4' : COLOR.apagado,
      'center',
    );
  });

  if (v.titulo) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    escribir(ctx, v.titulo, ANCHO / 2, 140, COLOR.aviso, 'center', FUENTE_GRANDE);
    escribir(ctx, 'Pulsa o toca para continuar', ANCHO / 2, 180, '#e8efe4', 'center');
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

function barra(
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
  return v.golpeado === l && Math.floor(v.tiempoGolpe * 16) % 2 === 0;
}

function dibujarEnemigo(ctx: CanvasRenderingContext2D, v: VistaCombate, e: Luchador): void {
  const pv = v.pv.get(e) ?? e.pv;
  if (pv <= 0 && v.golpeado !== e) return;
  const { x, y, ancho, alto } = ENEMIGO;
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
  barra(ctx, bx, 194, 120, (v.pv.get(h) ?? h.pv) / h.pvMax, COLOR.pv);
  escribir(ctx, v.textoPv.get(h) ?? '', bx + 128, 190);
  barra(ctx, bx, 212, 120, h.pm / Math.max(1, h.pmMax), COLOR.pm);
  escribir(ctx, v.textoPm, bx + 128, 208);
}

function dibujarFlotante(ctx: CanvasRenderingContext2D, v: VistaCombate): void {
  if (!v.golpeado || !v.flotante) return;
  const sube = Math.round(v.tiempoGolpe * 30);
  const enHeroina = v.golpeado.esHeroina;
  const x = enHeroina ? HEROINA.x : ENEMIGO.x;
  const y = (enHeroina ? HEROINA.y - 80 : ENEMIGO.y - ENEMIGO.alto - 40) - sube;
  escribir(ctx, v.flotante, x, y, enHeroina ? COLOR.pv : '#ffffff', 'center', FUENTE_GRANDE);
}
