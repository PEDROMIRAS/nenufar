// Herramientas de equilibrado, saltadas en la suite normal. Se lanzan con:
//   npm run equilibrio                 → mide (N=1200 partidas por defecto) y dice qué se sale de los tests
//   npm run equilibrio:buscar          → busca parámetros (EVALS=40, N=300, MARGEN=2, SEMILLA=7) alrededor de los de ahora
//   npm run equilibrio:reto            → mide el reto del día (FECHAS=120 días, INTENTOS=50)
// La búsqueda no toca los JSON: imprime los valores que hay que copiar. Con N=300 da las mismas cifras que los tests.
import { describe, test } from 'vitest';
import { semillaDelDia } from '../../src/core/reto';
import { DIFICULTADES, HEROES, MONSTRUOS } from '../../src/data/datos';
import { simularReto } from '../simulador';
import { buscar, campoDe, poderDe, vidaDe, type Parametro } from './buscar';
import { entorno, medir, puntuar, tabla } from './equilibrio';

const modo = entorno.EQUILIBRIO ?? '';
const numero = (clave: string, defecto: number): number => Number(entorno[clave] ?? defecto);
const LARGO = 3_600_000;

/** Lo que mueve la búsqueda por defecto: las palancas del reequilibrado del 2026-11-22, ±10 % o ±0,03 de lo de ahora. */
function parametros(): Parametro[] {
  const vida = (clave: string): Parametro => {
    const pv = MONSTRUOS[clave]!.estadisticas.pv;
    return vidaDe(clave, pv * 0.9, pv * 1.1);
  };
  const campo = (d: keyof typeof DIFICULTADES, c: 'violetas' | 'recuperacion'): Parametro => {
    const v = DIFICULTADES[d][c];
    return campoDe(d, c, v - 0.03, v + 0.03);
  };
  const poder = (heroe: keyof typeof HEROES, nombre: string): Parametro => {
    const p = HEROES[heroe]!.habilidades.find((x) => x.nombre === nombre)!.danio!.poder;
    return poderDe(heroe, nombre, p - 0.03, p + 0.03);
  };
  return [
    ...[
      'arbol_maldito',
      'caballero_maldito',
      'ojo_flotante',
      'oni',
      'dragon_negro_bosque',
      'dragon_negro_ruinas',
      'dragon_negro_cripta',
      'dragon_negro_cauce',
    ].map(vida),
    campo('facil', 'violetas'),
    campo('normal', 'violetas'),
    campo('dificil', 'violetas'),
    campo('dificil', 'recuperacion'),
    poder('maga', 'Fuego morado'),
    poder('ronin', 'Tajo del viento'),
  ];
}

describe.runIf(modo === 'medir')('equilibrio: medir', () => {
  test('lo que miden los tests, con N partidas', { timeout: LARGO }, () => {
    const m = medir(numero('N', 1200));
    const { fallos } = puntuar(m, numero('MARGEN', 0));
    console.log(`${tabla(m)}\n\nSe sale: ${fallos.length ? fallos.join(' · ') : 'nada'}`);
  });
});

describe.runIf(modo === 'buscar')('equilibrio: buscar', () => {
  test('busca parámetros que entren con margen', { timeout: LARGO }, () => {
    const r = buscar(
      parametros(),
      {
        evaluaciones: numero('EVALS', 40),
        n: numero('N', 300),
        margen: numero('MARGEN', 2),
        semilla: numero('SEMILLA', 7),
      },
      (i, pena) => console.log(`evaluación ${i}: pena ${pena}`),
    );
    console.log(
      `\nMejor (pena ${r.pena}; se sale: ${r.fallos.join(' · ') || 'nada'}):\n` +
        Object.entries(r.valores)
          .map(([k, v]) => `  ${k} = ${v}`)
          .join('\n') +
        `\n\n${tabla(r.medida)}`,
    );
  });
});

describe.runIf(modo === 'reto')('equilibrio: reto del día', () => {
  test('cada rana en una muestra de días', { timeout: LARGO }, () => {
    const fechas = numero('FECHAS', 120);
    const semillas = Array.from({ length: fechas }, (_, i) => {
      const d = new Date(2026, 0, 1 + Math.floor((i * 365) / fechas));
      return semillaDelDia({ anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() });
    });
    for (const n of Object.keys(HEROES)) {
      const r = simularReto(n, semillas, numero('INTENTOS', 50));
      console.log(
        `reto · ${n}: ${r.total} % · peor día ${Math.min(...r.porFecha)} % · mejor ${Math.max(...r.porFecha)} %`,
      );
    }
  });
});
