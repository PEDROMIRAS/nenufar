import type { Recompensa } from './recompensas';
import type { ConsumibleJson } from './types';

/** Lo que lleva la heroína: consumibles con su cantidad, el equipo puesto y el guardado (claves de objetos.json). */
export interface Inventario {
  consumibles: Record<string, number>;
  arma: string | null;
  armadura: string | null;
  /** Piezas de equipo que tiene pero no lleva puestas: se pueden cambiar desde el inventario. */
  mochila: string[];
  /** Consumibles gastados en toda la partida (para el logro de ganar sin usar ninguno). */
  usados: number;
  /** Recompensas de jefes violetas ganadas en esta partida. */
  recompensas: Recompensa[];
  /** Corazón del dragón negro: sin conseguir (su hueco ni se ve), listo para levantarla o ya gastado. */
  corazon: 'no' | 'lleno' | 'gastado';
}

export function crearInventario(): Inventario {
  return {
    consumibles: {},
    arma: null,
    armadura: null,
    mochila: [],
    usados: 0,
    recompensas: [],
    corazon: 'no',
  };
}

/** Quita uno de ese consumible y lo apunta como usado. */
export function gastar(inv: Inventario, clave: string): void {
  inv.consumibles[clave] = (inv.consumibles[clave] ?? 0) - 1;
  inv.usados++;
}

/** Guarda un consumible si no se ha llegado al máximo de ese tipo. Devuelve si cupo. */
export function guardar(inv: Inventario, clave: string, maximo: number): boolean {
  const cuantos = inv.consumibles[clave] ?? 0;
  if (cuantos >= maximo) return false;
  inv.consumibles[clave] = cuantos + 1;
  return true;
}

/**
 * ¿Haría algo ahora? Con los PV llenos una poción se gastaría para nada (y contaría como usada, que
 * quita el logro de ganar sin objetos): los menús la apagan.
 */
export function haceAlgo(
  l: { pv: number; pvMax: number; pm: number; pmMax: number; estados: readonly { id: string }[] },
  obj: ConsumibleJson,
): boolean {
  return (
    (!!obj.pv && l.pv < l.pvMax) ||
    (!!obj.pm && l.pm < l.pmMax) ||
    (!!obj.quitaEstado && l.estados.some((e) => e.id === obj.quitaEstado))
  );
}

/** Efecto de un consumible sobre quien lo usa: PV y PM recuperados y estado que quita. */
export function aplicarConsumible(
  l: { pv: number; pvMax: number; pm: number; pmMax: number },
  obj: ConsumibleJson,
): { pv: number; pm: number } {
  const pv = Math.min(l.pvMax - l.pv, obj.pv ?? 0);
  const pm = Math.min(l.pmMax - l.pm, obj.pm ?? 0);
  l.pv += pv;
  l.pm += pm;
  return { pv, pm };
}
