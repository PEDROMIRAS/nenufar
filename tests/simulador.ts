import { crearAzar, elegirConPeso } from '../src/core/azar';
import {
  pelear as pelearJugadora,
  quizaEquipar as quizaEquiparJugadora,
  type MundoJugadora,
} from '../src/core/jugadora';
import JUGADORA from '../src/data/jugadora.json';
import { luchadorDeHeroe, type Luchador } from '../src/core/combate';
import { abrirCofre, inventarioInicial, valorPieza } from '../src/core/equipo';
import {
  aplicarAltar,
  aplicarErmitano,
  aplicarMercader,
  gruposDesafio,
  opcionesAltar,
  reglasDesafio,
} from '../src/core/eventos';
import type { Inventario } from '../src/core/inventario';
import type { DificultadJson, MonstruoJson, ReglasCombate } from '../src/core/types';
import { generarZona, type Zona } from '../src/core/zona';
import { bestiarioCon, reglasCon } from '../src/core/dificultad';
import { cuantosGrupos } from '../src/core/monstruos';
import {
  cofreCon,
  dificultadCon,
  elegirPresagio,
  presagioUtil,
  restaurarFuente,
} from '../src/core/presagios';
import {
  DIFICULTADES,
  EVENTOS,
  HEROES,
  MONSTRUOS,
  OBJETOS,
  PRESAGIOS,
  REGLAS,
} from '../src/data/datos';
import reto from '../src/data/reto.json';
import zonas from '../src/data/zonas.json';
import { gruposDeZona } from '../src/core/montaje';
import { elegirDia, jugarReto, type DatosDia, type GruposDeZona } from '../src/core/diaJusto';
import { crearCatalogo } from '../src/core/sala';
import type { PlantillasJson, TilesetJson } from '../src/core/types';
import plantillasBosque from '../src/data/salas/plantillas_bosque.json';
import bosqueAuto from '../public/assets/tilesets/bosque_autotiles.json';
import bosqueTiles from '../public/assets/tilesets/bosque.json';
import comunes from '../public/assets/tilesets/comunes.json';

/** Simulador de partidas enteras jugadas con una política razonable (para el equilibrado). */

/** Monstruos y reglas con la dificultad de la partida ya aplicada. */
export interface Mundo {
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
}

/** La jugadora del juego (src/core/jugadora.ts) con los objetos, la experiencia y la política de los datos. */
const conDatos = (m: Mundo): MundoJugadora => ({
  ...m,
  objetos: OBJETOS,
  experiencia: REGLAS.experiencia,
  politica: JUGADORA,
});

export function pelear(
  h: Luchador,
  inv: Inventario,
  grupo: readonly string[],
  azar: () => number,
  m: Mundo,
  /** Si se pasa, suma el daño que recibe la heroína, en fracción de su vida máxima. */
  recibido?: Media,
  /** Si se pasa, recibe cada pieza que suelta el combate y no se pone. */
  sobra?: (clave: string) => void,
): boolean {
  return pelearJugadora(h, inv, grupo, azar, conDatos(m), recibido, sobra);
}

const quizaEquipar = (h: Luchador, inv: Inventario, clave: string): void =>
  quizaEquiparJugadora(h, inv, OBJETOS, clave);

export interface Cuenta {
  ganados: number;
  jugados: number;
}
export const pct = (c: Cuenta): number =>
  c.jugados ? Math.round((c.ganados / c.jugados) * 1000) / 10 : 0;

export interface Media {
  suma: number;
  n: number;
}
/** La media en porcentaje, con un decimal. */
export const media = (m: Media): number => (m.n ? Math.round((m.suma / m.n) * 1000) / 10 : 0);

/**
 * La política de la jugadora simulada en el altar: ofrece vida (y se lleva el cofre) si le quedan al menos la mitad
 * de los PV, ofrece magia si va corta de PV y le sobran PM, y si no se marcha. Devuelve lo que eligió.
 */
function usarAltar(h: Luchador, inv: Inventario): string {
  const opciones = opcionesAltar(h, EVENTOS.altar, REGLAS.experiencia);
  const activa = (c: string): boolean => opciones.find((o) => o.clave === c)!.activa;
  const elegida =
    activa('vida') && h.pv >= h.pvMax * 0.5 ? 'vida' : activa('magia') ? 'magia' : 'marcharse';
  aplicarAltar(h, inv, elegida, EVENTOS.altar, OBJETOS, REGLAS.experiencia);
  return elegida;
}

/**
 * La jugadora simulada ante el ermitaño: elige la oferta que más le sirve (la que da lo que más le falta: Poción si va
 * más corta de PV que de PM, Éter si no) y, a igualdad, la primera.
 */
