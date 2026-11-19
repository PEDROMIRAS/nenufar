/** Las pantallas que pueden salir al acabar un combate ganado o huido, en su orden. */
export type PantallaTrasCombate = 'caida' | 'nivel' | 'puntos' | 'equipo';

/** Lo que hace quien llama en cada paso (en el juego, apilar escenas y guardar). */
export interface PasosTrasCombate {
  /** Mete en la mochila el equipo encontrado (antes de guardar, para que el guardado lo lleve). */
  guardarEquipo(): void;
  /** Avisa al mapa de que el combate acabó; el mapa lo apunta y la partida se guarda. */
  avisarMapa(): void;
  /** Enseña una pantalla; `seguir` pasa a la siguiente cuando se cierra. */
  ensenar(pantalla: PantallaTrasCombate, seguir: () => void): void;
}

/**
 * Lo que pasa al acabar un combate que no se perdió: primero el equipo a la mochila y el aviso al mapa (que guarda la
 * partida), y solo después las pantallas: la frase del jefe al caer (`caida`), la subida de nivel (`sube`), el reparto
 * de puntos (salvo en el reto, que los reparte solo) y el equipo encontrado (siempre: sin piezas, no enseña nada).
 * Así, cerrar el navegador con una de esas pantallas abierta no obliga a repetir el combate.
 */
export function despuesDelCombate(
  o: { caida: boolean; sube: boolean; reto: boolean },
  p: PasosTrasCombate,
): void {
  p.guardarEquipo();
  p.avisarMapa();
  const orden: PantallaTrasCombate[] = [];
  if (o.caida) orden.push('caida');
  if (o.sube) orden.push('nivel');
  if (o.sube && !o.reto) orden.push('puntos');
  orden.push('equipo');
  const siguiente = (i: number): void => {
    const pantalla = orden[i];
    if (pantalla) p.ensenar(pantalla, () => siguiente(i + 1));
  };
  siguiente(0);
}
