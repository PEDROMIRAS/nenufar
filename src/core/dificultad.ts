import type { DificultadJson, MonstruoJson, ReglasCombate } from './types';

/**
 * Copia del monstruo con la dificultad aplicada: ataque y magia por `ataque`, PV por `vida`. Los
 * jefes violetas, además, por `violetas`: un combate suelto apenas nota la recuperación entre
 * combates, que es lo que más cambia de una dificultad a otra.
 */
export function monstruoCon(m: MonstruoJson, d: DificultadJson): MonstruoJson {
  const e = m.estadisticas;
  const extra = m.jefe && m.oculto ? d.violetas : 1;
  return {
    ...m,
    estadisticas: {
      ...e,
      ataque: Math.round(e.ataque * d.ataque * extra),
      magia: Math.round(e.magia * d.ataque * extra),
      pv: Math.round(e.pv * d.vida * extra),
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
