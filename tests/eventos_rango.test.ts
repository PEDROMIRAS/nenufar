import { describe, expect, test } from 'vitest';
import { DIFICULTADES, EVENTOS, HEROES } from '../src/data/datos';
import { simular } from './simulador';

const PARTIDAS = 300;

// Guarda contra desvíos grandes: con la probabilidad de eventos de eventos.json y su reparto entre altares y
// desafíos en las cuatro zonas, la victoria de partida completa no se mueve más de 8 puntos respecto a no tener
// ninguno. Con 300 partidas cada celda baila ±3-4 por el azar, así que esto no comprueba el equilibrado fino:
// se buscó con 2400 partidas (todas las celdas heroína × dificultad dentro de ±3; la peor, la maga en Normal, −2,4).
const TOLERANCIA = 8;

describe('eventos con la probabilidad y el reparto de eventos.json', () => {
  test.each(Object.entries(DIFICULTADES))(
    '%s: la victoria en partida completa se queda cerca de la de sin eventos',
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
          EVENTOS.desafio.fraccion,
        ).completas;
        console.log(`eventos · ${dif} · ${nombre}: sin ${sin}% · con ${con}%`);
        expect(Math.abs(con - sin)).toBeLessThanOrEqual(TOLERANCIA);
      }
    },
    120_000,
  );
});
