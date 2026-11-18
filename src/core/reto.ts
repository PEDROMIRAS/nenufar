import { crearAzar } from './azar';
import type { SalaZona } from './zona';

/** Reto del día: un modo corto con la semilla de la fecha y un récord del día por rana. */

/** Fecha local (mes de 1 a 12). */
export interface Fecha {
  anio: number;
  mes: number;
  dia: number;
}

const dos = (n: number): string => String(n).padStart(2, '0');

/** «AAAA-MM-DD». */
export const textoFecha = (f: Fecha): string => `${f.anio}-${dos(f.mes)}-${dos(f.dia)}`;

/** La semilla de la partida del día: la misma fecha da el mismo mapa a todo el mundo. */
export function semillaDelDia(f: Fecha): number {
  return Math.floor(crearAzar(f.anio * 10000 + f.mes * 100 + f.dia)() * 2 ** 31) + 1;
}

/** Cómo acabó un intento: `sala` de `de` salas con monstruos (el jefe incluido). */
export interface ResultadoReto {
  victoria: boolean;
  segundos: number;
  sala: number;
  de: number;
}

/** ¿`a` es mejor que `b`? Una victoria gana a una derrota; entre victorias, menos tiempo; entre derrotas, más sala. */
export function mejorResultado(a: ResultadoReto, b: ResultadoReto | null): boolean {
  if (!b) return true;
  if (a.victoria !== b.victoria) return a.victoria;
  return a.victoria ? a.segundos < b.segundos : a.sala > b.sala;
}

const conMonstruos = (s: SalaZona): boolean => s.tipo === 'combate' || s.tipo === 'jefe';

/** Hasta qué sala con monstruos se llegó: las visitadas (índices en `salas`), como mínimo la primera. */
export function progresoReto(
  salas: readonly SalaZona[],
  visitadas: readonly number[],
): { sala: number; de: number } {
  const de = salas.filter(conMonstruos).length;
  const vistas = new Set(visitadas);
  const sala = salas.filter((s, i) => vistas.has(i) && conMonstruos(s)).length;
  return { sala: Math.max(1, sala), de };
}

/** Lo que se guarda del reto: el último día jugado, los mejores de ese día por rana y los días distintos. */
export interface EstadoReto {
  fecha: string;
  dias: number;
  mejores: Record<string, ResultadoReto>;
}

export const RETO_VACIO: EstadoReto = Object.freeze({
  fecha: '',
  dias: 0,
  mejores: Object.freeze({}) as Record<string, ResultadoReto>,
});

/**
 * Apunta un intento acabado: un día nuevo reinicia los mejores y suma un día jugado. Un intento de una fecha anterior a
 * la guardada (otra pestaña ya jugó el día siguiente) no se apunta. No muta `e`.
 */
export function anotarReto(
  e: EstadoReto,
  fecha: string,
  heroe: string,
  r: ResultadoReto,
): { estado: EstadoReto; nuevo: boolean } {
  // «AAAA-MM-DD» se ordena como texto.
  if (fecha < e.fecha) return { estado: e, nuevo: false };
  const otroDia = fecha !== e.fecha;
  const mejores = otroDia ? {} : { ...e.mejores };
  const nuevo = mejorResultado(r, mejores[heroe] ?? null);
  if (nuevo) mejores[heroe] = { ...r };
  return { estado: { fecha, dias: e.dias + (otroDia ? 1 : 0), mejores }, nuevo };
}

const numero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function resultado(v: unknown): ResultadoReto | null {
  const x = v as Partial<ResultadoReto> | null;
  if (!x || typeof x.victoria !== 'boolean') return null;
  if (!numero(x.segundos) || !numero(x.sala) || !numero(x.de)) return null;
  return { victoria: x.victoria, segundos: x.segundos, sala: x.sala, de: x.de };
}

/** Lee el reto guardado; lo que falte o esté dañado se descarta. */
export function leerReto(texto: string | null): EstadoReto {
  try {
    const d = JSON.parse(texto ?? 'null') as Partial<EstadoReto> | null;
    const mejores: Record<string, ResultadoReto> = {};
    for (const [clave, v] of Object.entries(d?.mejores ?? {})) {
      const r = resultado(v);
      // Una clave «__proto__» cambiaría el prototipo del objeto en vez de crear una clave.
      if (r && clave !== '__proto__') mejores[clave] = r;
    }
    return {
      fecha: typeof d?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? d.fecha : '',
      dias: Number.isInteger(d?.dias) && (d!.dias as number) >= 0 ? (d!.dias as number) : 0,
      mejores,
    };
  } catch {
    return { fecha: '', dias: 0, mejores: {} };
  }
}
