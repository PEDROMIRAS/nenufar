import { moverCuerpo, type Cuerpo, type Rejilla } from './movimiento';
import type { MovimientoMapaJson } from './types';

/** Un monstruo moviéndose por el mapa: patrulla cerca de su casa y persigue a la heroína si la ve. */
export interface Patrulla {
  cuerpo: Cuerpo;
  xAnterior: number;
  yAnterior: number;
  casaX: number;
  casaY: number;
  destinoX: number;
  destinoY: number;
  /** Segundos que le quedan parado antes de elegir otro destino. */
  espera: number;
  /** Hacia dónde mira (vector unitario): la última dirección en la que se movió. */
  dirX: number;
  dirY: number;
  persiguiendo: boolean;
}

/** La persecución se abandona cuando la heroína se aleja más que la visión × este factor. */
const OLVIDO = 1.5;
/** Píxeles a los que se da por llegado a un destino. */
const LLEGADA = 2;

export function crearPatrulla(cuerpo: Cuerpo): Patrulla {
  return {
    cuerpo,
    xAnterior: cuerpo.x,
    yAnterior: cuerpo.y,
    casaX: cuerpo.x,
    casaY: cuerpo.y,
    destinoX: cuerpo.x,
    destinoY: cuerpo.y,
    espera: 0,
    dirX: 0,
    dirY: 1,
    persiguiendo: false,
  };
}

/** Un paso lógico de patrulla o persecución. No crea objetos: se llama en cada paso del bucle. */
export function actualizarPatrulla(
  p: Patrulla,
  mov: MovimientoMapaJson,
  heroeX: number,
  heroeY: number,
  dt: number,
  rejilla: Rejilla,
  tam: number,
  azar: () => number,
): void {
  const c = p.cuerpo;
  p.xAnterior = c.x;
  p.yAnterior = c.y;
  const aHeroe = Math.hypot(heroeX - c.x, heroeY - c.y);
  if (aHeroe < mov.vision) p.persiguiendo = true;
  else if (aHeroe > mov.vision * OLVIDO) p.persiguiendo = false;

  let tx = heroeX;
  let ty = heroeY;
  let velocidad = mov.persecucion;
  if (!p.persiguiendo) {
    if (p.espera > 0) {
      p.espera -= dt;
      return;
    }
    tx = p.destinoX;
    ty = p.destinoY;
    velocidad = mov.velocidad;
    if (Math.hypot(tx - c.x, ty - c.y) <= LLEGADA) {
      // Llegó: espera un poco y elige otro punto dentro de su zona de patrulla.
      const angulo = azar() * Math.PI * 2;
      const r = azar() * mov.patrulla;
      p.destinoX = p.casaX + Math.cos(angulo) * r;
      p.destinoY = p.casaY + Math.sin(angulo) * r;
      p.espera = 0.5 + azar();
      return;
    }
  }
  const dx = tx - c.x;
  const dy = ty - c.y;
  const largo = Math.hypot(dx, dy);
  if (largo === 0) return;
  const paso = Math.min(velocidad * dt, largo);
  moverCuerpo(c, (dx / largo) * paso, (dy / largo) * paso, rejilla, tam, 0);
  const movidoX = c.x - p.xAnterior;
  const movidoY = c.y - p.yAnterior;
  const movido = Math.hypot(movidoX, movidoY);
  if (movido > 0) {
    p.dirX = movidoX / movido;
    p.dirY = movidoY / movido;
  } else if (!p.persiguiendo) {
    // Atascado contra un muro: renuncia a ese destino.
    p.destinoX = c.x;
    p.destinoY = c.y;
  }
}

/**
 * Quién empieza el combate al tocarse: la heroína si el monstruo le da la espalda; el monstruo si
 * es la heroína quien le da la espalda; nadie en especial (null) en los demás casos.
 */
export function iniciativa(
  heroe: { x: number; y: number; dirX: number; dirY: number },
  monstruo: { x: number; y: number; dirX: number; dirY: number },
): 'heroina' | 'monstruos' | null {
  const hx = heroe.x - monstruo.x;
  const hy = heroe.y - monstruo.y;
  if (monstruo.dirX * hx + monstruo.dirY * hy < 0) return 'heroina';
  if (heroe.dirX * -hx + heroe.dirY * -hy < 0) return 'monstruos';
  return null;
}
