// Peso de los golpes del combate: cuánto tiembla la escena, cuánto se detiene en el impacto y cómo se entra en
// combate. Lógica pura; los números salen de src/data/impacto.json.
import type { CamaraCombateJson } from './camaraCombate';
import type { Evento, Luchador } from './combate';

export type Peso = 'leve' | 'fuerte' | 'maximo';

/** Vibración del mando: segundos y fuerza de los dos motores (de 0 a 1). */
export interface Vibracion {
  duracion: number;
  /** Motor grande, de baja frecuencia. */
  fuerte: number;
  /** Motor pequeño, de alta frecuencia. */
  debil: number;
}

export interface PesoJson {
  /** Trauma que suma el impacto (de 0 a 1); el temblor crece con su cuadrado. */
  trauma: number;
  /** Segundos que el combate se detiene en el impacto. */
  pausa: number;
  /** Opacidad del destello blanco sobre la escena (0 = sin destello). */
  destello: number;
  /** Tamaño del número que flota, respecto al normal. */
  numero: number;
  /** Sonido grave que suena además del golpe. */
  sonido: string | null;
  vibracion: Vibracion;
}

export interface ImpactoJson {
  pesos: Record<Peso, PesoJson>;
  /** Cámara del combate durante los ataques (ver `zoomAtaque`); sin el campo, quieta. */
  camara?: CamaraCombateJson;
  temblor: { maxX: number; maxY: number; decaimiento: number; frecuencias: [number, number] };
  destello: { duracion: number };
  numero: { asentar: number };
  entrada: {
    duracion: number;
    destello: number;
    opacidadDestello: number;
    franjas: number;
    aparicion: number;
    salida: number;
    vibracion: Vibracion;
  };
}

/** En qué momento de la entrada al combate se está. */
export interface FaseEntrada {
  /** Opacidad del destello blanco. */
  destello: number;
  /** Progreso del barrido de franjas, de 0 a 1. */
  barrido: number;
  terminada: boolean;
}

const esJefe = (l: Luchador): boolean => l.monstruo?.jefe === true;

/** Peso de un evento del combate: los golpes y las muertes pesan; lo demás (estados, curas…), no. */
export function pesoDe(e: Evento): Peso | null {
  if (e.tipo === 'danio') {
    if (e.cargado) return 'maximo';
    if (e.critico || esJefe(e.origen) || esJefe(e.objetivo)) return 'fuerte';
    return 'leve';
  }
  if (e.tipo === 'muerte') return e.objetivo.esHeroina || esJefe(e.objetivo) ? 'maximo' : 'fuerte';
  return null;
}

export function sumarTrauma(trauma: number, peso: PesoJson): number {
  return Math.min(1, trauma + peso.trauma);
}

/** El trauma baja a ritmo constante (en tiempo real, también durante la pausa de impacto). */
export function decaerTrauma(trauma: number, dt: number, d: ImpactoJson): number {
  return Math.max(0, trauma - d.temblor.decaimiento * dt);
}

/**
 * Desplazamiento de la escena en píxeles lógicos: trauma² × `factor` (el ajuste de temblor) × el máximo, por un
 * ruido suave de dos senos (no un número al azar en cada fotograma, que vibra como estática). Escribe en `salida`.
 */
export function desplazamiento(
  trauma: number,
  t: number,
  factor: number,
  d: ImpactoJson,
  salida: { x: number; y: number },
): { x: number; y: number } {
  const a = trauma * trauma * factor;
  // Por índice: desestructurar un array pasa por su iterador en cada fotograma.
  const f1 = d.temblor.frecuencias[0];
  const f2 = d.temblor.frecuencias[1];
  const ruidoX = (Math.sin(t * f1 * 2 * Math.PI) + Math.sin(t * f2 * 2 * Math.PI + 1.3)) / 2;
  const ruidoY = (Math.sin(t * f2 * 2 * Math.PI + 0.7) + Math.sin(t * f1 * 2 * Math.PI + 2.9)) / 2;
  // Sin «-0» cuando no hay temblor.
  salida.x = a === 0 ? 0 : a * d.temblor.maxX * ruidoX;
  salida.y = a === 0 ? 0 : a * d.temblor.maxY * ruidoY;
  return salida;
}

/** Dos pausas que se solapan no se suman: queda la mayor. */
export function juntarPausa(queda: number, nueva: number): number {
  return Math.max(queda, nueva);
}

/** Cuánto tiembla la pantalla: el ajuste (de 0 a 1), y nada si el sistema pide menos movimiento. */
export function factorTemblor(ajuste: number, menosMovimiento: boolean): number {
  return menosMovimiento ? 0 : Math.min(1, Math.max(0, ajuste));
}

/** Fase de la entrada al combate `t` segundos después de tocar al monstruo. Escribe en `salida`. */
export function faseEntrada(t: number, d: ImpactoJson, salida: FaseEntrada): FaseEntrada {
  const { duracion, destello, opacidadDestello } = d.entrada;
  salida.destello = t >= destello ? 0 : opacidadDestello * (1 - t / destello);
  salida.barrido = Math.min(1, Math.max(0, (t - destello) / (duracion - destello)));
  salida.terminada = t >= duracion;
  return salida;
}

/** Cuánto cubre la franja `i` de `n` (de 0 a 1): empiezan escalonadas y cada una tarda medio barrido. */
export function franja(i: number, n: number, barrido: number): number {
  const empieza = n > 1 ? (i / (n - 1)) * 0.5 : 0;
  return Math.min(1, Math.max(0, (barrido - empieza) / 0.5));
}

/**
 * Cuánto se mueve la cámara 3D del fondo (en unidades del mundo) para un temblor (`temblorX`, `temblorY`) de la capa
 * 2D: al revés en x (la cámara a la izquierda = la sala a la derecha, con los sprites) y por su «arriba» en y
 * (subir la cámara = bajar la imagen). `unidad` = unidades del mundo por píxel lógico. Escribe en `salida`.
 */
export function desplazamientoCamara(
  temblorX: number,
  temblorY: number,
  unidad: number,
  arribaY: number,
  arribaZ: number,
  salida: { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  salida.x = temblorX === 0 ? 0 : -temblorX * unidad;
  salida.y = temblorY * unidad * arribaY;
  salida.z = temblorY * unidad * arribaZ;
  return salida;
}

/** Los destellos salen solo si la pantalla puede temblar: con el temblor a 0 (ajuste o «menos movimiento»), nada. */
export function factorDestello(temblor: number): number {
  return temblor > 0 ? 1 : 0;
}
