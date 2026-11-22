import { colisiona, type Cuerpo, type Rejilla } from './movimiento';

/**
 * Camino por las casillas de la sala para que un monstruo que persigue a la heroína rodee árboles, columnas y agua en
 * vez de quedarse pegado a ellos. Búsqueda en anchura desde la casilla de la heroína, en cuatro direcciones (así no
 * corta esquinas), y de ese camino, la casilla más lejana a la que se llega en línea recta: el monstruo va derecho
 * hacia ella y no en zigzag de casilla en casilla.
 */

/** Ir derecho a la heroína: no hay nada en medio. */
export const DIRECTO = -1;
/** No hay camino por casillas (está en otra parte de la sala): se va en línea recta, como antes. */
export const SIN_CAMINO = -2;

/** Píxeles entre las pruebas de choque a lo largo de una recta. */
const MUESTRA = 4;

// Se reutilizan entre búsquedas: cero memoria nueva dentro del bucle (solo crecen la primera vez).
let distancias = new Int16Array(0);
let cola = new Int16Array(0);

/** ¿Llega la caja `c` en línea recta hasta tener los pies en (x, y) sin chocar con nada? */
export function enLineaRecta(r: Rejilla, tam: number, c: Cuerpo, x: number, y: number): boolean {
  const largo = Math.hypot(x - c.x, y - c.y);
  const pasos = Math.ceil(largo / MUESTRA);
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos;
    if (colisiona(r, tam, c.x + (x - c.x) * t, c.y + (y - c.y) * t, c.ancho, c.alto)) return false;
  }
  return true;
}

/** Casilla en la que está una caja con los pies en (x, y) y `alto` de alto: la del centro de la caja. */
export function casillaDe(r: Rejilla, tam: number, x: number, y: number, alto: number): number {
  const c = Math.min(r.ancho - 1, Math.max(0, Math.floor(x / tam)));
  const f = Math.min(r.alto - 1, Math.max(0, Math.floor((y - alto / 2) / tam)));
  return f * r.ancho + c;
}

/** Cuánto se busca a los lados y por encima de sus pies una casilla libre para la heroína, en píxeles. */
const HOLGURA_META = 8;

/**
 * La casilla a la que ir para alcanzarla: la de sus pies o, si en esa hay un objeto (choca solo con su base y ella
 * está a su lado), una libre de las que pisa. Si no, la de los pies: ir a su centro era ir contra el objeto.
 */
function casillaMeta(r: Rejilla, tam: number, hx: number, hy: number): number {
  const pies = casillaDe(r, tam, hx, hy, 2);
  if (!r.solido[pies]) return pies;
  for (const [dx, dy] of SONDEOS) {
    const i = casillaDe(r, tam, hx + dx * HOLGURA_META, hy + dy * HOLGURA_META, 2);
    if (!r.solido[i]) return i;
  }
  return pies;
}
const SONDEOS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
];

/** Distancia en pasos de cada casilla libre a `meta` (que cuenta como libre aunque no lo sea); −1 si no se llega. */
function buscar(r: Rejilla, meta: number): void {
  const n = r.ancho * r.alto;
  if (distancias.length < n) {
    distancias = new Int16Array(n);
    cola = new Int16Array(n);
  }
  distancias.fill(-1, 0, n);
  distancias[meta] = 0;
  cola[0] = meta;
  let leida = 0;
  let escrita = 1;
  while (leida < escrita) {
    const i = cola[leida++]!;
    const c = i % r.ancho;
    const d = distancias[i]! + 1;
    for (let k = 0; k < 4; k++) {
      const j = vecina(r, i, c, k);
      if (j < 0 || r.solido[j] || distancias[j] !== -1) continue;
      distancias[j] = d;
      cola[escrita++] = j;
    }
  }
}

/** La casilla vecina `k` (0 arriba, 1 derecha, 2 abajo, 3 izquierda) de `i`, que está en la columna `c`; −1 fuera. */
function vecina(r: Rejilla, i: number, c: number, k: number): number {
  if (k === 0) return i >= r.ancho ? i - r.ancho : -1;
  if (k === 1) return c < r.ancho - 1 ? i + 1 : -1;
  if (k === 2) return i + r.ancho < r.ancho * r.alto ? i + r.ancho : -1;
  return c > 0 ? i - 1 : -1;
}

/** La vecina de `i` más cerca de la meta (la de menor distancia conocida), o −1 si ninguna lleva a ella. */
function siguiente(r: Rejilla, i: number): number {
  const c = i % r.ancho;
  let mejor = -1;
  for (let k = 0; k < 4; k++) {
    const j = vecina(r, i, c, k);
    if (j < 0 || distancias[j]! < 0) continue;
    if (mejor < 0 || distancias[j]! < distancias[mejor]!) mejor = j;
  }
  return mejor;
}

/** Pies de una caja de `alto` de alto centrada en la casilla `i`. */
export const centroX = (r: Rejilla, tam: number, i: number): number =>
  (i % r.ancho) * tam + tam / 2;
export const centroY = (r: Rejilla, tam: number, i: number, alto: number): number =>
  Math.floor(i / r.ancho) * tam + (tam + alto) / 2;

/**
 * Hacia dónde ir para alcanzar a la heroína (pies en hx, hy): `DIRECTO` si se llega en línea recta; si no, la casilla
 * del camino más lejana a la que se llega en línea recta (su centro, con `centroX`/`centroY`); `SIN_CAMINO` si por
 * las casillas no se llega.
 */
export function haciaDonde(r: Rejilla, tam: number, c: Cuerpo, hx: number, hy: number): number {
  if (enLineaRecta(r, tam, c, hx, hy)) return DIRECTO;
  buscar(r, casillaMeta(r, tam, hx, hy));
  let i = casillaDe(r, tam, c.x, c.y, c.alto);
  // Pegado a un objeto, su casilla puede contar como sólida: sale por la vecina que lleva a ella.
  if (distancias[i]! < 0) i = siguiente(r, i);
  if (i < 0) return SIN_CAMINO;
  // Ya en su casilla: a por ella (el camino lo sacaría a una vecina y volvería, oscilando).
  if (distancias[i] === 0) return DIRECTO;
  let objetivo = -1;
  while (distancias[i]! > 0) {
    i = siguiente(r, i);
    if (i < 0) break;
    if (!enLineaRecta(r, tam, c, centroX(r, tam, i), centroY(r, tam, i, c.alto))) break;
    objetivo = i;
  }
  // Ni la primera casilla del camino se ve en línea recta (raro: rozando una esquina): se va a ella igualmente.
  if (objetivo < 0) {
    const primera = siguiente(r, casillaDe(r, tam, c.x, c.y, c.alto));
    return primera < 0 ? SIN_CAMINO : primera;
  }
  return objetivo;
}
