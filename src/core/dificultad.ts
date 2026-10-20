import type { DificultadJson, MonstruoJson, ReglasCombate } from './types';

/** Copia del monstruo con la dificultad aplicada: ataque y magia por `ataque`, PV por `vida`. */
export function monstruoCon(m: MonstruoJson, d: DificultadJson): MonstruoJson {
  const e = m.estadisticas;
  return {
    ...m,
    estadisticas: {
      ...e,
      ataque: Math.round(e.ataque * d.ataque),
      magia: Math.round(e.magia * d.ataque),
      pv: Math.round(e.pv * d.vida),
    },
  };
}

/** El bestiario entero con la dificultad aplicada (para invocaciones y transformaciones de jefes). */
export function bestiarioCon(
  bestiario: Readonly<Record<string, MonstruoJson>>,
  d: DificultadJson,
): Record<string, MonstruoJson> {
  return Object.fromEntries(Object.entries(bestiario).map(([k, m]) => [k, monstruoCon(m, d)]));
}

/** Las reglas de combate con la recuperación tras ganar ajustada a la dificultad. */
export function reglasCon(r: ReglasCombate, d: DificultadJson): ReglasCombate {
  return { ...r, recuperacionTrasVictoria: r.recuperacionTrasVictoria * d.recuperacion };
}
