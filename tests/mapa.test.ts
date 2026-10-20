import { describe, expect, test } from 'vitest';
import {
  objetoAlAlcance,
  opuesto,
  portalPisado,
  posicionEntrada,
  salaVecina,
  salidaPisada,
} from '../src/core/mapa';
import { salidas } from '../src/core/sala';
import { E, N, O, S, type Zona } from '../src/core/zona';

const T = 32;
const lista = salidas(15, 11);
const salida = (lado: number) => lista.find((s) => s.lado === lado)!;

describe('salidaPisada', () => {
  test('detecta la salida cuando los pies están en su casilla del borde y hay puerta', () => {
    expect(salidaPisada(lista, N | E, T, 7 * T + 16, 20)?.lado).toBe(N);
    expect(salidaPisada(lista, N | E, T, 14 * T + 10, 5 * T + 20)?.lado).toBe(E);
  });

  test('sin puerta en ese lado no hay salida', () => {
    expect(salidaPisada(lista, E, T, 7 * T + 16, 20)).toBeNull();
  });

  test('la norte salta ya en la segunda fila del muro, y no antes', () => {
    // y = 64 es justo el borde entre la fila 1 y la 2: los pies apoyan en la fila 1.
    expect(salidaPisada(lista, N, T, 7 * T + 16, 2 * T)?.lado).toBe(N);
    expect(salidaPisada(lista, N, T, 7 * T + 16, 2 * T + 1)).toBeNull();
  });
});

test('salaVecina y opuesto recorren la rejilla en los cuatro sentidos', () => {
  const zona: Zona = {
    semilla: 0,
    salas: [
      { x: 1, y: 1, tipo: 'inicio', distancia: 0, puertas: N | E | S | O },
      { x: 1, y: 0, tipo: 'combate', distancia: 1, puertas: S },
      { x: 2, y: 1, tipo: 'combate', distancia: 1, puertas: O },
      { x: 1, y: 2, tipo: 'combate', distancia: 1, puertas: N },
      { x: 0, y: 1, tipo: 'combate', distancia: 1, puertas: E },
    ],
  };
  const centro = zona.salas[0]!;
  for (const lado of [N, E, S, O]) {
    const vecina = salaVecina(zona, centro, lado)!;
    expect(vecina.puertas).toBe(opuesto(lado));
    expect(salaVecina(zona, vecina, opuesto(lado))).toBe(centro);
  }
});

test('al entrar por el norte se aparece bajo la puerta, no encima de la salida', () => {
  const pos = posicionEntrada(salida(N), T, 8);
  expect(pos).toEqual({ x: 7 * T + 16, y: 2 * T + 20 });
  expect(salidaPisada(lista, N, T, pos.x, pos.y)).toBeNull();
});

test('portalPisado solo se activa con los pies en la casilla del portal', () => {
  const portal = { name: 'portal', index: 0, layer: 'objeto' as const, solid: false, hoja: 0 };
  const roca = { ...portal, name: 'roca', solid: true };
  const sala = {
    ancho: 15,
    alto: 11,
    base: [],
    solido: [],
    cajas: [],
    objetos: [
      { x: 2, y: 2, inf: roca, sup: null },
      { x: 11, y: 3, inf: portal, sup: null },
    ],
  };
  expect(portalPisado(sala, T, 11 * T + 16, 3 * T + 20)).toBe(true);
  expect(portalPisado(sala, T, 10 * T + 16, 3 * T + 20)).toBe(false);
  expect(portalPisado(sala, T, 2 * T + 16, 2 * T + 20)).toBe(false);
});

test('objetoAlAlcance: pegada a la fuente sí, a un paso de distancia no', () => {
  const fuente = { name: 'fuente', index: 0, layer: 'objeto' as const, solid: true, hoja: 0 };
  const sala = {
    ancho: 15,
    alto: 11,
    base: [],
    solido: [],
    cajas: [],
    objetos: [{ x: 10, y: 7, inf: fuente, sup: null }],
  };
  const cuerpo = (x: number, y: number) => ({ x, y, ancho: 14, alto: 8 });
  // Justo a la izquierda de la casilla (10, 7): su borde derecho en x = 320.
  expect(objetoAlAlcance(sala, 'fuente', cuerpo(320 - 7, 7 * T + 20), T, 4)).not.toBeNull();
  expect(objetoAlAlcance(sala, 'fuente', cuerpo(320 - 7 - 10, 7 * T + 20), T, 4)).toBeNull();
  expect(objetoAlAlcance(sala, 'hoguera', cuerpo(320 - 7, 7 * T + 20), T, 4)).toBeNull();
});