function tratarConErmitano(h: Luchador, inv: Inventario): void {
  const pideVida = h.pv / h.pvMax <= (h.pmMax > 0 ? h.pm / h.pmMax : 1);
  const quiere = pideVida ? 'pocion' : 'eter';
  const ofertas = EVENTOS.ermitano.ofertas;
  const sirve = (o: (typeof ofertas)[number]): number =>
    o.consumibles.filter((c) => c === quiere).length;
  const elegida = ofertas.reduce((a, b) => (sirve(b) > sirve(a) ? b : a));
  aplicarErmitano(inv, elegida.clave, EVENTOS.ermitano, OBJETOS);
}

/**
 * La jugadora simulada ante el puesto del mercader: deja la pieza más valiosa de las que le sobran (las que habría
 * en la mochila, también las que suelta un combate: la jugadora no la usa, así que se apuntan aparte en
 * `sobrantes`), valorada con su nivel como en el juego, y se lleva su lote.
 */
function tratarConMercader(h: Luchador, inv: Inventario, sobrantes: string[]): void {
  const valor = (k: string): number => valorPieza(OBJETOS.equipo[k], h.nivel);
  const pieza = [...sobrantes].sort((a, b) => valor(b) - valor(a))[0];
  if (!pieza) return;
  sobrantes.splice(sobrantes.indexOf(pieza), 1);
  inv.mochila.push(pieza);
  aplicarMercader(inv, pieza, EVENTOS.mercader, OBJETOS, h.nivel);
}

/** Con al menos esta parte de los PV la jugadora simulada acepta el desafío; con menos, se marcha. */
const VIDA_PARA_DESAFIO = 0.6;

/**
 * La jugadora simulada ante el desafío: lo acepta si le quedan PV de sobra, lucha los combates seguidos (los
 * primeros sin recuperación) y, si los vence todos, abre el cofre. Devuelve si sigue viva (huir no cuenta: nunca huye).
 */
function jugarDesafio(
  h: Luchador,
  inv: Inventario,
  grupos: readonly { monstruos: string[]; peso: number }[],
  azar: () => number,
  mundo: Mundo,
  premio: () => void,
): boolean {
  if (h.pv < h.pvMax * VIDA_PARA_DESAFIO) return true;
  const cadena = gruposDesafio(grupos, EVENTOS.desafio.combates, azar);
  for (const [i, grupo] of cadena.entries()) {
    const ultimo = i === cadena.length - 1;
    const reglas = ultimo ? mundo.reglas : reglasDesafio(mundo.reglas);
    if (!pelear(h, inv, grupo, azar, { ...mundo, reglas })) return false;
  }
  premio();
  return true;
}

