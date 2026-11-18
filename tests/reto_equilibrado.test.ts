import { expect, test } from 'vitest';
import { semillaDelDia } from '../src/core/reto';
import { HEROES } from '../src/data/datos';
import { simularReto } from './simulador';

// Reto del día (spec 2026-11-18): el simulador juega mejor que quien llega por primera vez, así que se le pide
// un 60-70 % de victorias con cada heroína (para que una persona nueva gane más o menos la mitad), las dos a
// menos de 5 puntos, y que ningún día de un año salga injusto (ninguna fecha por debajo del 35 %).
const DIAS = 365;
// Con 20 intentos por fecha el peor día es casi todo ruido (±11 puntos por fecha); con 100, ±5.
const INTENTOS = 100;

function semillasDelAnio(): number[] {
  const semillas: number[] = [];
  const d = new Date(2026, 10, 18);
  for (let i = 0; i < DIAS; i++) {
    semillas.push(
      semillaDelDia({ anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() }),
    );
    d.setDate(d.getDate() + 1);
  }
  return semillas;
}

test('reto del día: 60-70 % con cada heroína, a menos de 5 puntos, y ningún día por debajo del 35 %', () => {
  const semillas = semillasDelAnio();
  const totales: number[] = [];
  for (const nombre of Object.keys(HEROES)) {
    const r = simularReto(nombre, semillas, INTENTOS);
    const peor = Math.min(...r.porFecha);
    console.log(
      `reto · ${nombre}: ${r.total}% · peor día ${peor}% · combates por intento ${r.combates} · jefe ${r.jefe}% · nivel ante el jefe ${r.nivel}`,
    );
    totales.push(r.total);
    expect(r.total).toBeGreaterThanOrEqual(60);
    expect(r.total).toBeLessThanOrEqual(70);
    expect(peor).toBeGreaterThanOrEqual(35);
  }
  expect(Math.max(...totales) - Math.min(...totales)).toBeLessThanOrEqual(5);
}, 120_000);
