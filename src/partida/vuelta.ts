// Caer con la hoguera encendida: sin dependencias del navegador, para poder probarlo (el guardado y la vuelta se pasan).
import type { CopiaHoguera, PartidaGuardada } from '../core/guardado';
import { volverAHoguera } from '../core/hoguera';
import type { Inventario } from '../core/inventario';
import { EscenaNegra } from '../escenas/negra';
import type { PilaEscenas } from '../escenas/pila';

/** Lo que mira la vuelta de la partida en curso. */
export interface PartidaVuelta {
  pila: PilaEscenas;
  brasas: number;
  vueltas: number;
  hoguera: CopiaHoguera | null;
  combates: number;
  inventario: Inventario;
}

/**
 * Si hay hoguera y brasas, quita el mapa en el acto (mientras carga la zona de la hoguera seguiría vivo y el monstruo
 * que la venció volvería a lanzar el combate, guardando encima de la vuelta), guarda la vuelta (cerrar en su página
 * no devuelve la brasa) y la empieza. Dice si ha vuelto.
 */
export function intentarVuelta(
  partida: PartidaVuelta,
  segundos: number,
  guardar: (g: PartidaGuardada) => void,
  volver: (g: PartidaGuardada) => void,
): boolean {
  const vuelta = volverAHoguera(
    {
      brasas: partida.brasas,
      vueltas: partida.vueltas,
      hoguera: partida.hoguera,
      combates: partida.combates,
      usados: partida.inventario.usados,
    },
    segundos,
  );
  if (!vuelta) return false;
  partida.pila.cambiar(new EscenaNegra());
  guardar(vuelta);
  volver(vuelta);
  return true;
}
