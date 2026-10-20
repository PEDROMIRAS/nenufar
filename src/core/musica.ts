/** Una nota de una voz: frecuencia en Hz, paso en el que empieza y cuántos pasos dura. */
export interface Nota {
  frecuencia: number;
  inicio: number;
  pasos: number;
}

const SEMITONO: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440 Hz; admite sostenidos ("F#3"). */
export function frecuencia(nota: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(nota);
  if (!m) throw new Error(`Nota no válida: ${nota}`);
  const midi = (Number(m[3]) + 1) * 12 + SEMITONO[m[1]!]! + (m[2] ? 1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Lee una voz como "E4 ~ G4 - A4": cada palabra es un paso; "~" alarga la nota anterior y "-" es silencio. */
export function leerVoz(texto: string): { notas: Nota[]; pasos: number } {
  const palabras = texto.trim().split(/\s+/);
  const notas: Nota[] = [];
  palabras.forEach((p, i) => {
    if (p === '-') return;
    if (p === '~') {
      const ultima = notas[notas.length - 1];
      if (ultima && ultima.inicio + ultima.pasos === i) ultima.pasos++;
      return;
    }
    notas.push({ frecuencia: frecuencia(p), inicio: i, pasos: 1 });
  });
  return { notas, pasos: palabras.length };
}
