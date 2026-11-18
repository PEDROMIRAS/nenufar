import { leerMando, type MandoJson } from '../core/mando';
import { usarDispositivo } from './dispositivo';
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
