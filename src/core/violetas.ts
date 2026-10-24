import type { AjustesVioletas } from './types';

/** Toda partida tiene al menos una sala violeta: si no salió en las zonas anteriores, la última la saca seguro. */
export function modoVioleta(
  indice: number,
  total: number,
  violetasPrevias: number,
): 'quiza' | 'seguro' {
  return indice === total - 1 && violetasPrevias === 0 ? 'seguro' : 'quiza';
}

/** Clave del jefe de la sala violeta de una zona: a veces el dragón negro, pero como mucho uno por partida. */
export function jefeVioleta(
  zona: string,
  datos: { jefeVioleta: string },
  ajustes: AjustesVioletas,
  dragonUsado: boolean,
  azar: () => number,
): string {
  const dragon = ajustes.dragon[zona];
  return dragon && !dragonUsado && azar() < ajustes.probabilidadDragon ? dragon : datos.jefeVioleta;
}
