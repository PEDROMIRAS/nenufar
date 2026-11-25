// Presagios y salas de evento (altar, ermitaño y desafío), con los atajos de desarrollo para probarlos.
import { ATAJOS } from './atajos';
import { type EstadoMapa } from '../core/guardado';
import { bestiarioCon, reglasCon } from '../core/dificultad';
import type { PresagioJson } from '../core/types';
import { dificultadCon } from '../core/presagios';
import {
  aplicarAltar,
  aplicarErmitano,
  aplicarMercader,
  despedidaErmitano,
  opcionesAltar,
  opcionesDesafio,
  opcionesErmitano,
  opcionesMercader,
  textoErmitano,
} from '../core/eventos';
import { type Zona } from '../core/zona';
import { EVENTOS, MONSTRUOS, OBJETOS, PRESAGIOS, REGLAS } from '../data/datos';
import { EscenaEvento } from '../escenas/evento';
import { sonar } from '../render/sonido';
import { type Partida } from './partida';
import { contar } from './relato';

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

/**
 * La elección del ermitaño encima del mapa (con su saludo de la zona `zona`): da lo ofrecido que se elija, se despide
 * y avisa de lo ocurrido.
 */
export function abrirErmitano(
  partida: Partida,
  zona: string,
  azar: () => number,
  alTerminar: (usado: boolean, aviso: string) => void,
): void {
  partida.pila.apilar(
    new EscenaEvento(
      EVENTOS.ermitano.nombre,
      textoErmitano(EVENTOS.ermitano, zona),
      opcionesErmitano(EVENTOS.ermitano, azar),
      (clave) => {
        partida.pila.desapilar();
        if (clave === 'marcharse') return alTerminar(false, '');
        // Lo que da se avisa en el mapa al cerrar su despedida (el aviso espera debajo).
        alTerminar(true, aplicarErmitano(partida.inventario, clave, EVENTOS.ermitano, OBJETOS));
        const despedida = despedidaErmitano(EVENTOS.ermitano, azar);
        if (despedida)
          contar(partida.pila, [{ titulo: EVENTOS.ermitano.nombre, texto: despedida }], () => {});
      },
    ),
  );
}

/** El puesto del mercader encima del mapa: deja la pieza elegida a cambio de su lote y avisa de lo ocurrido. */
export function abrirMercader(
  partida: Partida,
  alTerminar: (usado: boolean, aviso: string) => void,
): void {
  const nivel = partida.luchadora.nivel;
  const opciones = opcionesMercader(partida.inventario, EVENTOS.mercader, OBJETOS, nivel);
  // Si no hay trueque posible, el texto ya dice por qué (con la selección en Marcharse no se leería).
  const hay = opciones.some((o) => o.activa && o.clave !== 'marcharse');
  const porque = hay ? '' : ` ${opciones[0]?.descripcion ?? ''}`;
  partida.pila.apilar(
    new EscenaEvento(
      EVENTOS.mercader.nombre,
      EVENTOS.mercader.descripcion + porque,
      opciones,
      (clave) => {
        partida.pila.desapilar();
        if (clave === 'marcharse') return alTerminar(false, '');
        const aviso = aplicarMercader(
          partida.inventario,
          clave,
          EVENTOS.mercader,
          OBJETOS,
          partida.luchadora.nivel,
        );
        alTerminar(aviso !== '', aviso);
      },
    ),
  );
}

/** ?desafio, ?ermitano o ?mercader empiezan dentro de esa sala de evento de la zona, si la tiene (solo en desarrollo). */
export function empezarEnEvento(zona: Zona): EstadoMapa | null {
  // ?descanso y ?hoguera: dentro de la sala de descanso.
  const sala = ATAJOS.descanso
    ? zona.salas.findIndex((s) => s.tipo === 'descanso')
    : zona.salas.findIndex((s) => s.evento === ATAJOS.evento);
  if (ATAJOS.descanso && sala >= 0)
    return { sala, lado: null, visitadas: [sala], hechas: [], vencidos: {}, fuenteUsada: false };
  if (ATAJOS.evento === null || sala < 0) return null;
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
export const probabilidadEvento = (): number => (ATAJOS.eventos ? 1 : EVENTOS.probabilidad);

/** La fracción de eventos que son un desafío; con ?desafio, todos, y con ?ermitano o ?mercader, ninguno. */
export function probabilidadDesafio(): number {
  if (ATAJOS.evento === null) return EVENTOS.desafio.fraccion;
  return ATAJOS.evento === 'desafio' ? 1 : 0;
}

/** La fracción de los eventos que no son un desafío que son un ermitaño; con ?ermitano, todos, y con ?mercader, ninguno. */
export function probabilidadErmitano(): number {
  if (ATAJOS.evento === 'mercader') return 0;
  return ATAJOS.evento === 'ermitano' ? 1 : EVENTOS.ermitano.fraccion;
}

/** La fracción de los altares que son un puesto del mercader; con ?mercader, todos. */
export const probabilidadMercader = (): number =>
  ATAJOS.evento === 'mercader' ? 1 : EVENTOS.mercader.fraccion;

/** ?presagio=clave fuerza el presagio de todas las zonas, solo en desarrollo. */
export const presagioForzado = (): string | null =>
  ATAJOS.presagio && ATAJOS.presagio in PRESAGIOS.lista ? ATAJOS.presagio : null;
