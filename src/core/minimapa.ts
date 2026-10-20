import { salaVecina } from './mapa';
import { E, N, O, S, type SalaZona, type Zona } from './zona';

export type Niebla = 'visitada' | 'contorno' | 'oculta';

const LADOS = [N, E, S, O];

/** Qué muestra el minimapa de una sala: las visitadas enteras y las que tienen puerta a una visitada, solo el contorno. */
export function niebla(zona: Zona, visitadas: ReadonlySet<SalaZona>, sala: SalaZona): Niebla {
  if (visitadas.has(sala)) return 'visitada';
  for (const lado of LADOS) {
    if (!(sala.puertas & lado)) continue;
    const vecina = salaVecina(zona, sala, lado);
    if (vecina && visitadas.has(vecina)) return 'contorno';
  }
  return 'oculta';
}
