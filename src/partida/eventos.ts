// Presagios y salas de evento (altar, ermitaño y desafío), con los atajos de desarrollo para probarlos.
import { type EstadoMapa } from '../core/guardado';
import { bestiarioCon, reglasCon } from '../core/dificultad';
import type { PresagioJson } from '../core/types';
import { dificultadCon } from '../core/presagios';
import {
  aplicarAltar,
  aplicarErmitano,
  opcionesAltar,
  opcionesDesafio,
  opcionesErmitano,
} from '../core/eventos';
import { type Zona } from '../core/zona';
import { EVENTOS, MONSTRUOS, OBJETOS, PRESAGIOS, REGLAS } from '../data/datos';
import { EscenaEvento } from '../escenas/evento';
import { sonar } from '../render/sonido';
import { type Partida } from './partida';

/** Pone (o quita) el presagio de la zona y recalcula lo que depende de él: la dificultad, los monstruos y las reglas. */
export function fijarPresagio(partida: Partida, presagio: PresagioJson | null): void {
  partida.presagio = presagio;
  partida.dificultadZona = dificultadCon(partida.dificultad, presagio);
  partida.bestiario = bestiarioCon(MONSTRUOS, partida.dificultadZona);
  partida.reglas = reglasCon(REGLAS, partida.dificultadZona);
}

/** La elección del altar encima del mapa: aplica el trato elegido y avisa de lo ocurrido. */
export function abrirAltar(
  partida: Partida,
  alTerminar: (usado: boolean, aviso: string) => void,
): void {
  partida.pila.apilar(
    new EscenaEvento(
      EVENTOS.altar.nombre,
      EVENTOS.altar.descripcion,
      opcionesAltar(partida.luchadora, EVENTOS.altar, REGLAS.experiencia),
      (clave) => {
        partida.pila.desapilar();
        const nivel = partida.luchadora.nivel;
        const aviso = aplicarAltar(
          partida.luchadora,
          partida.inventario,
          clave,
          EVENTOS.altar,
          OBJETOS,
          REGLAS.experiencia,
        );
        // Subir de nivel en el altar suena como en el combate.
        if (partida.luchadora.nivel > nivel) sonar('nivel');
        alTerminar(clave !== 'marcharse', aviso);
      },
    ),
  );
}

/** La elección del ermitaño encima del mapa: da lo ofrecido que se elija y avisa de lo ocurrido. */
export function abrirErmitano(
  partida: Partida,
  azar: () => number,
  alTerminar: (usado: boolean, aviso: string) => void,
): void {
  partida.pila.apilar(
    new EscenaEvento(
      EVENTOS.ermitano.nombre,
      EVENTOS.ermitano.descripcion,
      opcionesErmitano(EVENTOS.ermitano, azar),
      (clave) => {
        partida.pila.desapilar();
        if (clave === 'marcharse') return alTerminar(false, '');
        alTerminar(true, aplicarErmitano(partida.inventario, clave, EVENTOS.ermitano, OBJETOS));
      },
    ),
  );
}

/** ?desafio o ?ermitano empiezan dentro de esa sala de evento de la zona, si la tiene (solo en desarrollo). */
export function empezarEnEvento(zona: Zona): EstadoMapa | null {
  // shortcut: solo en desarrollo, para probar el desafío o el ermitaño sin recorrer la zona
  if (!import.meta.env.DEV) return null;
  const url = new URLSearchParams(location.search);
  const evento = url.has('desafio') ? 'desafio' : url.has('ermitano') ? 'ermitano' : null;
  const sala = zona.salas.findIndex((s) => s.evento === evento);
  if (sala < 0) return null;
  return { sala, lado: null, visitadas: [sala], hechas: [], vencidos: {}, fuenteUsada: false };
}

/** La elección del desafío encima del mapa: avisa de si se acepta. */
export function abrirDesafio(partida: Partida, alTerminar: (aceptado: boolean) => void): void {
  partida.pila.apilar(
    new EscenaEvento(
      EVENTOS.desafio.nombre,
      EVENTOS.desafio.descripcion,
      opcionesDesafio(EVENTOS.desafio),
      (clave) => {
        partida.pila.desapilar();
        alTerminar(clave === 'aceptar');
      },
    ),
  );
}

/** ?evento hace que toda zona con un callejón libre tenga un evento (?desafio, además, un desafío), solo en desarrollo. */
export function probabilidadEvento(): number {
  // shortcut: solo en desarrollo, para probar los eventos sin buscarlos
  if (!import.meta.env.DEV) return EVENTOS.probabilidad;
  const url = new URLSearchParams(location.search);
  return url.has('evento') || url.has('desafio') || url.has('ermitano') ? 1 : EVENTOS.probabilidad;
}

/** La fracción de eventos que son un desafío; con ?desafio, todos (solo en desarrollo). */
export function probabilidadDesafio(): number {
  // shortcut: solo en desarrollo, para probar el desafío sin buscarlo
  if (!import.meta.env.DEV) return EVENTOS.desafio.fraccion;
  const url = new URLSearchParams(location.search);
  if (url.has('ermitano')) return 0;
  return url.has('desafio') ? 1 : EVENTOS.desafio.fraccion;
}

/** La fracción de los eventos que no son un desafío que son un ermitaño; con ?ermitano, todos (solo en desarrollo). */
export function probabilidadErmitano(): number {
  // shortcut: solo en desarrollo, para probar al ermitaño sin buscarlo
  if (!import.meta.env.DEV) return EVENTOS.ermitano.fraccion;
  return new URLSearchParams(location.search).has('ermitano') ? 1 : EVENTOS.ermitano.fraccion;
}

/** ?presagio=clave fuerza el presagio de todas las zonas, solo en desarrollo. */
export function presagioForzado(): string | null {
  // shortcut: solo en desarrollo, para probar un presagio concreto
  if (!import.meta.env.DEV) return null;
  const clave = new URLSearchParams(location.search).get('presagio');
  return clave && clave in PRESAGIOS.lista ? clave : null;
}
