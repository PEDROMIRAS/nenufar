import { expect, test } from 'vitest';
import { niebla } from '../src/core/minimapa';
import { E, N, O, S, type Zona } from '../src/core/zona';

// Inicio (3,3) → paso (3,2) → callejones al norte, este y oeste; además una sala pegada al inicio sin puerta.
const zona: Zona = {
  semilla: 0,
  salas: [
    { x: 3, y: 3, tipo: 'inicio', distancia: 0, puertas: N },
    { x: 3, y: 2, tipo: 'combate', distancia: 1, puertas: N | E | S | O },
    { x: 3, y: 1, tipo: 'jefe', distancia: 2, puertas: S },
    { x: 4, y: 2, tipo: 'tesoro', distancia: 2, puertas: O | S },
    { x: 2, y: 2, tipo: 'descanso', distancia: 2, puertas: E },
    { x: 4, y: 3, tipo: 'combate', distancia: 3, puertas: N },
  ],
};
const [inicio, paso, jefe, tesoro, descanso, pegada] = zona.salas;

test('al empezar solo se ve el inicio y el contorno de la sala a la que da su puerta', () => {
  const visitadas = new Set([inicio!]);
  expect(niebla(zona, visitadas, inicio!)).toBe('visitada');
  expect(niebla(zona, visitadas, paso!)).toBe('contorno');
  expect(niebla(zona, visitadas, jefe!)).toBe('oculta');
  // Está al lado del inicio, pero sin puerta entre ellas: no se revela.
  expect(niebla(zona, visitadas, pegada!)).toBe('oculta');
});

test('al entrar en una sala de paso se ven las tres salidas como contorno', () => {
  const visitadas = new Set([inicio!, paso!]);
  for (const s of [jefe!, tesoro!, descanso!]) expect(niebla(zona, visitadas, s)).toBe('contorno');
  expect(niebla(zona, visitadas, pegada!)).toBe('oculta');
});
