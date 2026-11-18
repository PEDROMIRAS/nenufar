import type { Acciones } from './acciones';
import { fijarDireccion } from './direccion';

/** Lo que se lee de un mando. Un `Gamepad` del navegador lo cumple, así que no se copia nada. */
export interface MandoLeido {
  buttons: readonly { pressed: boolean; value: number }[];
  axes: readonly number[];
}

/** Sección `mando` de `controles.json`: índices de la asignación estándar de la API Gamepad. */
export interface MandoJson {
  zonaMuerta: number;
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

/**
 * Escribe en `acciones` lo que hace el mando en este paso: MOVER con la cruceta (si está pulsada) o el
 * stick con zona muerta, CONFIRMAR, CANCELAR, MENU e INFO al pulsar y CORRER mientras se mantiene.
 * Devuelve si hubo entrada real (dirección fuera de la zona muerta o algún botón pulsado), para saber
 * cuál es el último dispositivo usado: un mando quieto con algo de deriva en el stick no cuenta.
 */
export function leerMando(
  m: MandoLeido,
  antes: boolean[],
  d: MandoJson,
  acciones: Acciones,
): boolean {
  const b = d.botones;
  let hubo = false;

  const dx = (pulsado(m, b.derecha) ? 1 : 0) - (pulsado(m, b.izquierda) ? 1 : 0);
  const dy = (pulsado(m, b.abajo) ? 1 : 0) - (pulsado(m, b.arriba) ? 1 : 0);
  if (dx !== 0 || dy !== 0) {
    fijarDireccion(acciones, dx, dy, 0);
    hubo = true;
  } else {
    const ax = m.axes[0] ?? 0;
    const ay = m.axes[1] ?? 0;
    if (Math.hypot(ax, ay) >= d.zonaMuerta) {
      fijarDireccion(acciones, ax, ay, d.zonaMuerta);
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
