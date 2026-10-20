import type { ConsumibleJson } from './types';

/** Lo que lleva la heroína: consumibles con su cantidad, el equipo puesto y el guardado (claves de objetos.json). */
export interface Inventario {
  consumibles: Record<string, number>;
  arma: string | null;
  armadura: string | null;
  /** Piezas de equipo que tiene pero no lleva puestas: se pueden cambiar desde el inventario. */
  mochila: string[];
}

export function crearInventario(): Inventario {
  return { consumibles: {}, arma: null, armadura: null, mochila: [] };
}

/** Guarda un consumible si no se ha llegado al máximo de ese tipo. Devuelve si cupo. */
export function guardar(inv: Inventario, clave: string, maximo: number): boolean {
  const cuantos = inv.consumibles[clave] ?? 0;
  if (cuantos >= maximo) return false;
  inv.consumibles[clave] = cuantos + 1;
  return true;
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
