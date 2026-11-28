import type { CopiaHoguera, PartidaGuardada } from './guardado';
import type { DificultadJson } from './types';

/**
 * La hoguera de la sala de descanso es el punto de control: encenderla guarda una copia de la partida y, al caer, se
 * vuelve a ella gastando una brasa. Las brasas por partida salen de la dificultad.
 */
export const brasasDe = (d: DificultadJson): number => d.brasas ?? 0;

/** Copia independiente de la partida para la hoguera: sin combate, junto a la fuente (sin lado) y sin hoguera dentro. */
export function copiaHoguera(g: PartidaGuardada): CopiaHoguera {
  const copia: CopiaHoguera & Partial<PartidaGuardada> = structuredClone(g);
  delete copia.brasas;
  delete copia.vueltas;
  delete copia.hoguera;
  copia.combate = null;
  copia.mapa.lado = null;
  return copia;
}

/** ¿Está encendida la hoguera de la zona `zona` (índice)? */
export const hogueraEn = (hoguera: CopiaHoguera | null | undefined, zona: number): boolean =>
  !!hoguera && hoguera.zona === zona;

/**
 * La partida con que se sigue al caer: la copia de la hoguera con una brasa menos, una vuelta más y el tiempo que ya
 * se llevaba (no se rebobina). La hoguera sigue encendida. Tampoco se rebobinan los combates (son el contador de los
 * dados: si no, cada vuelta repetiría las mismas tiradas) ni los objetos usados (los logros los cuentan). Null si no
 * hay hoguera o no quedan brasas.
 */
export function volverAHoguera(
  estado: {
    brasas: number;
    vueltas: number;
    hoguera: CopiaHoguera | null;
    combates: number;
    usados: number;
  },
  segundos: number,
): PartidaGuardada | null {
  const { brasas, vueltas, hoguera } = estado;
  if (!hoguera || brasas <= 0) return null;
  const vuelta: PartidaGuardada = {
    ...structuredClone(hoguera),
    segundos,
    combates: estado.combates,
    brasas: brasas - 1,
    vueltas: vueltas + 1,
    hoguera,
  };
  vuelta.inventario.usados = Math.max(vuelta.inventario.usados, estado.usados);
  return vuelta;
}

/** «Te queda 1 brasa», «Te quedan 2 brasas», «No te quedan brasas: si caes otra vez, es el final». */
export function textoBrasas(n: number): string {
  if (n === 0) return 'No te quedan brasas: si caes otra vez, es el final.';
  return n === 1 ? 'Te queda 1 brasa.' : `Te quedan ${n} brasas.`;
}
