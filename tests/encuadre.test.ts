import { describe, expect, test } from 'vitest';
import { colocarSala, desplazamientoX, encajarSala } from '../src/core/encuadre';

const SALA_ANCHO = 672;
const SALA_ALTO = 416;
const TILE = 32;
const d = { columnas: 11, franjaHud: 56 };

describe('encajarSala', () => {
  test('encaja la sala entera y la centra', () => {
    const c = encajarSala(1280, 720, SALA_ANCHO, SALA_ALTO);
    expect(c.escala).toBeCloseTo(720 / 416);
    expect(c.y).toBeCloseTo(0);
    expect(c.x).toBeCloseTo((1280 - (672 * 720) / 416) / 2);
  });
});

describe('colocarSala', () => {
  test('en horizontal es igual que encajarSala', () => {
    expect(colocarSala(1280, 720, d, SALA_ANCHO, SALA_ALTO, TILE)).toEqual(
      encajarSala(1280, 720, SALA_ANCHO, SALA_ALTO),
    );
  });

  test('una ventana cuadrada cuenta como horizontal', () => {
    expect(colocarSala(600, 600, d, SALA_ANCHO, SALA_ALTO, TILE)).toEqual(
      encajarSala(600, 600, SALA_ANCHO, SALA_ALTO),
    );
  });

  test('en vertical caben 11 columnas a todo el ancho y la sala se centra en alto', () => {
    const c = colocarSala(390, 844, d, SALA_ANCHO, SALA_ALTO, TILE);
    expect(c.escala).toBeCloseTo(390 / (11 * 32));
    expect(c.x).toBe(0);
    expect(c.y).toBeCloseTo((844 - 416 * c.escala) / 2);
  });

  test('en vertical muy bajo la sala cabe y no tapa la franja del HUD', () => {
    const c = colocarSala(390, 500, d, SALA_ANCHO, SALA_ALTO, TILE);
    expect(c.escala).toBeCloseTo((500 - 56) / 416);
    expect(c.x).toBe(0);
    expect(c.y).toBe(56);
    expect(c.y + 416 * c.escala).toBeLessThanOrEqual(500);
  });

  test('en vertical no encaja la sala entera: el fondo de combate usa encajarSala', () => {
    expect(colocarSala(390, 844, d, SALA_ANCHO, SALA_ALTO, TILE).escala).not.toBeCloseTo(
      encajarSala(390, 844, SALA_ANCHO, SALA_ALTO).escala,
    );
  });
});

describe('desplazamientoX', () => {
  test('la cámara sigue a la heroína y se detiene en los bordes de la sala', () => {
    expect(desplazamientoX(0, 352, SALA_ANCHO)).toBe(0);
    expect(desplazamientoX(336, 352, SALA_ANCHO)).toBe(160);
    expect(desplazamientoX(672, 352, SALA_ANCHO)).toBe(320);
  });

  test('si se ve más ancho que la sala no hay desplazamiento', () => {
    expect(desplazamientoX(100, 700, SALA_ANCHO)).toBe(0);
  });
});
