/** Cámara del combate: durante un ataque, la escena se acerca un poco a quien ataca y a quien recibe. */
export interface CamaraCombateJson {
  /** Cuánto se acerca como mucho (0,1 = un 10 % más grande). */
  zoom: number;
  /** Segundos en llegar, que sigue cerca tras el golpe y en volver. */
  entrada: number;
  mantener: number;
  salida: number;
  /** En un golpe fuerte (crítico, cargado o en un combate contra un jefe), el zoom se multiplica por esto. */
  fuerte?: number;
}

/** Cómo está la cámara: cuánto se acerca (1 = nada) y alrededor de qué punto de la escena. */
export interface Encuadre {
  zoom: number;
  x: number;
  y: number;
}

/** Una franja vertical de la escena: de `arriba` a `abajo`, en píxeles lógicos. */
export interface Franja {
  arriba: number;
  abajo: number;
}

const suave = (x: number): number => x * x * (3 - 2 * x);

/** Lo más que se acerca la cámara en un ataque (con `fuerte`, más). Sin zoom en los datos, 1. */
export function zoomMaximo(d: CamaraCombateJson, fuerte = false): number {
  if (!(d.zoom > 0)) return 1;
  return 1 + d.zoom * (fuerte ? (d.fuerte ?? 1) : 1);
}

/**
 * Encuadre de `zoom` alrededor de (x, y) sin que `contenido` (de los nombres de los enemigos a los pies de la
 * heroína) se salga de `marco` (entre la barra de turnos y el panel). Si no cabe, se acerca lo justo para que quepa;
 * la y se mueve lo menos posible y la x no se toca. Escribe en `salida` y la devuelve (sin asignar memoria).
 */
export function encuadrar(
  zoom: number,
  x: number,
  y: number,
  contenido: Franja,
  marco: Franja,
  salida: Encuadre,
): Encuadre {
  const alto = contenido.abajo - contenido.arriba;
  const cabe = alto > 0 ? (marco.abajo - marco.arriba) / alto : zoom;
  const z = Math.max(1, Math.min(zoom, cabe));
  salida.zoom = z;
  salida.x = x;
  salida.y = y;
  if (z === 1) return salida;
  // Con el zoom z alrededor de y, un punto p acaba en z·p − (z − 1)·y: estos son los límites de y para que
  // lo de arriba no suba del marco ni lo de abajo baje de él.
  const minimo = (z * contenido.abajo - marco.abajo) / (z - 1);
  const maximo = (z * contenido.arriba - marco.arriba) / (z - 1);
  salida.y = minimo > maximo ? (minimo + maximo) / 2 : Math.min(maximo, Math.max(minimo, y));
  return salida;
}

/**
 * Cámara a los `t` segundos de empezar un ataque cuyo golpe llega a los `golpe` segundos: va de `desde` (como
 * estaba la cámara al empezar, quizá aún cerca del ataque anterior) a `objetivo` con suavidad, se queda hasta un
 * rato después del golpe y vuelve a 1 alrededor del mismo punto. Antes de empezar o sin zoom en los datos, 1.
 * Escribe en `salida` y la devuelve.
 */
export function camaraAtaque(
  t: number,
  golpe: number,
  d: CamaraCombateJson,
  desde: Encuadre,
  objetivo: Encuadre,
  salida: Encuadre,
): Encuadre {
  salida.x = objetivo.x;
  salida.y = objetivo.y;
  if (!(t >= 0) || !(d.zoom > 0)) {
    salida.zoom = 1;
    return salida;
  }
  if (t < d.entrada) {
    const s = suave(t / d.entrada);
    salida.zoom = desde.zoom + (objetivo.zoom - desde.zoom) * s;
    // Sin acercamiento, el punto de antes no se ve: se empieza ya en el nuevo, sin desplazarse. Si no, se pasa de
    // un encuadre al otro mezclando su desplazamiento, (zoom − 1) · punto, y no el punto: así cada punto de la
    // escena va en línea recta de donde estaba a donde acaba y nada se sale del marco por el camino.
    const z = salida.zoom;
    if (desde.zoom > 1 && z > 1) {
      const dx = (desde.zoom - 1) * desde.x;
      const dy = (desde.zoom - 1) * desde.y;
      salida.x = (dx + ((objetivo.zoom - 1) * objetivo.x - dx) * s) / (z - 1);
      salida.y = (dy + ((objetivo.zoom - 1) * objetivo.y - dy) * s) / (z - 1);
    }
    return salida;
  }
  const fin = Math.max(golpe, d.entrada) + d.mantener;
  let f = 0;
  if (t < fin) f = 1;
  else if (t < fin + d.salida) f = 1 - suave((t - fin) / d.salida);
  salida.zoom = 1 + (objetivo.zoom - 1) * f;
  return salida;
}