export function simular(
  nombre: string,
  partidas = 300,
  dificultad: DificultadJson = DIFICULTADES.normal,
  /**
   * Se llama al terminar de explorar cada zona (antes de la fuente y del jefe), con la heroína tal
   * como entraría a la sala violeta: para probar combates con una copia sin tocar la partida.
   */
  alExplorar?: (
    zona: keyof typeof zonas.zonas,
    h: Luchador,
    inv: Inventario,
    mundo: Mundo,
    s: number,
  ) => void,
  /**
   * Presagios de las zonas: `forzado` pone ese en las cuatro; `probabilidad` los sortea como el juego
   * (con la semilla de cada zona). Sin esto, o con probabilidad 0, ninguna zona tiene presagio.
   */
  presagios?: { forzado?: string; probabilidad?: number },
  /** Probabilidad de una sala de evento en cada zona (como el juego); sin esto, ninguna zona la tiene. */
  probabilidadAltar = 0,
  /** Fracción de esos eventos que son un desafío (el resto, altares). */
  fraccionDesafio = 0,
  /** Fracción de los eventos que no son un desafío que son un ermitaño (el resto, altares). */
  fraccionErmitano = 0,
  /** Fracción de los altares que quedan que son un puesto del mercader. */
  fraccionMercader = 0,
) {
  const mundo: Mundo = {
    bestiario: bestiarioCon(MONSTRUOS, dificultad),
    reglas: reglasCon(REGLAS, dificultad),
  };
  const heroe = HEROES[nombre as keyof typeof HEROES];
  const claves = Object.keys(zonas.zonas) as (keyof typeof zonas.zonas)[];
  const sueltos: Record<string, Cuenta> = {};
  const reales: Record<string, Cuenta> = {};
  const jefes: Record<string, Cuenta> = {};
  const trampas: Record<string, Cuenta> = {};
  /** Vida que quita de media un combate normal de cada zona empezado con la vida llena. */
  const recibido: Record<string, Media> = {};
  /** Nivel con que se llega a cada jefe. */
  const niveles: Record<string, number[]> = {};
  const contar = (t: Record<string, Cuenta>, k: string, gana: boolean): void => {
    t[k] ??= { ganados: 0, jugados: 0 };
    t[k].jugados++;
    if (gana) t[k].ganados++;
  };
  let completas = 0;
  for (let s = 1; s <= partidas; s++) {
    const azar = crearAzar(s * 97);
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    let viva = true;
    // Lo que habría en la mochila del juego: lo que se quita al ponerse algo mejor y lo que encuentra sin ponérselo.
    const sobrantes: string[] = [];
    const sobrar = (k: string | null): void => {
      if (k && !sobrantes.includes(k) && !inv.vendidas?.includes(k)) sobrantes.push(k);
    };
    const sobrarCambios = (antes: (string | null)[]): void => {
      if (inv.arma !== antes[0]) sobrar(antes[0] ?? null);
      if (inv.armadura !== antes[1]) sobrar(antes[1] ?? null);
    };
    for (const [i, clave] of claves.entries()) {
      const z = zonas.zonas[clave];
      // Sin salas violetas (son opcionales), pero con el tesoro trampa, que no se distingue de uno normal.
      const zona = generarZona(
        {
          ...zonas.generacion,
          salas: z.salas,
          probabilidadTrampa: zonas.violetas.probabilidadTrampa,
          probabilidadEvento: probabilidadAltar,
          probabilidadDesafio: fraccionDesafio,
          probabilidadErmitano: fraccionErmitano,
          probabilidadMercader: fraccionMercader,
        },
        s + i * 7919,
      );
      const clavePresagio =
        presagios?.forzado ??
        (presagios?.probabilidad
          ? elegirPresagio(
              { ...PRESAGIOS, probabilidad: presagios.probabilidad },
              zona.semilla,
              (p) => presagioUtil(p, z.cofre, OBJETOS.armaduras.length),
            )
          : null);
      const presagio = clavePresagio ? PRESAGIOS.lista[clavePresagio]! : null;
      const mundoZona: Mundo = presagio
        ? {
            bestiario: bestiarioCon(MONSTRUOS, dificultadCon(dificultad, presagio)),
            reglas: reglasCon(REGLAS, dificultadCon(dificultad, presagio)),
          }
        : mundo;
      const cofre = cofreCon(z.cofre, presagio, OBJETOS.armaduras.length);
      const modoFuente = presagio?.fuente ?? 'todo';
      let fuente = zona.salas.some((x) => x.tipo === 'descanso');
      const abrir = (): void => {
        const hallazgo = abrirCofre(cofre, azar, heroe, OBJETOS, inv);
        if (hallazgo?.tipo !== 'equipo') return;
        const antes = [inv.arma, inv.armadura];
        quizaEquipar(h, inv, hallazgo.clave);
        // Lo que no se pone, a lo que sobra (como la mochila del juego).
        if (inv.arma === antes[0] && inv.armadura === antes[1]) sobrar(hallazgo.clave);
        else sobrarCambios(antes);
      };
      for (const sala of zona.salas) {
        if (sala.tipo !== 'combate' && !sala.trampa && sala.evento !== 'desafio') {
          if (sala.tipo === 'tesoro') abrir();
          if (sala.evento === 'ermitano') tratarConErmitano(h, inv);
          else if (sala.evento === 'mercader') tratarConMercader(h, inv, sobrantes);
          else if (sala.tipo === 'evento') usarAltar(h, inv);
          continue;
        }
        // La fuente se guarda para cuando hace falta.
        if (fuente && h.pv < h.pvMax * 0.5) {
          fuente = false;
          restaurarFuente(h, modoFuente);
        }
        if (sala.evento === 'desafio') {
          viva = jugarDesafio(h, inv, z.grupos, azar, mundoZona, abrir);
          if (!viva) break;
          continue;
        }
        if (sala.trampa) {
          const antesTrampa = [inv.arma, inv.armadura];
          viva = pelear(h, inv, [z.cofreTrampa], azar, mundoZona, undefined, sobrar);
          sobrarCambios(antesTrampa);
          contar(trampas, clave, viva);
          if (!viva) break;
          abrir();
          continue;
        }
        const grupos = zonas.monstruos.gruposPorSala;
        const n = cuantosGrupos(grupos, presagio?.gruposExtra ?? 0, azar);
        for (let g = 0; g < n && viva; g++) {
          const grupo = elegirConPeso(z.grupos, azar)!.monstruos;
          // El mismo combate empezando con la vida llena, sin tocar la partida.
          const copia = structuredClone(h);
          copia.pv = copia.pvMax;
          copia.pm = copia.pmMax;
          contar(
            sueltos,
            clave,
            pelear(
              copia,
              structuredClone(inv),
              grupo,
              crearAzar(s * 131 + g),
              mundoZona,
              (recibido[clave] ??= { suma: 0, n: 0 }),
            ),
          );
          const antes = [inv.arma, inv.armadura];
          viva = pelear(h, inv, grupo, azar, mundoZona, undefined, sobrar);
          sobrarCambios(antes);
          contar(reales, clave, viva);
        }
        if (!viva) break;
      }
      if (!viva) break;
      alExplorar?.(clave, h, inv, mundoZona, s);
      if (fuente) restaurarFuente(h, modoFuente);
      (niveles[clave] ??= []).push(h.nivel);
      const antesJefe = [inv.arma, inv.armadura];
      viva = pelear(h, inv, [z.jefe], azar, mundoZona, undefined, sobrar);
      sobrarCambios(antesJefe);
      contar(jefes, clave, viva);
      if (!viva) break;
    }
    if (viva) {
      (niveles.final ??= []).push(h.nivel);
      viva = pelear(h, inv, [zonas.jefeFinal], azar, mundo);
      contar(jefes, 'final', viva);
    }
    if (viva) completas++;
  }
  return {
    sueltos,
    reales,
    jefes,
    trampas,
    recibido,
    niveles,
    completas: Math.round((completas / partidas) * 1000) / 10,
  };
}

