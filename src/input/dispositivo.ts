/** Con qué se jugó por última vez: el dibujo elige con esto los textos de ayuda. */
export type Dispositivo = 'teclado' | 'tactil' | 'mando';

let actual: Dispositivo = 'teclado';
let fijo = false;

export function dispositivo(): Dispositivo {
  return actual;
}

/** Lo llaman las fuentes de entrada cuando se usan de verdad. */
export function usarDispositivo(d: Dispositivo): void {
  if (!fijo) actual = d;
}

/** Deja el dispositivo puesto aunque se use otro (atajo `?mando` de desarrollo, para ver sus textos). */
export function fijarDispositivo(d: Dispositivo): void {
  actual = d;
  fijo = true;
}
