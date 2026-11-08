import { describe, expect, test } from 'vitest';
import { DIFICULTADES, EVENTOS, HEROES } from '../src/data/datos';
import { simular } from './simulador';

const PARTIDAS = 300;

// Guarda contra desvíos grandes: con la probabilidad de altar de eventos.json en las cuatro zonas, la victoria
// de partida completa no se mueve más de 8 puntos respecto a no tener ninguno. Con 300 partidas cada celda
// baila ±3-4 por el azar, así que esto no comprueba el equilibrado fino: la experiencia del altar se buscó con
// 2400 partidas (todas las celdas heroína × dificultad dentro de ±3; la maga en Difícil, +2,4, es la más alta).
const TOLERANCIA = 8;

describe('altar con la probabilidad de eventos.json', () => {
  test.each(Object.entries(DIFICULTADES))(
    '%s: la victoria en partida completa se queda cerca de la de sin altar',
    (dif, dificultad) => {
      for (const nombre of Object.keys(HEROES)) {
        const sin = simular(nombre, PARTIDAS, dificultad).completas;
        const con = simular(
          nombre,
          PARTIDAS,
          dificultad,
          undefined,
          undefined,
          EVENTOS.probabilidad,
        ).completas;
        console.log(`altar · ${dif} · ${nombre}: sin ${sin}% · con ${con}%`);
        expect(Math.abs(con - sin)).toBeLessThanOrEqual(TOLERANCIA);
      }
    },
    120_000,
  );

  test('con probabilidad 0 sale exactamente lo mismo que sin altar', () => {
    const sin = simular('ronin', 100, DIFICULTADES.normal);
    expect(simular('ronin', 100, DIFICULTADES.normal, undefined, undefined, 0)).toEqual(sin);
  });
});
