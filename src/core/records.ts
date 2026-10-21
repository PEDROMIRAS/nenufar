/** Cómo acabó una partida, para la pantalla final y los récords. */
export interface Resumen {
  victoria: boolean;
  heroina: string;
  nivel: number;
  zona: string;
  vencidos: number;
  segundos: number;
  /** Clave de dificultades.json con la que se jugó. */
  dificultad: string;
}

/** Lo que se guarda de cada dificultad. */
export interface RecordDificultad {
  victorias: number;
  /** Victoria más rápida en esa dificultad, en segundos. */
  mejorTiempo: number | null;
}

/** Récords guardados en localStorage. */
export interface Records {
  partidas: number;
  victorias: number;
  /** Partida ganada más rápida, en segundos. */
  mejorTiempo: number | null;
  nivelMaximo: number;
  /** Victorias y mejor tiempo de cada dificultad, por su clave (las anteriores a esto no cuentan aquí). */
  porDificultad: Record<string, RecordDificultad>;
}

export const RECORDS_VACIOS: Records = {
  partidas: 0,
  victorias: 0,
  mejorTiempo: null,
  nivelMaximo: 0,
  porDificultad: {},
};

const mejor = (actual: number | null, s: Resumen): number | null =>
  s.victoria && (actual === null || s.segundos < actual) ? s.segundos : actual;

export function actualizarRecords(r: Records, s: Resumen): Records {
  const d = r.porDificultad[s.dificultad] ?? { victorias: 0, mejorTiempo: null };
  return {
    partidas: r.partidas + 1,
    victorias: r.victorias + (s.victoria ? 1 : 0),
    mejorTiempo: mejor(r.mejorTiempo, s),
    nivelMaximo: Math.max(r.nivelMaximo, s.nivel),
    porDificultad: {
      ...r.porDificultad,
      [s.dificultad]: {
        victorias: d.victorias + (s.victoria ? 1 : 0),
        mejorTiempo: mejor(d.mejorTiempo, s),
      },
    },
  };
}

/** Lee los récords guardados; si faltan o están dañados (otra versión, edición a mano…), empieza de cero. */
export function leerRecords(texto: string | null): Records {
  try {
    const d = JSON.parse(texto ?? 'null') as Partial<Records> | null;
    const entero = (v: unknown): number =>
      Number.isInteger(v) && (v as number) >= 0 ? (v as number) : 0;
    const tiempo = (v: unknown): number | null => (typeof v === 'number' && v > 0 ? v : null);
    const porDificultad: Record<string, RecordDificultad> = {};
    for (const [clave, v] of Object.entries(d?.porDificultad ?? {})) {
      const x = v as Partial<RecordDificultad> | null;
      porDificultad[clave] = {
        victorias: entero(x?.victorias),
        mejorTiempo: tiempo(x?.mejorTiempo),
      };
    }
    return {
      partidas: entero(d?.partidas),
      victorias: entero(d?.victorias),
      mejorTiempo: tiempo(d?.mejorTiempo),
      nivelMaximo: entero(d?.nivelMaximo),
      porDificultad,
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

/** «Fácil 2 (12:34) · Normal 1 · Difícil 0»; vacío si aún no hay victorias con dificultad guardada. */
export function textoPorDificultad(r: Records, dificultades: readonly [string, string][]): string {
  if (!Object.values(r.porDificultad).some((d) => d.victorias > 0)) return '';
  return dificultades
    .map(([clave, nombre]) => {
      const d = r.porDificultad[clave];
      const tiempo = d?.mejorTiempo ? ` (${formatearTiempo(d.mejorTiempo)})` : '';
      return `${nombre} ${d?.victorias ?? 0}${tiempo}`;
    })
    .join(' · ');
}

/** ¿La partida bate el mejor tiempo de su dificultad (o es su primera victoria en ella)? */
export function esNuevoRecord(r: Records, s: Resumen): boolean {
  const antes = r.porDificultad[s.dificultad]?.mejorTiempo ?? null;
  return s.victoria && (antes === null || s.segundos < antes);
}
