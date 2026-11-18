// Señales del mapa: cuándo crece y se desvanece el «¡!» (o el «?») sobre un monstruo, y cuándo pisa la heroína.
// Lógica pura; los números salen de src/data/mapa_vivo.json.

export interface SignoJson {
  /** Segundos que se ve el signo. */
  duracion: number;
  /** Segundos en que pasa de `crecer` a su tamaño. */
  aparicion: number;
  /** Tamaño con que aparece, respecto al suyo. */
  crecer: number;
  sonido: string | null;
}

export interface MapaVivoJson {
  alerta: SignoJson & { pausa: number };
  perdido: SignoJson;
  pasos: { pisadas: number[]; corriendo: number };
  polvo: { cada: number; vida: number; cantidad: number; colores: Record<string, string> };
}

/** Segundos del final en que el signo se desvanece. */
const DESVANECER = 0.25;

/** Tamaño del signo `t` segundos después de salir: algo mayor al principio y se asienta sin rebote. */
export function escalaSigno(t: number, s: SignoJson, sinCrecer: boolean): number {
  if (sinCrecer || t >= s.aparicion) return 1;
  const p = Math.max(0, t / s.aparicion);
  const asentado = 1 - (1 - p) * (1 - p);
  return s.crecer + (1 - s.crecer) * asentado;
}

/** Opacidad del signo: entero hasta el último cuarto de segundo, que se desvanece. */
export function opacidadSigno(t: number, s: SignoJson): number {
  if (t >= s.duracion) return 0;
  return Math.min(1, (s.duracion - t) / DESVANECER);
}

/**
 * Si al pasar el tiempo de la animación de andar de `antes` a `ahora` se ha entrado en un fotograma de pisada
 * (aunque se salten varios de golpe). Si la animación se reinició (`ahora` < `antes`: echa a andar desde parado),
 * cuenta desde el fotograma 0, así que el primer paso también suena.
 */
export function pisada(
  antes: number,
  ahora: number,
  fps: number,
  frames: number,
  pisadas: readonly number[],
): boolean {
  const desde = ahora < antes ? -1 : Math.floor(antes * fps);
  const hasta = Math.floor(ahora * fps);
  for (let f = desde + 1; f <= hasta; f++) if (pisadas.includes(f % frames)) return true;
  return false;
}
