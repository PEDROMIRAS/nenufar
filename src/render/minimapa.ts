import { niebla } from '../core/minimapa';
import { E, S, type SalaZona, type Zona } from '../core/zona';

// Medidas en píxeles lógicos: una sala de 15×11 tiles se ve como un rectángulo de 8×6.
const ANCHO_SALA = 8;
const ALTO_SALA = 6;
const HUECO = 3;
const BORDE = 3;
const COLOR = {
  fondo: 'rgba(8, 14, 10, 0.6)',
  visitada: '#cfe3c8',
  actual: '#ffd27a',
  contorno: '#8fa88a',
  cofre: '#e2a33a',
  cofreAbierto: '#6f7a6c',
};

/** Pinta el minimapa entero; se rehace al cambiar de sala y se copia tal cual en cada fotograma. */
export function pintarMinimapa(
  zona: Zona,
  visitadas: ReadonlySet<SalaZona>,
  actual: SalaZona,
  rejilla: number,
  /** Salas del tesoro cuyo cofre ya se abrió (su punto sale gris). */
  abiertos: ReadonlySet<SalaZona>,
): HTMLCanvasElement {
  const pasoX = ANCHO_SALA + HUECO;
  const pasoY = ALTO_SALA + HUECO;
  const lienzo = document.createElement('canvas');
  lienzo.width = rejilla * pasoX - HUECO + 2 * BORDE;
  lienzo.height = rejilla * pasoY - HUECO + 2 * BORDE;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('El navegador no soporta Canvas 2D');
  ctx.fillStyle = COLOR.fondo;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  const estado = new Map(zona.salas.map((s) => [s, niebla(zona, visitadas, s)]));
  const visible = (x: number, y: number): boolean => {
    const v = zona.salas.find((o) => o.x === x && o.y === y);
    return v !== undefined && estado.get(v) !== 'oculta';
  };
  for (const s of zona.salas) {
    const e = estado.get(s);
    if (e === 'oculta') continue;
    const x = BORDE + s.x * pasoX;
    const y = BORDE + s.y * pasoY;
    if (e === 'contorno') {
      // Marco de 1 px: rectángulo lleno y su interior devuelto al fondo, sin trazos que se emborronen.
      ctx.fillStyle = COLOR.contorno;
      ctx.fillRect(x, y, ANCHO_SALA, ALTO_SALA);
      ctx.clearRect(x + 1, y + 1, ANCHO_SALA - 2, ALTO_SALA - 2);
      ctx.fillStyle = COLOR.fondo;
      ctx.fillRect(x + 1, y + 1, ANCHO_SALA - 2, ALTO_SALA - 2);
    } else {
      ctx.fillStyle = s === actual ? COLOR.actual : COLOR.visitada;
      ctx.fillRect(x, y, ANCHO_SALA, ALTO_SALA);
    }
    // Sala del tesoro a la vista: un punto en el centro, amarillo con el cofre cerrado y gris abierto.
    if (s.tipo === 'tesoro') {
      ctx.fillStyle = abiertos.has(s) ? COLOR.cofreAbierto : COLOR.cofre;
      ctx.fillRect(x + ANCHO_SALA / 2 - 1, y + ALTO_SALA / 2 - 1, 2, 2);
    }
    // Puertas al este y al sur (las del oeste y el norte las pinta la vecina). En un árbol, dos salas
    // visibles unidas por una puerta incluyen siempre una visitada: no se revela nada de más.
    ctx.fillStyle = COLOR.visitada;
    if (s.puertas & E && visible(s.x + 1, s.y)) {
      ctx.fillRect(x + ANCHO_SALA, y + ALTO_SALA / 2 - 1, HUECO, 2);
    }
    if (s.puertas & S && visible(s.x, s.y + 1)) {
      ctx.fillRect(x + ANCHO_SALA / 2 - 1, y + ALTO_SALA, 2, HUECO);
    }
  }
  return lienzo;
}
