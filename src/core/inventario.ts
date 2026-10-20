/** Lo que lleva la heroína: consumibles por clave de objetos.json, con su cantidad. */
export interface Inventario {
  consumibles: Record<string, number>;
}

export function crearInventario(): Inventario {
  return { consumibles: {} };
}

/** Guarda un consumible si no se ha llegado al máximo de ese tipo. Devuelve si cupo. */
export function guardar(inv: Inventario, clave: string, maximo: number): boolean {
  const cuantos = inv.consumibles[clave] ?? 0;
  if (cuantos >= maximo) return false;
  inv.consumibles[clave] = cuantos + 1;
  return true;
}
