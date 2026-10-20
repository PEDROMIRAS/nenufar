import { describe, expect, test } from 'vitest';
import {
  describirAcciones,
  describirConsumible,
  describirEstado,
  describirHabilidad,
  partirEnLineas,
} from '../src/core/descripciones';
import type { EstadoJson, HabilidadJson } from '../src/core/types';
import { REGLAS } from '../src/data/datos';

const ESTADOS: Record<string, EstadoJson> = {
  postura: { nombre: 'Postura de hierro', turnos: 3, defensa: 1.5 },
  veneno: { nombre: 'Veneno', turnos: 3, danioPorTurno: 0.08 },
  furia: { nombre: 'Furia', turnos: 3, ataque: 1.5, defensa: 0.7 },
};

describe('descripciones', () => {
  test('estados: lo que suben o bajan y cuánto duran', () => {
    expect(describirEstado(ESTADOS.furia!)).toBe(
      '+50 % de ataque y −30 % de defensa durante 3 turnos',
    );
    expect(describirEstado({ nombre: 'Aturdido', turnos: 1, pierdeTurno: true })).toBe(
      'pierde su turno durante 1 turno',
    );
  });

  test('habilidades de daño, de estado propio y de daño con estado', () => {
    const hab = (h: Partial<HabilidadJson>): HabilidadJson =>
      ({ nombre: 'x', nivel: 1, pm: 1, objetivo: 'uno', ...h }) as HabilidadJson;
    expect(
      describirHabilidad(
        hab({ danio: { tipo: 'fisico', poder: 2.5, criticoSeguro: true } }),
        ESTADOS,
      ),
    ).toBe('Daño físico (250 % de tu ataque) a un enemigo. Siempre crítico.');
    expect(describirHabilidad(hab({ objetivo: 'propio', estado: 'postura' }), ESTADOS)).toBe(
      'Postura de hierro: +50 % de defensa durante 3 turnos.',
    );
    expect(
      describirHabilidad(hab({ danio: { tipo: 'magico', poder: 0.8 }, estado: 'veneno' }), ESTADOS),
    ).toBe(
      'Daño mágico (80 % de tu magia) a un enemigo. Causa Veneno (pierde el 8 % de su vida por turno durante 3 turnos).',
    );
    expect(describirHabilidad(hab({ objetivo: 'propio', cura: 0.35 }), ESTADOS)).toBe(
      'Recupera el 35 % de tus PV.',
    );
  });

  test('consumibles y acciones salen de los datos', () => {
    expect(describirConsumible({ nombre: 'Antídoto', quitaEstado: 'veneno' }, ESTADOS)).toBe(
      'Quita el Veneno.',
    );
    const acciones = describirAcciones(REGLAS);
    expect(acciones).toHaveLength(5);
    expect(acciones[3]).toContain(`${REGLAS.defender.pm} PM`);
  });
});

test('partirEnLineas no corta palabras ni pasa del máximo', () => {
  expect(partirEnLineas('uno dos tres cuatro', 8)).toEqual(['uno dos', 'tres', 'cuatro']);
  expect(partirEnLineas('corto', 62)).toEqual(['corto']);
});
