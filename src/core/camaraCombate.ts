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
export function zoomMaximo(d: CamaraCombateJson, fuerte = false, reducido = false): number {
  // Con «menos movimiento» del sistema, la cámara no se acerca (es lo que más marea).
  if (reducido || !(d.zoom > 0)) return 1;
  return 1 + d.zoom * (fuerte ? (d.fuerte ?? 1) : 1);
}

/** Una franja horizontal de la escena: de `izquierda` a `derecha`, en píxeles lógicos. */
export interface Lados {
  izquierda: number;
  derecha: number;
}

/**
 * Dónde poner el centro `p` de un acercamiento `z` en un eje para que lo que va de `a` a `b` quede entre `ma` y `mb`:
 * con el zoom z alrededor de p, un punto q acaba en z·q − (z − 1)·p. Se mueve p lo menos posible; si no hay sitio
 * (no debería, el zoom ya se ha limitado), el medio.
 */
function centrar(z: number, p: number, a: number, b: number, ma: number, mb: number): number {
  if (z === 1) return p;
  const minimo = (z * b - mb) / (z - 1);
  const maximo = (z * a - ma) / (z - 1);
  return minimo > maximo ? (minimo + maximo) / 2 : Math.min(maximo, Math.max(minimo, p));
}

/** Cuánto se puede acercar como mucho para que lo que mide `contenido` quepa en lo que mide `marco`. */
function cabe(contenido: number, marco: number, zoom: number): number {
  return contenido > 0 ? marco / contenido : zoom;
}

/**
 * Encuadre de `zoom` alrededor de (x, y) sin que `contenido` (de los nombres de los enemigos a los pies de la
 * heroína) se salga de `marco` (entre la barra de turnos y el panel) y, si se dan, sin que `lados` (lo más a la
 * izquierda y a la derecha que se dibuja) se salga de `marcoLados` (el ancho de la pantalla). Si no cabe, se acerca
 * lo justo para que quepa, y el punto se mueve lo menos posible. Escribe en `salida` y la devuelve (sin asignar
 * memoria).
 */
export function encuadrar(
  zoom: number,
  x: number,
  y: number,
  contenido: Franja,
  marco: Franja,
  salida: Encuadre,
  lados?: Lados,
  marcoLados?: Lados,
): Encuadre {
  let z = Math.min(
    zoom,
    cabe(contenido.abajo - contenido.arriba, marco.abajo - marco.arriba, zoom),
  );
  if (lados && marcoLados)
    z = Math.min(
      z,
      cabe(lados.derecha - lados.izquierda, marcoLados.derecha - marcoLados.izquierda, zoom),
    );
  z = Math.max(1, z);
  salida.zoom = z;
  salida.y = centrar(z, y, contenido.arriba, contenido.abajo, marco.arriba, marco.abajo);
  salida.x =
    lados && marcoLados
      ? centrar(z, x, lados.izquierda, lados.derecha, marcoLados.izquierda, marcoLados.derecha)
      : x;
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
