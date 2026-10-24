import type { Luchador } from './combate';
import { guardarPieza } from './equipo';
import type { Inventario } from './inventario';
import type { HeroeJson } from './types';

/** Lo que da un jefe violeta: el arma, la armadura o la quinta habilidad especiales de la heroína. */
export type Recompensa = 'arma' | 'armadura' | 'habilidad';

const TODAS: readonly Recompensa[] = ['arma', 'armadura', 'habilidad'];

/** Una al azar entre las que aún no tiene; null si ya las tiene todas. */
export function elegirRecompensa(
  ganadas: readonly Recompensa[],
  azar: () => number,
): Recompensa | null {
  const faltan = TODAS.filter((r) => !ganadas.includes(r));
  return faltan[Math.floor(azar() * faltan.length)] ?? null;
}

/**
 * La heroína gana la recompensa: el arma y la armadura van a la mochila (la escena le ofrece
 * ponérselas) y la habilidad queda disponible. Devuelve la clave de la pieza o el nombre de la habilidad.
 */
export function aplicarRecompensa(
  l: Luchador,
  inv: Inventario,
  heroe: HeroeJson,
  r: Recompensa,
): string {
  inv.recompensas.push(r);
  const ganado = heroe.especiales[r];
  if (r === 'habilidad') l.habilidadesGanadas.push(ganado);
  else guardarPieza(inv, ganado);
  return ganado;
}
