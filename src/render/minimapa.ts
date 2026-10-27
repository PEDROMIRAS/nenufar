import { niebla } from '../core/minimapa';
import { E, S, type SalaZona, type Zona } from '../core/zona';
import { PALETA } from './marco';

// Medidas en píxeles lógicos: una sala de 15×11 tiles se ve como un rectángulo de 12×8 (antes 8×6:
// los probadores lo veían demasiado pequeño y no lo miraban). Medidas pares: puertas y puntos centrados.
const ANCHO_SALA = 12;
const ALTO_SALA = 8;
const HUECO = 4;
const BORDE = 3;
/** Lado del punto del tesoro, la fuente o el jefe. */
const LADO_PUNTO = 4;
const COLOR = {
  fondo: 'rgba(9, 7, 18, 0.7)',
  visitada: PALETA.filete,
  actual: PALETA.elegida,
  contorno: PALETA.claro,
  /** Punto de lo que tiene la sala: el cofre, la fuente o el jefe; gris cuando ya está hecho. */
  tesoro: '#e2a33a',
  descanso: '#5aa8e8',
  jefe: '#d8584a',
  /** Violeta claro, distinto del morado del portal y del fuego. */
  violeta: '#b07cff',
  hecha: '#6f7a6c',
};
const PUNTO: Partial<Record<SalaZona['tipo'], string>> = {
  tesoro: COLOR.tesoro,
  descanso: COLOR.descanso,
  jefe: COLOR.jefe,
  violeta: COLOR.violeta,
};

/** Pinta el minimapa entero; se rehace al cambiar de sala y se copia tal cual en cada fotograma. */
export function pintarMinimapa(
  zona: Zona,
  visitadas: ReadonlySet<SalaZona>,
  actual: SalaZona,
  rejilla: number,
  /** Salas con el cofre abierto, la fuente usada o el jefe vencido (su punto sale gris). */
  hechas: ReadonlySet<SalaZona>,
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
  // Lo que se ve, centrado en el panel: en su sitio de la rejilla quedaba pegado a un borde.
  const vistas = zona.salas.filter((s) => estado.get(s) !== 'oculta');
  const minX = Math.min(...vistas.map((s) => s.x));
  const maxX = Math.max(...vistas.map((s) => s.x));
  const minY = Math.min(...vistas.map((s) => s.y));
  const maxY = Math.max(...vistas.map((s) => s.y));
  const desdeX = BORDE + Math.round(((rejilla - 1 - maxX - minX) * pasoX) / 2);
  const desdeY = BORDE + Math.round(((rejilla - 1 - maxY - minY) * pasoY) / 2);
  for (const s of vistas) {
    const e = estado.get(s);
    const x = desdeX + s.x * pasoX;
    const y = desdeY + s.y * pasoY;
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
    // Tesoro, fuente, jefe o sala violeta a la vista: un punto en el centro de su color, gris cuando ya está hecho.
    const punto = PUNTO[s.tipo];
    if (punto) {
      ctx.fillStyle = hechas.has(s) ? COLOR.hecha : punto;
      const m = LADO_PUNTO / 2;
      ctx.fillRect(x + ANCHO_SALA / 2 - m, y + ALTO_SALA / 2 - m, LADO_PUNTO, LADO_PUNTO);
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
