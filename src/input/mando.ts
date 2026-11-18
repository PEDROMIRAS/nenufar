import type { Vibracion } from '../core/impacto';
import { leerMando, type MandoJson } from '../core/mando';
import { dispositivo, usarDispositivo } from './dispositivo';
import type { FuenteEntrada } from './fuente';

/** Botones que se recuerdan del paso anterior (la asignación estándar tiene 17). */
const BOTONES = 20;

/** El primer mando conectado, o null. Recorre la lista del navegador sin copiarla. */
export function mandoActual(): Gamepad | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const lista = navigator.getGamepads();
  for (let i = 0; i < lista.length; i++) {
    const m = lista[i];
    if (m && m.connected) return m;
  }
  return null;
}

/** Fuente de entrada del mando: lee la API Gamepad en cada paso lógico. */
export function crearMando(d: MandoJson): FuenteEntrada {
  const antes = new Array<boolean>(BOTONES).fill(false);
  return {
    leer(acciones) {
      const m = mandoActual();
      if (!m) {
        // Al reconectar no puede quedar un botón «pegado» del mando de antes.
        antes.fill(false);
        return;
      }
      if (leerMando(m, antes, d, acciones)) usarDispositivo('mando');
    },
  };
}

/**
 * Hace vibrar el mando, escalado con el Temblor efectivo (0 = nada). Solo si se juega con el mando y el
 * navegador sabe hacerlo vibrar (Safari y Firefox no tienen `vibrationActuator`): si no, no hace nada.
 */
export function vibrar(v: Vibracion, temblor: number): void {
  if (temblor <= 0 || dispositivo() !== 'mando') return;
  const motor = mandoActual()?.vibrationActuator;
  if (!motor || typeof motor.playEffect !== 'function') return;
  motor
    .playEffect('dual-rumble', {
      duration: v.duracion * 1000,
      strongMagnitude: Math.min(1, v.fuerte * temblor),
      weakMagnitude: Math.min(1, v.debil * temblor),
    })
    .catch(() => {});
}

/** Cuántas veces ha avisado el navegador de un mando nuevo (tras pulsar su primer botón en la página). */
let conexiones = 0;
if (typeof addEventListener === 'function')
  addEventListener('gamepadconnected', () => conexiones++);

export function conexionesMando(): number {
  return conexiones;
}
