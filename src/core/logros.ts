import type { Records, Resumen } from './records';
import type { MonstruoJson } from './types';

/** Un logro de logros.json: su clave elige la condición de CONDICIONES. */
export interface Logro {
  clave: string;
  nombre: string;
  descripcion: string;
}

/** Lo que no está en la partida ni en los récords: qué heroínas y qué monstruos existen. */
export interface Mundo {
  heroes: readonly string[];
  monstruos: readonly string[];
}

/** Monstruos que cuentan para el bestiario completo: los ocultos no, para que no se delaten. */
export const monstruosDelMundo = (monstruos: Readonly<Record<string, MonstruoJson>>): string[] =>
  Object.keys(monstruos).filter((k) => !monstruos[k]!.oculto);

/** Casillas de la rejilla del bestiario (3 filas de 6). */
export const CASILLAS_BESTIARIO = 18;

/**
 * Fichas del bestiario, en el orden de monstruos.json: los normales siempre (vencidos o no) y los
 * ocultos solo ya vencidos. Los ocultos que comparten nombre (los tres dragones negros, los tres
 * cofres trampa) van en una sola ficha, la del primero vencido.
 */
export function entradasBestiario(
  monstruos: Readonly<Record<string, MonstruoJson>>,
  vencidos: readonly string[],
): { clave: string; visto: boolean }[] {
  const ocultos = new Set<string>();
  return Object.entries(monstruos).flatMap(([clave, m]) => {
    const visto = vencidos.includes(clave);
    if (m.oculto && (!visto || ocultos.has(m.nombre))) return [];
    if (m.oculto) ocultos.add(m.nombre);
    return [{ clave, visto }];
  });
}

/** Condición de cada logro, con los récords ya actualizados con la partida. */
export const CONDICIONES: Record<string, (r: Records, s: Resumen, m: Mundo) => boolean> = {
  primera: (_r, s) => s.victoria,
  dos_ranas: (r, _s, m) => m.heroes.every((h) => r.ganadasCon.includes(h)),
  dificil: (_r, s) => s.victoria && s.dificultad === 'dificil',
  sin_objetos: (_r, s) => s.victoria && s.objetosUsados === 0,
  ciclo: (_r, s) => s.victoria && s.contraHeredada,
  bestiario: (r, _s, m) => m.monstruos.every((k) => r.bestiario.includes(k)),
};

/** Claves de los logros que esta partida consigue por primera vez, en el orden de `logros`. */
export function logrosNuevos(r: Records, s: Resumen, m: Mundo, logros: readonly Logro[]): string[] {
  return logros
    .filter((l) => !r.logros.includes(l.clave) && CONDICIONES[l.clave]?.(r, s, m))
    .map((l) => l.clave);
}
