import { habilidadesConocidas, type Luchador } from './combate';

/**
 * Las habilidades equipadas de la heroína: lleva como mucho `equipables` (heroes.json) de las que conoce y en combate
 * solo puede usar esas. Se cambian en la pantalla Habilidades (al entrar en cada zona, junto a la fuente y antes del
 * jefe final).
 */

const maximo = (l: Luchador): number => l.heroe?.equipables ?? 0;

/** Las primeras que conoce, hasta su máximo: con las que empieza. */
export function equipadasIniciales(l: Luchador): string[] {
  return habilidadesConocidas(l)
    .slice(0, maximo(l))
    .map((h) => h.nombre);
}

/**
 * Pone o quita la habilidad `nombre`: `'quitada'` si la llevaba, `'puesta'` si cabía, `'llena'` si ya lleva su máximo
 * (o no la conoce), sin cambiar nada.
 */
export function alternarEquipada(l: Luchador, nombre: string): 'puesta' | 'quitada' | 'llena' {
  if (l.equipadas.includes(nombre)) {
    l.equipadas = l.equipadas.filter((n) => n !== nombre);
    return 'quitada';
  }
  const conoce = habilidadesConocidas(l).some((h) => h.nombre === nombre);
  if (!conoce || l.equipadas.length >= maximo(l)) return 'llena';
  l.equipadas = [...l.equipadas, nombre];
  return 'puesta';
}

/** ¿Lleva todas las que debe? Su máximo, o todas las que conoce si son menos. */
export function puedeCerrar(l: Luchador): boolean {
  return l.equipadas.length === Math.min(maximo(l), habilidadesConocidas(l).length);
}

/** Quita las que no conoce (una partida de otra versión, otro nivel) y, si no queda ninguna, pone las iniciales. */
export function ajustarEquipadas(l: Luchador): void {
  const conocidas = new Set(habilidadesConocidas(l).map((h) => h.nombre));
  l.equipadas = l.equipadas.filter((n) => conocidas.has(n)).slice(0, maximo(l));
  if (l.equipadas.length === 0) l.equipadas = equipadasIniciales(l);
}
