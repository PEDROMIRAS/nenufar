/**
 * Los últimos mensajes del combate, que se ven arriba: el más nuevo claro, los anteriores cada vez más tenues, y se
 * apagan todos un rato después del último (si llega otro, vuelven a encenderse).
 */

/** Ritmo de los mensajes (src/data/ritmo.json → `mensajes`). */
export interface RitmoMensajes {
  /** Cuántos se guardan y se ven. */
  cuantos: number;
  /** Segundos que se ven tras llegar el último, y lo que tardan en apagarse después. */
  duran: number;
  apagar: number;
  /** Opacidad de cada uno según lo reciente que es: el último, el anterior… */
  tenues: number[];
}

/** Los mensajes, del más viejo al más nuevo, y el momento (en segundos de combate) en que llegó cada uno. */
export interface MensajesCombate {
  textos: string[];
  desde: number[];
}

export const crearMensajes = (): MensajesCombate => ({ textos: [], desde: [] });

/** Apunta un mensaje que llega en `ahora`; si pasan de `cuantos`, se olvida el más viejo. */
export function apuntarMensaje(
  m: MensajesCombate,
  texto: string,
  ahora: number,
  cuantos: number,
): void {
  m.textos.push(texto);
  m.desde.push(ahora);
  while (m.textos.length > cuantos) {
    m.textos.shift();
    m.desde.shift();
  }
}

/**
 * Desde qué mensaje se dibujan, del más viejo al más nuevo, para que quepan enteros en `max` líneas (`lineas[i]` es
 * lo que ocupa cada uno): uno que no cabe entero no sale (si no, se veía la cola de una frase). El último sale
 * siempre.
 */
export function mensajesQueCaben(lineas: readonly number[], max: number): number {
  let i = lineas.length - 1;
  let usadas = lineas[i] ?? 0;
  while (i > 0 && usadas + (lineas[i - 1] ?? 0) <= max) {
    i--;
    usadas += lineas[i] ?? 0;
  }
  return Math.max(0, i);
}

/** Opacidad (0 a 1) del mensaje `i` en `ahora`. */
export function opacidadMensaje(
  m: MensajesCombate,
  i: number,
  ahora: number,
  r: RitmoMensajes,
): number {
  const n = m.textos.length;
  if (i < 0 || i >= n) return 0;
  const base = r.tenues[Math.min(n - 1 - i, r.tenues.length - 1)] ?? 0;
  const ultimo = m.desde[n - 1] ?? 0;
  const pasado = ahora - ultimo - r.duran;
  if (pasado <= 0) return base;
  if (pasado >= r.apagar) return 0;
  return base * (1 - pasado / r.apagar);
}
