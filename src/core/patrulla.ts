import { casillaDe, centroX, centroY, DIRECTO, haciaDonde, hayVista } from './camino';
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
  /**
   * Persiguiéndola, por dónde va: `DIRECTO` a ella, una casilla del camino (su centro en `pasoX`, `pasoY`) o
   * `SIN_CAMINO` (en línea recta). Se piensa de nuevo cada `REPENSAR` segundos (`repensar` cuenta atrás), cuando ella
   * cambia de casilla (`casillaHeroe`) o al llegar al paso.
   */
  ruta: number;
  /** Dónde la vio por última vez y segundos que lleva sin verla (escondida tras un muro), persiguiéndola. */
  vistaX: number;
  vistaY: number;
  sinVer: number;
  pasoX: number;
  pasoY: number;
  repensar: number;
  casillaHeroe: number;
  /** Segundos que le quedan quieto tras ver a la heroína (el «¡!»), antes de lanzarse. */
  alerta: number;
  /** Qué pasó en el último paso: 1 = acaba de verla, −1 = acaba de perderla, 0 = nada. */
  cambio: -1 | 0 | 1;
}

/** Qué parte de alrededor ve un monstruo: el coseno de medio ángulo de su cono y a cuántos píxeles nota en redondo. */
export interface Vista {
  cosMitad: number;
  cerca: number;
  /** Segundos que la sigue buscando sin verla (escondida tras un muro) antes de perderla. */
  olvido: number;
}

/** Vista en todas direcciones (como el ermitaño, que no ve, y como era antes del cono). */
const EN_REDONDO: Vista = { cosMitad: -2, cerca: 0, olvido: Infinity };

/** La vista de `angulo` grados delante y `cerca` píxeles en redondo (`vista` de mapa_vivo.json). */
export const vistaDe = (v: { angulo: number; cerca: number; olvido?: number }): Vista => ({
  cosMitad: Math.cos((v.angulo * Math.PI) / 360),
  cerca: v.cerca,
  olvido: v.olvido ?? Infinity,
});

/** La persecución se abandona cuando la heroína se aleja más que la visión × este factor. */
const OLVIDO = 1.5;
/** Un monstruo `deLado` cambia de lado solo si se mueve al menos así de lado (fracción de lo que anduvo). */
const DE_LADO = 0.25;
/** Segundos entre dos búsquedas de camino mientras persigue (si ella no cambia de casilla ni llega al paso). */
const REPENSAR = 0.25;
/** Altura de los ojos sobre los pies (la de la heroína, para mirarla), en píxeles. */
const OJOS = 6;
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
    ruta: DIRECTO,
    vistaX: cuerpo.x,
    vistaY: cuerpo.y,
    sinVer: 0,
    pasoX: cuerpo.x,
    pasoY: cuerpo.y,
    repensar: 0,
    casillaHeroe: -1,
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
  // Nada opaco en medio (muros, objetos altos): a través del agua o de una roca baja sí la ve.
  const ve =
    aHeroe < mov.vision * OLVIDO &&
    hayVista(rejilla, tam, c.x, c.y - c.alto / 2, heroeX, heroeY - OJOS);
  if (aHeroe < mov.vision && ve && (antes || delante || aHeroe < vista.cerca))
    p.persiguiendo = true;
  else if (aHeroe > mov.vision * OLVIDO) p.persiguiendo = false;
  if (p.persiguiendo && ve) {
    p.vistaX = heroeX;
    p.vistaY = heroeY;
    p.sinVer = 0;
  } else if (p.persiguiendo && antes) {
    // Escondida: va a donde la vio por última vez; si llega o pasa el olvido sin verla, la pierde.
    p.sinVer += dt;
    const llego = Math.hypot(p.vistaX - c.x, p.vistaY - c.y) <= LLEGADA * 4;
    if (p.sinVer >= vista.olvido || llego) p.persiguiendo = false;
  }
  if (!antes && p.persiguiendo) {
    p.cambio = 1;
    p.alerta = pausa;
    p.repensar = 0;
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

  // A por ella si la ve; si no, a donde la vio por última vez.
  const objX = ve ? heroeX : p.vistaX;
  const objY = ve ? heroeY : p.vistaY;
  let tx = objX;
  let ty = objY;
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
  } else {
    // Rodea lo que haya en medio en vez de quedarse pegado: va al paso del camino que toque.
    const casilla = casillaDe(rejilla, tam, objX, objY, 2);
    p.repensar -= dt;
    const enPaso = p.ruta >= 0 && Math.hypot(p.pasoX - c.x, p.pasoY - c.y) <= LLEGADA;
    if (p.repensar <= 0 || casilla !== p.casillaHeroe || enPaso) {
      p.repensar = REPENSAR;
      p.casillaHeroe = casilla;
      p.ruta = haciaDonde(rejilla, tam, c, objX, objY);
      if (p.ruta >= 0) {
        p.pasoX = centroX(rejilla, tam, p.ruta);
        p.pasoY = centroY(rejilla, tam, p.ruta, c.alto);
      }
    }
    if (p.ruta >= 0) {
      tx = p.pasoX;
      ty = p.pasoY;
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
