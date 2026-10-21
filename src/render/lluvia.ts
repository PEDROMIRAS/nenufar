import { crearAzar } from '../core/azar';
import { movimientoReducido } from './accesibilidad';
import { ALTO, ANCHO } from './pantalla';

// Arte de la lluvia: gotas finas y algo inclinadas sobre un velo azulado.
const GOTAS = 130;
const VELOCIDAD = { min: 260, max: 380 }; // píxeles lógicos por segundo
const INCLINACION = 0.25; // lo que se desplaza en horizontal por cada píxel que cae
const LARGO = 8;
const VELO = 'rgba(40, 70, 110, 0.28)';
const COLOR_GOTA = 'rgba(214, 232, 250, 0.85)';

/** Posición y velocidad de cada gota (arrays fijos: moverla no crea nada en el bucle). */
export interface Lluvia {
  x: Float32Array;
  y: Float32Array;
  v: Float32Array;
}

export function crearLluvia(): Lluvia {
  const azar = crearAzar(7);
  const l = { x: new Float32Array(GOTAS), y: new Float32Array(GOTAS), v: new Float32Array(GOTAS) };
  for (let i = 0; i < GOTAS; i++) {
    l.x[i] = azar() * (ANCHO + ALTO * INCLINACION);
    l.y[i] = azar() * ALTO;
    l.v[i] = VELOCIDAD.min + azar() * (VELOCIDAD.max - VELOCIDAD.min);
  }
  return l;
}

export function moverLluvia(l: Lluvia, dt: number): void {
  for (let i = 0; i < GOTAS; i++) {
    const caida = l.v[i]! * dt;
    l.y[i]! += caida;
    l.x[i]! -= caida * INCLINACION;
    if (l.y[i]! > ALTO) {
      l.y[i]! -= ALTO + LARGO;
      l.x[i]! += ALTO * INCLINACION;
    }
    if (l.x[i]! < 0) l.x[i]! += ANCHO + ALTO * INCLINACION;
  }
}

/** Velo y gotas con intensidad `fuerza` (0..1); con menos movimiento, solo el velo. */
export function dibujarLluvia(ctx: CanvasRenderingContext2D, l: Lluvia, fuerza: number): void {
  ctx.globalAlpha = fuerza;
  ctx.fillStyle = VELO;
  ctx.fillRect(0, 0, ANCHO, ALTO);
  if (!movimientoReducido()) {
    // Cada gota, dos trazos de píxel desplazados (una línea del canvas saldría borrosa).
    ctx.fillStyle = COLOR_GOTA;
    for (let i = 0; i < GOTAS; i++) {
      const x = Math.round(l.x[i]!);
      const y = Math.round(l.y[i]!);
      ctx.fillRect(x, y - LARGO / 2, 1, LARGO / 2);
      ctx.fillRect(x + 1, y - LARGO, 1, LARGO / 2);
    }
  }
  ctx.globalAlpha = 1;
}
