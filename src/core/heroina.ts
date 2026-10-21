import type { Acciones } from './acciones';
import { moverCuerpo, type Cuerpo, type Rejilla } from './movimiento';
import type { Direccion, HeroeJson } from './types';

export interface Heroina {
  cuerpo: Cuerpo;
  /** Posición en el paso anterior, para interpolar el dibujado. */
  xAnterior: number;
  yAnterior: number;
  direccion: Direccion;
  animacion: 'idle' | 'walk';
  /** Segundos desde que empezó la animación actual. */
  tiempoAnimacion: number;
  velocidad: number;
  carrera: number;
  /** El botón de correr del móvil la deja corriendo hasta que se vuelve a tocar (también al cambiar de zona). */
  correrFijo: boolean;
  margenEsquina: number;
}

export function crearHeroina(datos: HeroeJson, x: number, y: number): Heroina {
  return {
    cuerpo: { x, y, ancho: datos.caja.ancho, alto: datos.caja.alto },
    xAnterior: x,
    yAnterior: y,
    direccion: 'down',
    animacion: 'idle',
    tiempoAnimacion: 0,
    velocidad: datos.velocidad,
    carrera: datos.carrera,
    correrFijo: false,
    margenEsquina: datos.margenEsquina,
  };
}

export function actualizarHeroina(
  h: Heroina,
  acciones: Acciones,
  dt: number,
  rejilla: Rejilla,
  tam: number,
  corriendo = false,
): void {
  h.xAnterior = h.cuerpo.x;
  h.yAnterior = h.cuerpo.y;
  const ritmo = corriendo ? h.carrera : 1;
  const paso = h.velocidad * ritmo * dt;
  moverCuerpo(
    h.cuerpo,
    acciones.moverX * paso,
    acciones.moverY * paso,
    rejilla,
    tam,
    h.margenEsquina,
  );

  const animacion = acciones.moverX !== 0 || acciones.moverY !== 0 ? 'walk' : 'idle';
  if (animacion === h.animacion) {
    // Corriendo, las piernas también van más deprisa.
    h.tiempoAnimacion += dt * ritmo;
  } else {
    h.animacion = animacion;
    h.tiempoAnimacion = 0;
  }
  h.direccion = mirar(h.direccion, acciones.moverX, acciones.moverY);
}

/** En diagonal conserva la dirección si ya es una de las dos; si no, mira en horizontal. */
function mirar(actual: Direccion, x: number, y: number): Direccion {
  const horizontal = x > 0 ? 'right' : x < 0 ? 'left' : null;
  const vertical = y > 0 ? 'down' : y < 0 ? 'up' : null;
  if (horizontal && vertical) {
    return actual === horizontal || actual === vertical ? actual : horizontal;
  }
  return horizontal ?? vertical ?? actual;
}
