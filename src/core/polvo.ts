// Nubes de polvo de los pasos como anillo de huecos reutilizados: cuándo salió cada una y cuál sale después.
// Lógica pura (sin asignar memoria al soltar ni al consultar); el dibujo está en render/mundo/mundo.ts.

export interface AnilloPolvo {
  /** Instante en que salió cada nube (en el reloj de la escena del mapa); −1 = libre. */
  nacimientos: number[];
  siguiente: number;
}

export function crearAnillo(n: number): AnilloPolvo {
  return { nacimientos: new Array<number>(n).fill(-1), siguiente: 0 };
}

/** Suelta una nube en el instante `tiempo` reutilizando la más vieja; devuelve su hueco. */
export function soltarNube(a: AnilloPolvo, tiempo: number): number {
  const i = a.siguiente;
  a.nacimientos[i] = tiempo;
  a.siguiente = (i + 1) % a.nacimientos.length;
  return i;
}

/**
 * Libera todas las nubes. Se llama al cambiar de sala o de zona: el reloj de la escena nueva empieza en otro
 * punto y, si no, una nube vieja volvería a salir cuando ese reloj pasara por su instante.
 */
export function vaciarAnillo(a: AnilloPolvo): void {
  a.nacimientos.fill(-1);
}

/** Cuánto ha vivido la nube `i` (de 0 a 1) en el instante `tiempo`; −1 si está libre o ya se deshizo. */
export function progresoNube(a: AnilloPolvo, i: number, tiempo: number, vida: number): number {
  const nacida = a.nacimientos[i] ?? -1;
  if (nacida < 0) return -1;
  const edad = tiempo - nacida;
  return edad >= 0 && edad < vida ? edad / vida : -1;
}
