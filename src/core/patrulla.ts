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
  /** Lado al que mira un monstruo dibujado solo de lado (`deLado`): 1 derecha, −1 izquierda. */
  lado: 1 | -1;
  persiguiendo: boolean;
  /** Segundos que le quedan quieto tras ver a la heroína (el «¡!»), antes de lanzarse. */
  alerta: number;
  /** Qué pasó en el último paso: 1 = acaba de verla, −1 = acaba de perderla, 0 = nada. */
  cambio: -1 | 0 | 1;
}

/** Qué parte de alrededor ve un monstruo: el coseno de medio ángulo de su cono y a cuántos píxeles nota en redondo. */
export interface Vista {
  cosMitad: number;
  cerca: number;
}

/** Vista en todas direcciones (como el ermitaño, que no ve, y como era antes del cono). */
const EN_REDONDO: Vista = { cosMitad: -2, cerca: 0 };

/** La vista de `angulo` grados delante y `cerca` píxeles en redondo (`vista` de mapa_vivo.json). */
export const vistaDe = (v: { angulo: number; cerca: number }): Vista => ({
  cosMitad: Math.cos((v.angulo * Math.PI) / 360),
  cerca: v.cerca,
});

/** La persecución se abandona cuando la heroína se aleja más que la visión × este factor. */
const OLVIDO = 1.5;
/** Un monstruo `deLado` cambia de lado solo si se mueve al menos así de lado (fracción de lo que anduvo). */
const DE_LADO = 0.25;
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
    lado: 1,
    persiguiendo: false,
    alerta: 0,
    cambio: 0,
  };
}

/**
 * Hacia dónde mira, tal como se dibuja: de lado (`lado`, 0) si su hoja solo tiene esa vista, o hacia donde se movió.
 * Es lo que cuenta para verla y para pillarlo por la espalda (sin crear objetos: un número cada una).
 */
export const miraX = (p: Patrulla, mov: MovimientoMapaJson | undefined): number =>
  mov?.deLado ? p.lado : p.dirX;
export const miraY = (p: Patrulla, mov: MovimientoMapaJson | undefined): number =>
  mov?.deLado ? 0 : p.dirY;

/**
 * Un paso lógico de patrulla o persecución. No crea objetos: se llama en cada paso del bucle. Al ver a la heroína
 * (dentro de `vista`), se queda quieto `pausa` segundos antes de perseguirla (el «¡!»); `cambio` cuenta si la vio o
 * la perdió. Si la vio delante, la mira ya; si la notó por detrás, no se gira hasta lanzarse: tocarlo en esa pausa es
 * pillarlo por la espalda. Ya persiguiéndola, la sigue en redondo hasta perderla.
 */
export function actualizarPatrulla(
  p: Patrulla,
  mov: MovimientoMapaJson,
  heroeX: number,
  heroeY: number,
  dt: number,
  rejilla: Rejilla,
  tam: number,
  azar: () => number,
  pausa = 0,
  vista: Vista = EN_REDONDO,
): void {
  const c = p.cuerpo;
  p.xAnterior = c.x;
  p.yAnterior = c.y;
  p.cambio = 0;
  const antes = p.persiguiendo;
  const hx = heroeX - c.x;
  const hy = heroeY - c.y;
  const aHeroe = Math.hypot(hx, hy);
  const delante =
    aHeroe === 0 || (miraX(p, mov) * hx + miraY(p, mov) * hy) / aHeroe >= vista.cosMitad;
  if (aHeroe < mov.vision && (antes || delante || aHeroe < vista.cerca)) p.persiguiendo = true;
  else if (aHeroe > mov.vision * OLVIDO) p.persiguiendo = false;
  if (!antes && p.persiguiendo) {
    p.cambio = 1;
    p.alerta = pausa;
    if (aHeroe > 0 && delante) {
      p.dirX = hx / aHeroe;
      p.dirY = hy / aHeroe;
      if (hx !== 0) p.lado = hx > 0 ? 1 : -1;
    }
  } else if (antes && !p.persiguiendo) {
    p.cambio = -1;
    p.alerta = 0;
  }
  if (p.persiguiendo && p.alerta > 0) {
    p.alerta -= dt;
    return;
  }

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
    if (Math.abs(movidoX) >= movido * DE_LADO) p.lado = movidoX > 0 ? 1 : -1;
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
