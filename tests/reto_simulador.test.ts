import { expect, test } from 'vitest';
import { semillaDelDia } from '../src/core/reto';
import { elegirDia, porcentajeReto } from '../src/core/diaJusto';
import {
  datosReto,
  generarZonaReto,
  gruposDelMapaReto,
  gruposDelReto,
  simularReto,
} from './simulador';

// Revisión final: el simulador sorteaba los grupos en cada intento y así no medía el mapa del día, que en el juego
// es fijo (montarSalaZona y sortearGrupos, con la semilla de la zona y la sala).
test('cada intento del simulador del reto lucha los grupos del mapa del día, en orden', () => {
  const semilla = semillaDelDia({ anio: 2026, mes: 11, dia: 18 });
  const delDia = gruposDelReto(semilla);
  expect(delDia.length).toBeGreaterThan(0);
  const registro: string[][][] = [];
  simularReto('ronin', [semilla], 5, registro);
  expect(registro).toHaveLength(5);
  for (const luchados of registro) expect(luchados).toEqual(delDia.slice(0, luchados.length));
});

test('el día elegido es siempre el mismo y ninguna rana se sale de la banda en la comprobación', () => {
  const d = datosReto();
  const semilla = semillaDelDia({ anio: 2027, mes: 2, dia: 3 });
  const zona = elegirDia(semilla, generarZonaReto, gruposDelMapaReto, d);
  expect(elegirDia(semilla, generarZonaReto, gruposDelMapaReto, d).semilla).toBe(zona.semilla);
  const grupos = gruposDelMapaReto(zona);
  for (const heroe of d.heroes) {
    const p = porcentajeReto(zona, grupos, heroe, d, d.comprobacion.intentos, zona.semilla * 97);
    expect(p).toBeGreaterThanOrEqual(d.comprobacion.minimo);
    expect(p).toBeLessThanOrEqual(d.comprobacion.maximo);
  }
});
