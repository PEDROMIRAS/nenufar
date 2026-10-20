import type { Sala } from './sala';

/** Caja de colisión anclada en los pies: (x, y) es el centro de su borde inferior. */
export interface Cuerpo {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export type Rejilla = Pick<Sala, 'ancho' | 'alto' | 'solido'> & Partial<Pick<Sala, 'cajas'>>;

/**
 * Borde de lo primero con que choca la caja con los pies en (x, y) en el sentido del movimiento
 * (en X: el lado izquierdo de lo que hay a la derecha si `sentido` > 0…), o NaN si no choca con nada.
 * Los muros chocan con la casilla entera; los objetos, con su base. Fuera del mapa cuenta como muro.
 */
function choque(
  rejilla: Rejilla,
  tam: number,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  enX: boolean,
  sentido: number,
): number {
  const izq = x - ancho / 2;
  const der = x + ancho / 2;
  const arr = y - alto;
  const c0 = Math.floor(izq / tam);
  const c1 = Math.ceil(der / tam) - 1;
  const f0 = Math.floor(arr / tam);
  const f1 = Math.ceil(y / tam) - 1;
  let borde = NaN;
  for (let f = f0; f <= f1; f++) {
    for (let c = c0; c <= c1; c++) {
      const fuera = c < 0 || f < 0 || c >= rejilla.ancho || f >= rejilla.alto;
      const i = f * rejilla.ancho + c;
      if (!fuera && !rejilla.solido[i]) continue;
      const caja = fuera ? null : (rejilla.cajas?.[i] ?? null);
      const bx0 = c * tam + (caja ? caja[0] : 0);
      const bx1 = c * tam + (caja ? caja[2] : tam);
      const by0 = f * tam + (caja ? caja[1] : 0);
      const by1 = f * tam + (caja ? caja[3] : tam);
      if (izq >= bx1 || der <= bx0 || arr >= by1 || y <= by0) continue;
      const b = enX ? (sentido > 0 ? bx0 : bx1) : sentido > 0 ? by0 : by1;
      if (Number.isNaN(borde) || (sentido > 0 ? b < borde : b > borde)) borde = b;
    }
  }
  return borde;
}

/** ¿La caja con los pies en (x, y) choca con algo? Fuera del mapa cuenta como sólido. */
export function colisiona(
  rejilla: Rejilla,
  tam: number,
  x: number,
  y: number,
  ancho: number,
  alto: number,
): boolean {
  return !Number.isNaN(choque(rejilla, tam, x, y, ancho, alto, true, 1));
}

/**
 * Mueve el cuerpo por eje (así se desliza a lo largo de los muros) y, si un eje choca de frente
 * casi alineado con un hueco, lo empuja de lado hacia el hueco para que no se enganche en la esquina.
 */
export function moverCuerpo(
  cuerpo: Cuerpo,
  dx: number,
  dy: number,
  rejilla: Rejilla,
  tam: number,
  margenEsquina: number,
): void {
  const chocaX = moverEje(cuerpo, true, dx, rejilla, tam);
  const chocaY = moverEje(cuerpo, false, dy, rejilla, tam);
  if (chocaX && dy === 0) esquivar(cuerpo, true, dx, rejilla, tam, margenEsquina);
  if (chocaY && dx === 0) esquivar(cuerpo, false, dy, rejilla, tam, margenEsquina);
}

/** Mueve en un eje; si choca, se queda pegado a lo que choca. Supone |paso| < tam. Devuelve si chocó. */
function moverEje(c: Cuerpo, enX: boolean, paso: number, rejilla: Rejilla, tam: number): boolean {
  if (paso === 0) return false;
  const nx = enX ? c.x + paso : c.x;
  const ny = enX ? c.y : c.y + paso;
  if (!colisiona(rejilla, tam, nx, ny, c.ancho, c.alto)) {
    c.x = nx;
    c.y = ny;
    return false;
  }
  // Se queda pegada al borde de lo que choca (sin retroceder si ya lo estaba tocando).
  const borde = choque(rejilla, tam, nx, ny, c.ancho, c.alto, enX, paso);
  if (enX) c.x = paso > 0 ? Math.max(c.x, borde - c.ancho / 2) : Math.min(c.x, borde + c.ancho / 2);
  else c.y = paso > 0 ? Math.max(c.y, borde) : Math.min(c.y, borde + c.alto);
  return true;
}

function esquivar(
  c: Cuerpo,
  enX: boolean,
  paso: number,
  rejilla: Rejilla,
  tam: number,
  margen: number,
): void {
  for (let k = 1; k <= margen; k++) {
    for (let lado = -1; lado <= 1; lado += 2) {
      const x = enX ? c.x + paso : c.x + lado * k;
      const y = enX ? c.y + lado * k : c.y + paso;
      if (!colisiona(rejilla, tam, x, y, c.ancho, c.alto)) {
        // Se desliza hacia el hueco a la misma velocidad, sin teletransportarse.
        moverEje(c, !enX, lado * Math.min(Math.abs(paso), k), rejilla, tam);
        return;
      }
    }
  }
}

/** Posición libre (pies en el centro de un tile) más cercana al centro de la sala. */
export function buscarInicio(
  rejilla: Rejilla,
  tam: number,
  ancho: number,
  alto: number,
): { x: number; y: number } {
  let mejor: { x: number; y: number } | null = null;
  let mejorDistancia = Infinity;
  for (let f = 0; f < rejilla.alto; f++) {
    for (let c = 0; c < rejilla.ancho; c++) {
      const x = c * tam + tam / 2;
      const y = f * tam + (tam + alto) / 2;
      const d = Math.hypot(c - (rejilla.ancho - 1) / 2, f - (rejilla.alto - 1) / 2);
      if (d < mejorDistancia && !colisiona(rejilla, tam, x, y, ancho, alto)) {
        mejor = { x, y };
        mejorDistancia = d;
      }
    }
  }
  if (!mejor) throw new Error('La sala no tiene ningún hueco libre');
  return mejor;
}
