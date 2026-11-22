// Búsqueda de parámetros de equilibrado: cambia los datos en memoria (no los JSON), mide y se queda con lo que menos se
// sale de los objetivos de los tests. Lo encontrado hay que copiarlo a mano a los JSON; ver equilibrio.test.ts.
import { crearAzar } from '../../src/core/azar';
import { DIFICULTADES, HEROES, MONSTRUOS } from '../../src/data/datos';
import { medir, puntuar, type Medida } from './equilibrio';

/** Un número de los datos que la búsqueda puede mover, entre `rango`. */
export interface Parametro {
  nombre: string;
  rango: [number, number];
  leer(): number;
  poner(valor: number): void;
}

/** Vida de un monstruo (entera). */
export function vidaDe(clave: string, desde: number, hasta: number): Parametro {
  const e = MONSTRUOS[clave]!.estadisticas;
  return {
    nombre: `${clave}.pv`,
    rango: [desde, hasta],
    leer: () => e.pv,
    poner: (v) => (e.pv = Math.round(v)),
  };
}

/** Ataque y magia de un monstruo, a la vez, como factor sobre los de ahora (1 = como está). */
export function ataqueDe(clave: string, desde: number, hasta: number): Parametro {
  const e = MONSTRUOS[clave]!.estadisticas;
  const base = { ataque: e.ataque, magia: e.magia };
  let factor = 1;
  return {
    nombre: `${clave}.ataque×`,
    rango: [desde, hasta],
    leer: () => factor,
    poner: (v) => {
      factor = v;
      e.ataque = Math.round(base.ataque * v);
      e.magia = Math.round(base.magia * v);
    },
  };
}

/** Un campo de una dificultad (`violetas`, `recuperacion`…), con 3 decimales. */
export function campoDe(
  dificultad: keyof typeof DIFICULTADES,
  campo: 'ataque' | 'vida' | 'recuperacion' | 'violetas',
  desde: number,
  hasta: number,
): Parametro {
  const d = DIFICULTADES[dificultad];
  return {
    nombre: `${dificultad}.${campo}`,
    rango: [desde, hasta],
    leer: () => d[campo],
    poner: (v) => (d[campo] = Math.round(v * 1000) / 1000),
  };
}

/** El poder de una habilidad de una rana, con 2 decimales. */
export function poderDe(
  heroe: keyof typeof HEROES,
  habilidad: string,
  desde: number,
  hasta: number,
): Parametro {
  const h = HEROES[heroe]!.habilidades.find((x) => x.nombre === habilidad)!;
  return {
    nombre: `${heroe}.${habilidad}.poder`,
    rango: [desde, hasta],
    leer: () => h.danio!.poder,
    poner: (v) => (h.danio!.poder = Math.round(v * 100) / 100),
  };
}

export interface Resultado {
  valores: Record<string, number>;
  pena: number;
  fallos: string[];
  medida: Medida;
}

/**
 * Prueba `evaluaciones` combinaciones (la primera, la de ahora; un tercio al azar en los rangos; el resto cerca de la
 * mejor) con `n` partidas y `margen` puntos de holgura dentro de cada objetivo. Deja puestos los valores de la mejor.
 * `alAvanzar`, si se pasa, recibe cada evaluación (para ir viéndolo).
 */
export function buscar(
  parametros: readonly Parametro[],
  o: { evaluaciones: number; n: number; margen: number; semilla: number },
  alAvanzar?: (i: number, pena: number) => void,
): Resultado {
  const azar = crearAzar(o.semilla);
  const leer = (): Record<string, number> =>
    Object.fromEntries(parametros.map((p) => [p.nombre, p.leer()]));
  const poner = (valores: Record<string, number>): void => {
    for (const p of parametros) p.poner(valores[p.nombre]!);
  };
  let mejor: Resultado | null = null;
  for (let i = 0; i < o.evaluaciones; i++) {
    const valores =
      i === 0
        ? leer()
        : Object.fromEntries(
            parametros.map((p) => {
              const [lo, hi] = p.rango;
              const cerca = mejor && i >= o.evaluaciones / 3;
              const v = cerca
                ? mejor!.valores[p.nombre]! + (azar() - 0.5) * (hi - lo) * 0.25
                : lo + azar() * (hi - lo);
              return [p.nombre, Math.min(hi, Math.max(lo, v))];
            }),
          );
    poner(valores);
    const medida = medir(o.n);
    const { pena, fallos } = puntuar(medida, o.margen);
    alAvanzar?.(i, pena);
    if (!mejor || pena < mejor.pena) mejor = { valores: leer(), pena, fallos, medida };
    if (pena === 0) break;
  }
  poner(mejor!.valores);
  return mejor!;
}
