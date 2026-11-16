/** Duración mínima y máxima del vídeo, en segundos (spec: entre 60 y 90). */
export const TOTAL_MIN = 60;
export const TOTAL_MAX = 90;

/**
 * Dónde empieza y cuánto dura cada plano: lo que dura su voz más un respiro. Manda la voz, no el guion, para
 * que ninguna frase se corte. Lanza un error si el total queda fuera de [60, 90] s.
 */
export function calcularTiempos(voces: readonly number[], respiro = 1): { inicio: number; duracion: number }[] {
  let inicio = 0;
  const tiempos = voces.map((voz) => {
    const plano = { inicio, duracion: voz + respiro };
    inicio += plano.duracion;
    return plano;
  });
  if (inicio < TOTAL_MIN || inicio > TOTAL_MAX)
    throw new Error(`El vídeo dura ${inicio.toFixed(1)} s y debe durar entre ${TOTAL_MIN} y ${TOTAL_MAX} s`);
  return tiempos;
}
