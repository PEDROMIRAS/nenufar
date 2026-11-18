import { crearAzar, elegirConPeso } from './azar';
import { colocarMonstruos, cuantosGrupos } from './monstruos';
import { aplicarPuertas, construirSala, salidas, type Sala, type Salida, type Tile } from './sala';
import type { PlantillasJson } from './types';
import type { SalaZona, Zona } from './zona';

/**
 * Montaje de una sala de la zona, compartido por el mapa y el simulador: así el reto del día que se equilibra es el
 * mismo que se juega (misma plantilla, mismos grupos en las mismas casillas).
 */

/**
 * Lo primero de montar la sala `s`: su azar propio (la misma zona da siempre las mismas salas, se visiten en el orden
 * que sea), la plantilla de su tipo con sus puertas y la sala construida. Si es la del ermitaño, su casilla (la del
 * altar) pasa a suelo y se devuelve. El azar sigue después para los grupos (`sortearGrupos`).
 */
export function montarSalaZona(
  zona: Zona,
  s: SalaZona,
  plantillas: PlantillasJson,
  catalogo: ReadonlyMap<string, Tile>,
): { sala: Sala; azar: () => number; ermitano: { fila: number; columna: number } | null } {
  const azar = crearAzar(zona.semilla * 1009 + zona.salas.indexOf(s));
  const candidatas = plantillas.plantillas.filter((p) => p.tipo === s.tipo);
  const plantilla = candidatas[Math.floor(azar() * candidatas.length)];
  if (!plantilla) throw new Error(`No hay plantillas de tipo ${s.tipo}`);
  const mapa = aplicarPuertas(plantilla.mapa, s.puertas);
  const fila = s.evento === 'ermitano' ? mapa.findIndex((f) => f.includes('A')) : -1;
  const columna = fila >= 0 ? mapa[fila]!.indexOf('A') : -1;
  if (fila >= 0) mapa[fila] = mapa[fila]!.replace('A', '.');
  const sala = construirSala(mapa, plantillas, catalogo, azar);
  return { sala, azar, ermitano: fila >= 0 ? { fila, columna } : null };
}

/** `cuantos` grupos al azar de `grupos`, cada uno en una casilla libre lejos de las entradas. */
export function sortearGrupos<G extends { peso: number }>(
  sala: Sala,
  lista: readonly Salida[],
  cuantos: number,
  distancia: number,
  grupos: readonly G[],
  azar: () => number,
): { c: number; f: number; grupo: G }[] {
  return colocarMonstruos(sala, lista, cuantos, distancia, azar).flatMap(([c, f]) => {
    const grupo = elegirConPeso(grupos, azar);
    return grupo ? [{ c, f, grupo }] : [];
  });
}

/** El azar del cofre de la sala `s` (cerrar el navegador y volver no lo cambia). */
export const azarCofre = (zona: Zona, s: SalaZona): (() => number) =>
  crearAzar(zona.semilla * 1013 + zona.salas.indexOf(s));

/**
 * Los grupos de cada sala de combate de `zona`, montada como en el mapa (`montarSalaZona` y `sortearGrupos`): son
 * fijos para cada zona. `grupos` en el mismo orden y con los mismos pesos que los del mapa da los mismos grupos.
 */
export function gruposDeZona<G extends { peso: number }>(
  zona: Zona,
  plantillas: PlantillasJson,
  catalogo: ReadonlyMap<string, Tile>,
  porSala: { min: number; max: number },
  distancia: number,
  grupos: readonly G[],
): Map<SalaZona, G[]> {
  const resultado = new Map<SalaZona, G[]>();
  for (const s of zona.salas) {
    if (s.tipo !== 'combate') continue;
    const { sala, azar } = montarSalaZona(zona, s, plantillas, catalogo);
    const cuantos = cuantosGrupos(porSala, 0, azar);
    resultado.set(
      s,
      sortearGrupos(sala, salidas(sala.ancho, sala.alto), cuantos, distancia, grupos, azar).map(
        (x) => x.grupo,
      ),
    );
  }
  return resultado;
}
