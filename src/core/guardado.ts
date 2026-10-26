import type { Luchador } from './combate';
import type { Inventario } from './inventario';
import type { Recompensa } from './recompensas';

/**
 * Partida guardada al entrar en cada sala, para recuperarla si se cierra el navegador (no es un
 * sistema de partidas: hay una sola y morir la borra). Se guardan claves, nunca copias de los JSON.
 */
export const VERSION_GUARDADO = 1;

/** Estado del mapa de la zona: lo que no sale de la semilla. Índices de `zona.salas`. */
export interface EstadoMapa {
  sala: number;
  /** Lado por el que se entró (como `Salida.lado`); null en la sala de inicio de la zona. */
  lado: number | null;
  visitadas: number[];
  hechas: number[];
  /** Por sala montada, posiciones (en la lista de `poblar`) de los grupos vencidos. */
  vencidos: Record<number, number[]>;
  fuenteUsada: boolean;
}

export interface HeroinaGuardada {
  nombre: string;
  nivel: number;
  experiencia: number;
  puntos: number;
  pv: number;
  pvMax: number;
  pm: number;
  pmMax: number;
  ataque: number;
  magia: number;
  defensa: number;
  velocidad: number;
  critico: number;
  habilidadesGanadas: string[];
}

export interface PartidaGuardada {
  version: typeof VERSION_GUARDADO;
  semilla: number;
  /** Índice de la zona en el orden de zonas.json. */
  zona: number;
  /** Clave de heroes.json. */
  heroe: string;
  /** Clave de dificultades.json. */
  dificultad: string;
  combates: number;
  vencidos: number;
  /** `violetas` y `dragonUsado` de la partida ANTES de crear la zona actual. */
  violetasAntes: number;
  dragonAntes: boolean;
  rival: string;
  segundos: number;
  /**
   * Se guardó al empezar un combate que no ha terminado: si se recupera así, cuenta como derrota
   * (cerrar a mitad de un combate no puede servir para repetirlo).
   */
  enCombate: boolean;
  heroina: HeroinaGuardada;
  inventario: Inventario;
  mapa: EstadoMapa;
}

/** Lo que el juego conoce, para rechazar claves que ya no existen. */
export interface Conocido {
  heroes: readonly string[];
  dificultades: readonly string[];
  /** Claves de objetos.json `equipo`. */
  equipo: readonly string[];
  /** Claves de objetos.json `consumibles`. */
  consumibles: readonly string[];
  /** Cuántas zonas hay. */
  zonas: number;
}

const NUMEROS = [
  'nivel',
  'experiencia',
  'puntos',
  'pv',
  'pvMax',
  'pm',
  'pmMax',
  'ataque',
  'magia',
  'defensa',
  'velocidad',
  'critico',
] as const;

export function heroinaGuardada(l: Luchador): HeroinaGuardada {
  const g = { nombre: l.nombre, habilidadesGanadas: [...l.habilidadesGanadas] } as HeroinaGuardada;
  for (const k of NUMEROS) g[k] = l[k];
  return g;
}

/** Copia los campos guardados sobre una luchadora recién creada con `luchadorDeHeroe`. */
export function restaurarHeroina(l: Luchador, g: HeroinaGuardada): void {
  l.nombre = g.nombre;
  for (const k of NUMEROS) l[k] = g[k];
  l.habilidadesGanadas = [...g.habilidadesGanadas];
  l.estados = [];
  l.defendiendo = false;
}

const RECOMPENSAS: readonly Recompensa[] = ['arma', 'armadura', 'habilidad'];
const CORAZON: readonly Inventario['corazon'][] = ['no', 'lleno', 'gastado'];

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const esIndice = (v: unknown, tope = Infinity): v is number =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) < tope;
const sonIndices = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => esIndice(x));
const sonTextos = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

function heroinaValida(h: unknown): boolean {
  return (
    esObjeto(h) &&
    typeof h.nombre === 'string' &&
    sonTextos(h.habilidadesGanadas) &&
    NUMEROS.every((k) => esNumero(h[k]))
  );
}

function inventarioValido(i: unknown, c: Conocido): boolean {
  if (!esObjeto(i) || !esObjeto(i.consumibles)) return false;
  const pieza = (p: unknown): boolean =>
    p === null || (typeof p === 'string' && c.equipo.includes(p));
  return (
    Object.entries(i.consumibles).every(([k, n]) => c.consumibles.includes(k) && esIndice(n)) &&
    pieza(i.arma) &&
    pieza(i.armadura) &&
    sonTextos(i.mochila) &&
    i.mochila.every(pieza) &&
    esIndice(i.usados) &&
    Array.isArray(i.recompensas) &&
    i.recompensas.every((r) => RECOMPENSAS.includes(r as Recompensa)) &&
    CORAZON.includes(i.corazon as Inventario['corazon'])
  );
}

function mapaValido(m: unknown): boolean {
  return (
    esObjeto(m) &&
    esIndice(m.sala) &&
    (m.lado === null || esIndice(m.lado)) &&
    sonIndices(m.visitadas) &&
    sonIndices(m.hechas) &&
    esObjeto(m.vencidos) &&
    Object.entries(m.vencidos).every(([k, v]) => esIndice(Number(k)) && sonIndices(v)) &&
    typeof m.fuenteUsada === 'boolean'
  );
}

/** Lee y comprueba el texto guardado; null si no vale (nada se da por bueno sin comprobarlo). Nunca lanza. */
export function leerGuardado(texto: string | null, conocido: Conocido): PartidaGuardada | null {
  if (!texto) return null;
  let g: unknown;
  try {
    g = JSON.parse(texto);
  } catch {
    return null;
  }
  const valido =
    esObjeto(g) &&
    g.version === VERSION_GUARDADO &&
    esIndice(g.semilla, 2 ** 32) &&
    esIndice(g.zona, conocido.zonas) &&
    typeof g.heroe === 'string' &&
    conocido.heroes.includes(g.heroe) &&
    typeof g.dificultad === 'string' &&
    conocido.dificultades.includes(g.dificultad) &&
    esIndice(g.combates) &&
    esIndice(g.vencidos) &&
    esIndice(g.violetasAntes) &&
    typeof g.dragonAntes === 'boolean' &&
    typeof g.rival === 'string' &&
    esNumero(g.segundos) &&
    g.segundos >= 0 &&
    typeof g.enCombate === 'boolean' &&
    heroinaValida(g.heroina) &&
    inventarioValido(g.inventario, conocido) &&
    mapaValido(g.mapa);
  return valido ? (g as unknown as PartidaGuardada) : null;
}
