import { describe, expect, test } from 'vitest';
import { DIFICULTADES, HEROES, PRESAGIOS } from '../src/data/datos';
import { simular } from './simulador';

const PARTIDAS = 300;

// Guarda contra desvíos grandes: cada presagio, forzado en las cuatro zonas, no mueve la victoria de partida
// completa más de 8 puntos respecto a no tener presagio. Con 300 partidas cada celda baila ±3-4 por el azar,
// así que esto no comprueba el equilibrado fino: las cifras se buscaron con 1200 y 2400 partidas (media de las
// seis celdas heroína × dificultad dentro de ±1,5 y ninguna celda a más de 4 puntos). La ronin en Difícil con
// la fuente seca sale 3,6 puntos por debajo con 2400 partidas y de 3,9 a 7 con 300-1200: la maga cura con un hechizo y la ronin no.
const TOLERANCIA = 8;

describe.each(Object.keys(PRESAGIOS.lista))('presagio %s forzado', (clave) => {
  test.each(Object.entries(DIFICULTADES))(
    '%s: la victoria en partida completa se queda cerca de la de sin presagio',
    (dif, dificultad) => {
      for (const nombre of Object.keys(HEROES)) {
        const sin = simular(nombre, PARTIDAS, dificultad).completas;
        const con = simular(nombre, PARTIDAS, dificultad, undefined, { forzado: clave }).completas;
        console.log(`${clave} · ${dif} · ${nombre}: sin ${sin}% · con ${con}%`);
        expect(Math.abs(con - sin)).toBeLessThanOrEqual(TOLERANCIA);
      }
    },
    120_000,
  );
});
