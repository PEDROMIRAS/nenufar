/** Cómo acabó una partida, para la pantalla final y los récords. */
export interface Resumen {
  victoria: boolean;
  heroina: string;
  nivel: number;
  zona: string;
  vencidos: number;
  segundos: number;
}

/** Récords guardados en localStorage. */
export interface Records {
  partidas: number;
  victorias: number;
  /** Partida ganada más rápida, en segundos. */
  mejorTiempo: number | null;
  nivelMaximo: number;
}

export const RECORDS_VACIOS: Records = {
  partidas: 0,
  victorias: 0,
  mejorTiempo: null,
  nivelMaximo: 0,
};

export function actualizarRecords(r: Records, s: Resumen): Records {
  return {
    partidas: r.partidas + 1,
    victorias: r.victorias + (s.victoria ? 1 : 0),
    mejorTiempo:
      s.victoria && (r.mejorTiempo === null || s.segundos < r.mejorTiempo)
        ? s.segundos
        : r.mejorTiempo,
    nivelMaximo: Math.max(r.nivelMaximo, s.nivel),
  };
}

/** Lee los récords guardados; si faltan o están dañados (otra versión, edición a mano…), empieza de cero. */
export function leerRecords(texto: string | null): Records {
  try {
    const d = JSON.parse(texto ?? 'null') as Partial<Records> | null;
    const entero = (v: unknown): number =>
      Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0;
    return {
      partidas: entero(d?.partidas),
      victorias: entero(d?.victorias),
      mejorTiempo: typeof d?.mejorTiempo === 'number' && d.mejorTiempo > 0 ? d.mejorTiempo : null,
      nivelMaximo: entero(d?.nivelMaximo),
    };
  } catch {
    return { ...RECORDS_VACIOS };
  }
}

/** 754 → «12:34». */
export function formatearTiempo(segundos: number): string {
  const s = Math.floor(segundos);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
