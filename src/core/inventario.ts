/** Lo que lleva la heroína: consumibles con su cantidad y el equipo puesto (claves de objetos.json). */
export interface Inventario {
  consumibles: Record<string, number>;
  arma: string | null;
  armadura: string | null;
}

export function crearInventario(): Inventario {
  return { consumibles: {}, arma: null, armadura: null };
}

/** Guarda un consumible si no se ha llegado al máximo de ese tipo. Devuelve si cupo. */
export function guardar(inv: Inventario, clave: string, maximo: number): boolean {
  const cuantos = inv.consumibles[clave] ?? 0;
  if (cuantos >= maximo) return false;
  inv.consumibles[clave] = cuantos + 1;
  return true;
}
