// La partida en curso: su tipo, lo que se guarda de ella, el estado que comparten los módulos y datos comunes.
import { type Luchador } from '../core/combate';
import {
  heroinaGuardada,
  VERSION_GUARDADO,
  type CombateGuardado,
  type Conocido,
  type EstadoMapa,
  type PartidaGuardada,
} from '../core/guardado';
import { type Heroina } from '../core/heroina';
import type { Inventario } from '../core/inventario';
import { type Fecha } from '../core/reto';
import type {
  DificultadJson,
  HeroeJson,
  MonstruoJson,
  PlantillasJson,
  PresagioJson,
  ReglasCombate,
  ZonaHd2d,
} from '../core/types';
import { DIFICULTADES, HD2D, HEROES, MONSTRUOS, OBJETOS } from '../data/datos';
import plantillasBosque from '../data/salas/plantillas_bosque.json';
import plantillasCauce from '../data/salas/plantillas_cauce.json';
import plantillasCripta from '../data/salas/plantillas_cripta.json';
import plantillasRuinas from '../data/salas/plantillas_ruinas.json';
import zonas from '../data/zonas.json';
import type { PilaEscenas } from '../escenas/pila';
import { type Casilla, type Deslizador } from '../render/deslizador';
import { Mundo } from '../render/mundo/mundo';
import { type Sprite } from '../render/recursos';

export type NombreZona = keyof typeof zonas.zonas;
/** Orden de las zonas: el de zonas.json. */
export const ORDEN = Object.keys(zonas.zonas) as NombreZona[];
export const PLANTILLAS: Record<NombreZona, PlantillasJson> = {
  bosque: plantillasBosque,
  ruinas: plantillasRuinas,
  cripta: plantillasCripta,
  cauce: plantillasCauce,
};
/** Para `?portada=<id de plantilla>` (solo en desarrollo). */
export const PLANTILLAS_DEV: Record<string, PlantillasJson> = PLANTILLAS;

/** Lo que comparten todas las zonas de una partida. */
export interface Partida {
  semilla: number;
  pila: PilaEscenas;
  heroina: Heroina;
  luchadora: Luchador;
  inventario: Inventario;
  /** La heroína: su hoja cambia de colores con el equipo (ver `vestir`); `imagenBase` es la original. */
  sprite: Sprite;
  imagenBase: HTMLImageElement;
  /** Capas de las piezas especiales que cambian la silueta de la heroína, por su ruta. */
  capas: ReadonlyMap<string, HTMLImageElement>;
  /** Hojas de monstruos, efectos y proyectiles, por nombre. */
  hojas: ReadonlyMap<string, Sprite>;
  combates: number;
  /** Para el resumen final: cuándo empezó (ms), monstruos vencidos y zona en la que está. */
  inicio: number;
  vencidos: number;
  zona: string;
  /** Dificultad elegida, y monstruos y reglas de combate con ella ya aplicada. */
  dificultad: DificultadJson;
  /** Presagio de la zona en que está, y la dificultad con él puesto (`dificultad` no cambia: los récords la buscan por identidad). */
  presagio: PresagioJson | null;
  dificultadZona: DificultadJson;
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
  /** Volumen de música y efectos y sonido sí o no en el inventario (controles HTML, uno por partida). */
  controles: {
    musica: Deslizador;
    efectos: Deslizador;
    temblor: Deslizador;
    sonido: Casilla;
    calidad: Casilla;
    reto: Casilla;
  };
  /** Nombre del jefe final: lleva el de la última heroína que lo venció, si la hubo. */
  rival: string;
  /** Salas violetas que han salido en las zonas ya creadas, y si una de ellas era del dragón negro. */
  violetas: number;
  dragonUsado: boolean;
  /** Los dos de antes, tal como estaban antes de crear la zona actual: es lo que se guarda. */
  violetasAntes: number;
  dragonAntes: boolean;
  /** El mapa en 3D (uno para todas las partidas: cada WebGLRenderer es un contexto del navegador). */
  mundo: Mundo;
  /**
   * En el reto del día: su fecha, los segundos jugados (sin contar la pausa) y hasta qué sala se ha llegado. Null en
   * la partida normal. El reto no se guarda ni toca los récords, los logros ni el bestiario.
   */
  reto: { fecha: Fecha; segundos: number; progreso: () => { sala: number; de: number } } | null;
}

/** Lo que existe en el juego, para descartar una partida guardada que nombre algo que ya no está. */
export const CONOCIDO: Conocido = {
  heroes: Object.keys(HEROES),
  dificultades: Object.keys(DIFICULTADES),
  equipo: Object.keys(OBJETOS.equipo),
  consumibles: Object.keys(OBJETOS.consumibles),
  zonas: ORDEN.length,
};

export const claveDe = <T>(tabla: Record<string, T>, valor: T): string =>
  Object.entries(tabla).find(([, v]) => v === valor)?.[0] ?? '';

/** La partida tal como hay que guardarla al entrar en una sala de la zona `zona`. */
export function guardado(
  partida: Partida,
  zona: number,
  mapa: EstadoMapa,
  combate: CombateGuardado | null = null,
): PartidaGuardada {
  const l = partida.luchadora;
  return {
    version: VERSION_GUARDADO,
    semilla: partida.semilla,
    zona,
    heroe: l.heroe ? claveDe(HEROES, l.heroe) : '',
    dificultad: claveDe(DIFICULTADES, partida.dificultad),
    combates: partida.combates,
    vencidos: partida.vencidos,
    violetasAntes: partida.violetasAntes,
    dragonAntes: partida.dragonAntes,
    rival: partida.rival,
    segundos: (performance.now() - partida.inicio) / 1000,
    combate,
    heroina: heroinaGuardada(l),
    inventario: partida.inventario,
    mapa,
  };
}

/** Aspecto 3D de la zona, de hd2d.json. */
export function aspecto(zona: string): ZonaHd2d {
  const a = HD2D.zonas[zona];
  if (!a) throw new Error(`Falta la zona ${zona} en hd2d.json`);
  return a;
}

export function monstruo(clave: string): MonstruoJson {
  const m = MONSTRUOS[clave];
  if (!m) throw new Error(`Monstruo desconocido en zonas.json: ${clave}`);
  return m;
}

export function mostrarError(error: unknown): void {
  // Sin esto, en un móvil un fallo de carga es solo una pantalla negra.
  document.body.style.color = '#fff';
  document.body.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
}

/** Estado de la partida que cambian varios módulos (un `let` exportado no se puede reasignar desde fuera). */
export const sesion: {
  /** Hay una partida en marcha: cerrar la pestaña pregunta antes (Ctrl+W sin querer). */
  enCurso: boolean;
  /** El reto del día que se está jugando, para contar su tiempo en el bucle (null si no hay). */
  retoEnJuego: Partida | null;
  /**
   * Empieza otra vez el reto con la misma rana y la misma fecha, sin el cartel de entrada (lo pone `iniciar`, que
   * tiene las hojas cargadas).
   */
  reiniciarReto: (heroe: HeroeJson, fecha: Fecha) => void;
} = { enCurso: false, retoEnJuego: null, reiniciarReto: () => {} };
