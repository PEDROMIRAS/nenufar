/** `src/data/vertical.json`: cómo se encuadra el mapa con la ventana más alta que ancha. */
export interface DatosVertical {
  /** Columnas de la sala que caben a lo ancho. */
  columnas: number;
  /** Alto que se deja libre arriba para el HUD, en las mismas unidades que la ventana. */
  franjaHud: number;
  /** Ancho lógico de la interfaz alta (combate, título y menús de pie), en unidades lógicas. */
  interfazAncho: number;
  /** Tope de la escala de la interfaz alta (píxeles CSS por unidad lógica): en una tableta no se agranda más. */
  escalaMax: number;
  /** Alto lógico mínimo de la escena del combate, sobre el panel. */
  escenaMin: number;
}

/** `escala` es unidades de ventana por unidad lógica de la sala; `x`, `y` la esquina de la sala sin desplazar. */
export interface Colocacion {
  escala: number;
  x: number;
  y: number;
}

/** La sala entera, a todo lo que cabe y centrada. */
export function encajarSala(
  ancho: number,
  alto: number,
  salaAncho: number,
  salaAlto: number,
): Colocacion {
  const escala = Math.min(ancho / salaAncho, alto / salaAlto);
  return { escala, x: (ancho - salaAncho * escala) / 2, y: (alto - salaAlto * escala) / 2 };
}

/**
 * Dónde cae la sala del mapa. En horizontal (o cuadrada), entera; en vertical, con `columnas` de ancho (caben
 * las filas siempre) y bajo la franja del HUD.
 */
export function colocarSala(
  ancho: number,
  alto: number,
  d: DatosVertical,
  salaAncho: number,
  salaAlto: number,
  tile: number,
): Colocacion {
  if (ancho >= alto) return encajarSala(ancho, alto, salaAncho, salaAlto);
  const escala = Math.min(ancho / (d.columnas * tile), (alto - d.franjaHud) / salaAlto);
  return {
    escala,
    x: Math.max(0, (ancho - salaAncho * escala) / 2),
    y: Math.max(d.franjaHud, (alto - salaAlto * escala) / 2),
  };
}

/** Cuánto se corre la sala a la izquierda (píxeles lógicos) para tener a la heroína al centro sin salirse de ella. */
export function desplazamientoX(xHeroina: number, visibleAncho: number, salaAncho: number): number {
  if (visibleAncho >= salaAncho) return 0;
  return Math.min(Math.max(xHeroina - visibleAncho / 2, 0), salaAncho - visibleAncho);
}

/** La sala a la escala que cubre la ventana entera, centrada (recorta lo que sobra). */
export function cubrirSala(
  ancho: number,
  alto: number,
  salaAncho: number,
  salaAlto: number,
): Colocacion {
  const escala = Math.max(ancho / salaAncho, alto / salaAlto);
  return { escala, x: (ancho - salaAncho * escala) / 2, y: (alto - salaAlto * escala) / 2 };
}

/**
 * La interfaz alta (ventana vertical): ancho lógico fijo (más en una tableta, por el tope de escala) y el alto
 * que dé la ventana. Entra y sale en píxeles CSS; `escala` es píxeles CSS por unidad lógica.
 */
export function interfazAlta(
  anchoCss: number,
  altoCss: number,
  d: DatosVertical,
): { escala: number; ancho: number; alto: number } {
  const escala = Math.min(anchoCss / d.interfazAncho, d.escalaMax);
  return { escala, ancho: anchoCss / escala, alto: altoCss / escala };
}
