/** Duración de un paso lógico en segundos (60 Hz). */
export const PASO = 1 / 60;

// Tope por fotograma: al volver de una pestaña en segundo plano no se simulan minutos de golpe.
const MAX_DELTA = 0.25;

export interface Reloj {
  acumulado: number;
}

export function crearReloj(): Reloj {
  return { acumulado: 0 };
}

/** Suma `delta` segundos de tiempo real y devuelve cuántos pasos lógicos hay que ejecutar ahora. */
export function avanzar(reloj: Reloj, delta: number): number {
  reloj.acumulado += Math.min(Math.max(delta, 0), MAX_DELTA);
  const pasos = Math.floor(reloj.acumulado / PASO);
  reloj.acumulado -= pasos * PASO;
  return pasos;
}

/** Fracción ya transcurrida del siguiente paso (0..1), para interpolar el dibujado. */
export function alpha(reloj: Reloj): number {
  return reloj.acumulado / PASO;
}