/** Los datos del reto como los usa el juego para comprobar el día. */
export function datosReto(): DatosDia {
  const dificultad = reto.dificultad as DificultadJson;
  const z = zonas.zonas[reto.zona as keyof typeof zonas.zonas];
  return {
    heroes: Object.values(HEROES),
    nivel: reto.nivel,
    cofre: z.cofre,
    jefe: z.jefe,
    mundo: conDatos({
      bestiario: bestiarioCon(MONSTRUOS, dificultad),
      reglas: reglasCon(REGLAS, dificultad),
    }),
    comprobacion: reto.comprobacion,
  };
}

/** Las plantillas y el catálogo del Bosque, como los carga el juego (los JSON traen `layer` como string). */
const PLANTILLAS_BOSQUE = plantillasBosque as unknown as PlantillasJson;
const CATALOGO_BOSQUE = crearCatalogo([
  bosqueTiles as unknown as TilesetJson,
  comunes as unknown as TilesetJson,
  bosqueAuto as unknown as TilesetJson,
]);

export const generarZonaReto = (semilla: number): Zona =>
  generarZona({ ...zonas.generacion, salas: reto.salas, tesoros: reto.tesoros }, semilla);

/** La zona del reto de `semilla` (la de la fecha), ya comprobada como la elige el juego. */
const diasElegidos = new Map<number, Zona>();
export function zonaDelReto(semilla: number): Zona {
  let zona = diasElegidos.get(semilla);
  if (!zona) {
    zona = elegirDia(semilla, generarZonaReto, gruposDelMapaReto, datosReto());
    diasElegidos.set(semilla, zona);
  }
  return zona;
}

export function gruposDelMapaReto(zona: Zona): GruposDeZona {
  const z = zonas.zonas[reto.zona as keyof typeof zonas.zonas];
  const porSala = gruposDeZona(
    zona,
    PLANTILLAS_BOSQUE,
    CATALOGO_BOSQUE,
    reto.gruposPorSala,
    zonas.monstruos.distanciaEntradas,
    z.grupos,
  );
  return new Map([...porSala].map(([s, gs]) => [s, gs.map((g) => g.monstruos)]));
}

/** Los grupos de cada sala de combate del reto de `semilla` (ya comprobado), en el orden de las salas. */
export function gruposDelReto(semilla: number): string[][] {
  return [...gruposDelMapaReto(zonaDelReto(semilla)).values()].flat().map((g) => [...g]);
}

/**
 * Reto del día: por cada semilla de fecha, el mapa que elige el juego y `intentos` partidas de cada rana con azares que
 * no son los de la comprobación (como otras personas jugando ese mapa). Devuelve el porcentaje total y el de cada
 * fecha.
 */
export function simularReto(
  nombre: string,
  semillas: readonly number[],
  intentos: number,
  /** Si se pasa, apunta por cada intento los grupos que luchó (sin el jefe), en orden. */
  registro?: string[][][],
): { total: number; porFecha: number[] } {
  const d = datosReto();
  const heroe = HEROES[nombre as keyof typeof HEROES];
  const porFecha: number[] = [];
  let ganadas = 0;
  for (const semilla of semillas) {
    const zona = zonaDelReto(semilla);
    const grupos = gruposDelMapaReto(zona);
    let ganadasFecha = 0;
    for (let k = 0; k < intentos; k++) {
      const luchados: string[][] = [];
      registro?.push(luchados);
      if (jugarReto(zona, grupos, heroe, d, crearAzar(zona.semilla * 97 + 100_000 + k), luchados))
        ganadasFecha++;
    }
    ganadas += ganadasFecha;
    porFecha.push(Math.round((ganadasFecha / intentos) * 1000) / 10);
  }
  return {
    total: Math.round((ganadas / (semillas.length * intentos)) * 1000) / 10,
    porFecha,
  };
}
