import { crearAzar } from './azar';
import { luchadorDeHeroe } from './combate';
import { abrirCofre, inventarioInicial } from './equipo';
import { elegirEquipadas, pelear, quizaEquipar, type MundoJugadora } from './jugadora';
import { azarCofre } from './montaje';
import { restaurarFuente } from './presagios';
import { empezarEnNivel } from './progresion';
import type { BotinJson, HeroeJson } from './types';
import type { SalaZona, Zona } from './zona';

/**
 * El reto del día comprueba su mapa antes de jugarlo: la jugadora simulada lo juega unas cuantas veces con cada rana y,
 * si alguna gana demasiado poco, se pasa a la semilla siguiente. Es determinista: todo el mundo recibe el mismo día.
 */

/** Grupos (claves del bestiario) de cada sala de combate. */
export type GruposDeZona = ReadonlyMap<SalaZona, readonly (readonly string[])[]>;

export interface DatosDia {
  heroes: readonly HeroeJson[];
  /** Nivel con el que empieza la rana. */
  nivel: number;
  cofre: readonly BotinJson[];
  jefe: string;
  mundo: MundoJugadora;
  /**
   * Intentos por rana, porcentajes mínimo y máximo de victorias (ni injusto ni un paseo) y cuántas semillas se prueban
   * como mucho.
   */
  comprobacion: { intentos: number; minimo: number; maximo: number; semillas: number };
}

/**
 * Un intento del reto con la jugadora simulada: las salas en orden, el cofre del mapa, la fuente cuando le queda menos
 * de la mitad de la vida (o antes del jefe) y el jefe al final. Devuelve si ganó. `luchados`, si se pasa, apunta los
 * grupos que luchó.
 */
export function jugarReto(
  zona: Zona,
  grupos: GruposDeZona,
  heroe: HeroeJson,
  d: DatosDia,
  azar: () => number,
  luchados?: (readonly string[])[],
): boolean {
  const { mundo } = d;
  const h = luchadorDeHeroe(heroe);
  const inv = inventarioInicial(h, heroe, mundo.objetos);
  empezarEnNivel(h, d.nivel, mundo.experiencia);
  elegirEquipadas(h, heroe.planHabilidades.zona);
  let fuente = zona.salas.some((x) => x.tipo === 'descanso');
  for (const sala of zona.salas) {
    if (sala.tipo === 'tesoro') {
      const hallazgo = abrirCofre(d.cofre, azarCofre(zona, sala), heroe, mundo.objetos, inv);
      if (hallazgo?.tipo === 'equipo') quizaEquipar(h, inv, mundo.objetos, hallazgo.clave);
    }
    if (sala.tipo !== 'combate') continue;
    if (fuente && h.pv < h.pvMax * mundo.politica.fuenteBajo) {
      fuente = false;
      restaurarFuente(h, 'todo');
    }
    for (const grupo of grupos.get(sala) ?? []) {
      luchados?.push(grupo);
      if (!pelear(h, inv, grupo, azar, mundo)) return false;
    }
  }
  if (fuente) restaurarFuente(h, 'todo');
  // Junto a la fuente cambia a las del jefe.
  elegirEquipadas(h, heroe.planHabilidades.jefe);
  return pelear(h, inv, [d.jefe], azar, mundo);
}

/** Porcentaje de victorias de `heroe` en `intentos` intentos, con azares `base`, `base + 1`… */
export function porcentajeReto(
  zona: Zona,
  grupos: GruposDeZona,
  heroe: HeroeJson,
  d: DatosDia,
  intentos: number,
  base: number,
): number {
  let ganadas = 0;
  for (let k = 0; k < intentos; k++)
    if (jugarReto(zona, grupos, heroe, d, crearAzar(base + k))) ganadas++;
  return (ganadas / intentos) * 100;
}

/**
 * La zona del día: la de `semilla` si todas las ranas ganan entre el mínimo y el máximo; si no, la siguiente semilla,
 * hasta `semillas` intentos (si ninguna cumple, la que más se acercó).
 */
export function elegirDia(
  semilla: number,
  generar: (s: number) => Zona,
  gruposDe: (z: Zona) => GruposDeZona,
  d: DatosDia,
): Zona {
  const { intentos, minimo, maximo, semillas } = d.comprobacion;
  let mejor: { zona: Zona; fuera: number } | null = null;
  let s = semilla;
  for (let i = 0; i < semillas; i++) {
    const zona = generar(s);
    const grupos = gruposDe(zona);
    const pcts = d.heroes.map((h) =>
      porcentajeReto(zona, grupos, h, d, intentos, zona.semilla * 97),
    );
    // Cuánto se sale de la banda la rana que más se sale (0: el día vale).
    const fuera = Math.max(0, minimo - Math.min(...pcts), Math.max(...pcts) - maximo);
    if (fuera === 0) return zona;
    if (!mejor || fuera < mejor.fuera) mejor = { zona, fuera };
    s = zona.semilla + 1;
  }
  return mejor!.zona;
}
