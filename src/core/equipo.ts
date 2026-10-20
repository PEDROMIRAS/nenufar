import type { Luchador } from './combate';
import type { Inventario } from './inventario';
import type { EquipoJson, EstadoJson, Estadisticas, HeroeJson, ObjetosJson } from './types';

/**
 * Pieza concreta de una entrada de botín: "arma" de nivel N es la N-ésima arma de la heroína que se
 * juega (así nunca cae el arma de la otra); "armadura" de nivel N, la N-ésima armadura. null si no es equipo.
 */
export function piezaDeBotin(
  objeto: string,
  nivel: number | undefined,
  heroe: HeroeJson | null,
  objetos: ObjetosJson,
): string | null {
  const lista = objeto === 'arma' ? heroe?.armas : objeto === 'armadura' ? objetos.armaduras : null;
  return lista?.[(nivel ?? 1) - 1] ?? null;
}

/** Se pone la pieza `clave` en su hueco: resta los bonos de la que llevaba y suma los de la nueva. */
export function equipar(l: Luchador, inv: Inventario, objetos: ObjetosJson, clave: string): void {
  const nueva = objetos.equipo[clave];
  if (!nueva) throw new Error(`Equipo desconocido: ${clave}`);
  const vieja = inv[nueva.hueco];
  if (vieja) sumarBonos(l, objetos.equipo[vieja]?.bonos ?? {}, -1);
  sumarBonos(l, nueva.bonos, 1);
  inv[nueva.hueco] = clave;
}

function sumarBonos(l: Luchador, bonos: Partial<Estadisticas>, signo: 1 | -1): void {
  for (const [clave, valor] of Object.entries(bonos) as [keyof Estadisticas, number][]) {
    if (clave === 'pv') {
      l.pvMax += signo * valor;
      l.pv = Math.min(l.pv, l.pvMax);
    } else if (clave === 'pm') {
      l.pmMax += signo * valor;
      l.pm = Math.min(l.pm, l.pmMax);
    } else {
      l[clave] += signo * valor;
    }
  }
}

const ETIQUETA: Record<keyof Estadisticas, string> = {
  pv: 'PV',
  pm: 'PM',
  ataque: 'Ataque',
  magia: 'Magia',
  defensa: 'Defensa',
  velocidad: 'Velocidad',
};

/** Líneas que describen una pieza: sus bonos («+6 Ataque») y su efecto, si lo tiene. */
export function describirPieza(pieza: EquipoJson, estados: Record<string, EstadoJson>): string[] {
  const lineas = (Object.entries(pieza.bonos) as [keyof Estadisticas, number][]).map(
    ([clave, valor]) => `+${valor} ${ETIQUETA[clave]}`,
  );
  if (pieza.efecto) {
    const nombre = estados[pieza.efecto.estado]?.nombre ?? pieza.efecto.estado;
    lineas.push(`${Math.round(pieza.efecto.probabilidad * 100)} % de ${nombre} al golpear`);
  }
  return lineas;
}
