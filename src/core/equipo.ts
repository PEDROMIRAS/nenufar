import type { Luchador } from './combate';
import { elegirConPeso } from './azar';
import { guardar, type Inventario } from './inventario';
import type {
  BotinJson,
  EquipoJson,
  EstadoJson,
  Estadisticas,
  HeroeJson,
  ObjetosJson,
} from './types';

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
  if (pieza.efecto) lineas.push(describirEfecto(pieza.efecto, estados));
  return lineas;
}

/** El efecto especial de una pieza: «10 % de Veneno al golpear». */
export function describirEfecto(
  efecto: NonNullable<EquipoJson['efecto']>,
  estados: Record<string, EstadoJson>,
): string {
  const nombre = estados[efecto.estado]?.nombre ?? efecto.estado;
  return `${Math.round(efecto.probabilidad * 100)} % de ${nombre} al golpear`;
}

/** Lo que sale de un cofre: un consumible (que se guarda si cabe) o una pieza de equipo por decidir. */
export type Hallazgo =
  { tipo: 'consumible'; nombre: string; guardado: boolean } | { tipo: 'equipo'; clave: string };

/**
 * Abre un cofre con la tabla de su zona: tira una vez y guarda el consumible o devuelve la pieza.
 * Como en el botín, nunca sale la pieza que ya se lleva puesta.
 */
export function abrirCofre(
  tabla: readonly BotinJson[],
  azar: () => number,
  heroe: HeroeJson | null,
  objetos: ObjetosJson,
  inv: Inventario,
): Hallazgo | null {
  const yaPuesta = (e: BotinJson): boolean => {
    const clave = piezaDeBotin(e.objeto, e.nivel, heroe, objetos);
    const hueco = clave ? objetos.equipo[clave]?.hueco : undefined;
    return hueco !== undefined && inv[hueco] === clave;
  };
  const entrada = elegirConPeso(
    tabla.filter((e) => !yaPuesta(e)),
    azar,
  );
  if (!entrada) return null;
  const consumible = objetos.consumibles[entrada.objeto];
  if (consumible) {
    return {
      tipo: 'consumible',
      nombre: consumible.nombre,
      guardado: guardar(inv, entrada.objeto, objetos.maximoPorTipo),
    };
  }
  const clave = piezaDeBotin(entrada.objeto, entrada.nivel, heroe, objetos);
  return clave ? { tipo: 'equipo', clave } : null;
}

/**
 * Qué colores de la hoja de la heroína cambian con su equipo puesto: pares [original, nuevo] en hex.
 * El arma recolorea su parte «arma» y la armadura, su «ropa».
 */
export function coloresDeEquipo(
  heroe: HeroeJson,
  inv: Inventario,
  objetos: ObjetosJson,
): [string, string][] {
  const pares: [string, string][] = [];
  const huecos = [
    ['arma', 'arma'],
    ['armadura', 'ropa'],
  ] as const;
  for (const [hueco, parte] of huecos) {
    const clave = inv[hueco];
    const tinte = clave ? objetos.equipo[clave]?.tinte : undefined;
    if (!tinte) continue;
    heroe.tintes[parte].forEach((desde, i) => {
      const hacia = tinte[i];
      if (hacia) pares.push([desde, hacia]);
    });
  }
  return pares;
}
