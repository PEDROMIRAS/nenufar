import type { Acciones } from './acciones';
import { fijarDireccion } from './direccion';

/** Lo que se lee de un mando. Un `Gamepad` del navegador lo cumple, así que no se copia nada. */
export interface MandoLeido {
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
}

/** Sección `mando` de `controles.json`: índices de la asignación estándar de la API Gamepad. */
export interface MandoJson {
  /** Línea de la portada que dice que se juega con mando. */
  texto: string;
  /** Cartel «Mando conectado»: segundos a la vista y segundos de fundido al entrar y al salir. */
  aviso: { segundos: number; fundido: number };
  /** Inclinación del stick a partir de la cual se mueve, y por debajo de la cual se para (histéresis). */
  zonaMuerta: number;
  zonaMuertaSalida: number;
  /** Grados que ocupa cada diagonal del stick (45 = las 8 direcciones a partes iguales). */
  anchoDiagonal: number;
  /** Valor del gatillo a partir del cual cuenta como pulsado. */
  gatillo: number;
  botones: {
    confirmar: number;
    cancelar: number;
    correr: number;
    info: number;
    gatilloCorrer: number;
    menu: number;
    arriba: number;
    abajo: number;
    izquierda: number;
    derecha: number;
  };
}

function pulsado(m: MandoLeido, i: number): boolean {
  return m.buttons[i]?.pressed ?? false;
}

/** Cierto solo en el paso en que se pulsa; actualiza `antes`. */
function nuevo(m: MandoLeido, antes: boolean[], i: number): boolean {
  const ahora = pulsado(m, i);
  const era = antes[i] ?? false;
  antes[i] = ahora;
  return ahora && !era;
}

/** Lo que el stick recuerda de un paso a otro: si se estaba moviendo (para la histéresis de la zona muerta). */
export interface EstadoStick {
  moviendo: boolean;
}

/**
 * Escribe en `acciones` lo que hace el mando en este paso: MOVER con la cruceta (si está pulsada) o el
 * stick con zona muerta (empieza a moverse en `zonaMuerta` y no se para hasta bajar de `zonaMuertaSalida`: cerca del
 * borde no parpadea), CONFIRMAR, CANCELAR, MENU e INFO al pulsar y CORRER mientras se mantiene.
 * Devuelve si hubo entrada real (dirección fuera de la zona muerta o algún botón pulsado), para saber
 * cuál es el último dispositivo usado: un mando quieto con algo de deriva en el stick no cuenta.
 */
export function leerMando(
  m: MandoLeido,
  antes: boolean[],
  d: MandoJson,
  acciones: Acciones,
  stick: EstadoStick = { moviendo: false },
): boolean {
  const b = d.botones;
  let hubo = false;

  const dx = (pulsado(m, b.derecha) ? 1 : 0) - (pulsado(m, b.izquierda) ? 1 : 0);
  const dy = (pulsado(m, b.abajo) ? 1 : 0) - (pulsado(m, b.arriba) ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    fijarDireccion(acciones, dx, dy, 0);
    hubo = true;
    stick.moviendo = false;
  } else {
    const ax = m.axes[0] ?? 0;
    const ay = m.axes[1] ?? 0;
    const umbral = stick.moviendo ? d.zonaMuertaSalida : d.zonaMuerta;
    stick.moviendo = Math.hypot(ax, ay) >= umbral;
    if (stick.moviendo) {
      fijarDireccion(acciones, ax, ay, umbral, d.anchoDiagonal);
      hubo = true;
    }
  }

  if (nuevo(m, antes, b.confirmar)) acciones.confirmar = true;
  if (nuevo(m, antes, b.cancelar)) acciones.cancelar = true;
  if (nuevo(m, antes, b.menu)) acciones.menu = true;
  if (nuevo(m, antes, b.info)) acciones.info = true;
  const gatillo = (m.buttons[b.gatilloCorrer]?.value ?? 0) > d.gatillo;
  if (pulsado(m, b.correr) || gatillo) {
    acciones.correr = true;
    hubo = true;
  }

  for (let i = 0; i < m.buttons.length && !hubo; i++) if (pulsado(m, i)) hubo = true;
  return hubo;
}
