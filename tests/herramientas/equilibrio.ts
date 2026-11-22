// Herramientas de equilibrado: medir lo que miran los tests de equilibrado (con las partidas que se pidan) y puntuar
// cuánto se aleja de sus objetivos. Las usan `equilibrio.test.ts` (medir) y `buscar.ts` (buscar parámetros).
import { crearAzar } from '../../src/core/azar';
import { DIFICULTADES, HEROES } from '../../src/data/datos';
import zonas from '../../src/data/zonas.json';
import { simular, pelear, pct, type Cuenta } from '../simulador';

/** Variables de entorno (sin los tipos de Node): N, EVALS, SEMILLA… para lanzar las herramientas. */
export const entorno: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env ?? {};

/**
 * Los objetivos de los tests (copiados de equilibrado.test.ts y violetas.test.ts): partidas completas por dificultad,
 * menos de 5 puntos entre heroínas, media de violetas a ±12 de su objetivo, ningún combate violeta bajo el 25 % y el
 * dragón entre 20 por debajo y 10 por encima del violeta de su zona.
 */
export const OBJETIVOS = {
  completas: { facil: [65, 75], normal: [45, 55], dificil: [25, 35] } as Record<
    string,
    [number, number]
  >,
  diferencia: 5,
  violetas: { facil: 65, normal: 50, dificil: 35 } as Record<string, number>,
  margenVioletas: 12,
  suelo: 25,
  dragon: [-20, 10] as [number, number],
};

export interface MedidaHeroina {
  completas: number;
  /** Victorias contra el violeta y el dragón de cada zona («bosque/violeta», «bosque/dragon»…). */
  violetas: Record<string, number>;
  mediaVioletas: number;
}
export type Medida = Record<string, Record<string, MedidaHeroina>>;

/** Lo que miden los tests, con `n` partidas por heroína y dificultad (el test usa 300; para fiarse, 1200). */
export function medir(n: number): Medida {
  const medida: Medida = {};
  for (const [clave, d] of Object.entries(DIFICULTADES)) {
    medida[clave] = {};
    for (const nombre of Object.keys(HEROES)) {
      const propias: Record<string, Cuenta> = {};
      const r = simular(nombre, n, d, (zona, h, inv, mundo, s) => {
        const rivales = {
          violeta: zonas.zonas[zona].jefeVioleta,
          dragon: zonas.violetas.dragon[zona],
        };
        for (const [tipo, rival] of Object.entries(rivales)) {
          // El mismo azar que violetas.test.ts: con n = 300 da sus mismas cifras.
          const azar = crearAzar(s * 173 + rival.length);
          const gana = pelear(structuredClone(h), structuredClone(inv), [rival], azar, mundo);
          const c = (propias[`${zona}/${tipo}`] ??= { ganados: 0, jugados: 0 });
          c.jugados++;
          if (gana) c.ganados++;
        }
      });
      const violetas = Object.fromEntries(Object.entries(propias).map(([k, c]) => [k, pct(c)]));
      const vs = Object.keys(zonas.zonas).map((z) => violetas[`${z}/violeta`] ?? 0);
      medida[clave][nombre] = {
        completas: r.completas,
        violetas,
        mediaVioletas: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10,
      };
    }
  }
  return medida;
}

/**
 * Cuánto se sale `m` de los objetivos dejando `margen` puntos dentro de cada borde (0 = lo justo para pasar los tests):
 * la suma de lo que se sale; 0 si todo cumple. Con las cosas que fallan, en texto.
 */
export function puntuar(m: Medida, margen: number): { pena: number; fallos: string[] } {
  let pena = 0;
  const fallos: string[] = [];
  const fuera = (que: string, v: number, lo: number, hi: number): void => {
    const d = v < lo ? lo - v : v > hi ? v - hi : 0;
    if (d > 0) {
      pena += d;
      fallos.push(`${que} ${v} (${lo}-${hi})`);
    }
  };
  for (const [dif, porHeroina] of Object.entries(m)) {
    const [lo, hi] = OBJETIVOS.completas[dif]!;
    const objetivo = OBJETIVOS.violetas[dif]!;
    const comp = Object.values(porHeroina).map((h) => h.completas);
    fuera(`${dif} diferencia`, Math.abs(comp[0]! - comp[1]!), 0, OBJETIVOS.diferencia - margen);
    for (const [nombre, h] of Object.entries(porHeroina)) {
      fuera(`${dif} ${nombre} completas`, h.completas, lo + margen, hi - margen);
      const a = OBJETIVOS.margenVioletas - margen;
      fuera(`${dif} ${nombre} violetas`, h.mediaVioletas, objetivo - a, objetivo + a);
      for (const [k, v] of Object.entries(h.violetas))
        fuera(`${dif} ${nombre} ${k}`, v, OBJETIVOS.suelo + margen, 101);
    }
    for (const z of Object.keys(zonas.zonas)) {
      const media = (tipo: string): number =>
        Object.values(porHeroina).reduce((s, h) => s + (h.violetas[`${z}/${tipo}`] ?? 0), 0) /
        Object.keys(porHeroina).length;
      const [dlo, dhi] = OBJETIVOS.dragon;
      fuera(
        `${dif} ${z} dragón−violeta`,
        Math.round(media('dragon') - media('violeta')),
        dlo + margen,
        dhi - margen,
      );
    }
  }
  return { pena: Math.round(pena * 10) / 10, fallos };
}

/** La medida en una tabla para leer: por dificultad y heroína, completas, media de violetas y cada violeta. */
export function tabla(m: Medida): string {
  const filas: string[] = [];
  for (const [dif, porHeroina] of Object.entries(m))
    for (const [nombre, h] of Object.entries(porHeroina)) {
      const vs = Object.keys(zonas.zonas)
        .map((z) => `${z} ${h.violetas[`${z}/violeta`]}/${h.violetas[`${z}/dragon`]}`)
        .join(' · ');
      filas.push(
        `${dif} · ${nombre}: completas ${h.completas} · violetas ${h.mediaVioletas} [${vs}]`,
      );
    }
  return filas.join('\n');
}
