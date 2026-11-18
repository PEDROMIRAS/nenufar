/**
 * Opacidad de un cartel que lleva `t` segundos a la vista: sube en `fundido` segundos, se queda y baja en
 * otros `fundido` antes de `segundos`. Fuera de ese tiempo, 0. Con menos movimiento, sin fundido.
 */
export function opacidadCartel(
  t: number,
  d: { segundos: number; fundido: number },
  reducido: boolean,
): number {
  if (!(t >= 0 && t < d.segundos)) return 0;
  if (reducido || d.fundido <= 0) return 1;
  return Math.min(1, t / d.fundido, (d.segundos - t) / d.fundido);
}

/** Cuántas conexiones de mando se han avisado ya. Empieza en 0, no en la cuenta del arranque: así una
 * conexión ocurrida mientras cargaba la portada también sale. */
export interface EstadoCartel {
  avisadas: number;
}

export function crearEstadoCartel(): EstadoCartel {
  return { avisadas: 0 };
}

/** Cierto si la cuenta de conexiones trae alguna sin avisar (y la apunta como avisada). */
export function avisoNuevo(estado: EstadoCartel, conexiones: number): boolean {
  if (conexiones === estado.avisadas) return false;
  estado.avisadas = conexiones;
  return true;
}

/**
 * El tiempo del cartel cuando llega otro aviso igual: si no se ve, desde 0 (con su fundido de entrada); si ya se ve,
 * sin volver a fundir (como mucho, al final del fundido de entrada), así que dura otra vez lo de siempre sin
 * parpadear.
 */
export function reiniciarCartel(t: number, d: { segundos: number; fundido: number }): number {
  if (!(t >= 0 && t < d.segundos)) return 0;
  // En el fundido de salida, el punto de la entrada con la misma opacidad: sigue desde ahí, subiendo.
  if (t > d.segundos - d.fundido) return d.segundos - t;
  return Math.min(t, d.fundido);
}
