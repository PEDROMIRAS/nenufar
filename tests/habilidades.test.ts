import { describe, expect, test } from 'vitest';
import {
  actuar,
  aplicarEstado,
  avanzar,
  crearCombate,
  efectiva,
  habilidadesDisponibles,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  type Combate,
  type Evento,
} from '../src/core/combate';
import type { HabilidadJson, HeroeJson, MonstruoJson, ReglasCombate } from '../src/core/types';
import { HEROES as heroes, MONSTRUOS, REGLAS } from '../src/data/datos';

const reglas: ReglasCombate = REGLAS;
// Limo con estadísticas fijas: los tests no deben romperse al equilibrar monstruos.json.
const limo: MonstruoJson = {
  ...MONSTRUOS.limo!,
  estadisticas: { pv: 16, pm: 0, ataque: 6, magia: 0, defensa: 3, velocidad: 4 },
};
/** Varianza 1, sin crítico, el Limo siempre ataca. */
const neutro = () => 0.5;

function combate(heroe: HeroeJson, nivel = 1, enemigos = 1): Combate {
  const h = luchadorDeHeroe(heroe);
  h.nivel = nivel;
  const lista = Array.from({ length: enemigos }, () =>
    luchadorDeMonstruo({ ...limo, estadisticas: { ...limo.estadisticas, pv: 100 } }),
  );
  const c = crearCombate(h, lista, reglas, neutro);
  avanzar(c); // la heroína es más rápida: le toca a ella
  return c;
}
const habilidad = (heroe: HeroeJson, nombre: string): HabilidadJson =>
  heroe.habilidades.find((h) => h.nombre === nombre)!;
const usar = (c: Combate, nombre: string, heroe: HeroeJson) =>
  actuar(c, { tipo: 'habilidad', habilidad: habilidad(heroe, nombre), objetivo: c.enemigos[0]! });

describe('habilidades', () => {
  test('se desbloquean por nivel: 1, 3, 5 y 7', () => {
    const h = luchadorDeHeroe(heroes.maga);
    expect(habilidadesDisponibles(h).map((x) => x.nombre)).toEqual(['Fuego morado']);
    h.nivel = 7;
    expect(habilidadesDisponibles(h)).toHaveLength(4);
  });

  test('Corte rápido: daño físico con poder 1,6 y cuesta 3 PM', () => {
    const c = combate(heroes.ronin);
    usar(c, 'Corte rápido', heroes.ronin);
    // (9 × 1,6 − 3 × 0,5) = 12,9 → 12
    expect(c.enemigos[0]!.pv).toBe(100 - 12);
    expect(c.heroina.pm).toBe(8 - 3);
  });

  test('Fuego morado: daño mágico con Magia; el objetivo solo resta DEF × 0,25', () => {
    const c = combate(heroes.maga);
    usar(c, 'Fuego morado', heroes.maga);
    // (10 × 1,5 − 3 × 0,25) = 14,25 → 14
    expect(c.enemigos[0]!.pv).toBe(100 - 14);
  });

  test('Iaido es siempre crítico', () => {
    const c = combate(heroes.ronin, 7);
    const eventos = usar(c, 'Iaido', heroes.ronin);
    // (9 × 2,5 − 1,5) × 1,5 = 31,5 → 31
    expect(eventos).toContainEqual(
      expect.objectContaining({ tipo: 'danio', cantidad: 31, critico: true }),
    );
  });

  test('Tajo del viento golpea a todos los enemigos', () => {
    const c = combate(heroes.ronin, 5, 3);
    usar(c, 'Tajo del viento', heroes.ronin);
    // (9 × 0,9 − 1,5) = 6,6 → 6 a cada uno
    expect(c.enemigos.map((e) => e.pv)).toEqual([94, 94, 94]);
  });

  test('Curar recupera el 35 % de los PV máximos, sin pasarse', () => {
    const c = combate(heroes.maga, 3);
    c.heroina.pv = 5;
    usar(c, 'Curar', heroes.maga);
    // round(30 × 0,35) = 11; después el Limo pega (6 − 4 × 0,5) = 4.
    expect(c.heroina.pv).toBe(5 + 11 - 4);
  });

  test('sin PM suficientes o sin el nivel no se puede usar', () => {
    const c = combate(heroes.ronin);
    c.heroina.pm = 2;
    expect(() => usar(c, 'Corte rápido', heroes.ronin)).toThrow('No hay PM');
    expect(() => usar(c, 'Iaido', heroes.ronin)).toThrow('aún no está disponible');
  });
});

describe('estados', () => {
  const tipos = (eventos: Evento[]) => eventos.map((e) => e.tipo);

  test('Postura de hierro sube la Defensa un 50 % durante 3 turnos de la heroína', () => {
    const c = combate(heroes.ronin, 3);
    usar(c, 'Postura de hierro', heroes.ronin);
    expect(efectiva(c.heroina, 'defensa')).toBe(9);
    // Golpe del Limo con la postura: (6 − 9 × 0,5) = 1,5 → 1.
    expect(c.heroina.pv).toBe(42 - 1);
    const ataque = () => actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    // El turno en que se lanza no cuenta: protege de los 3 ataques siguientes y se acaba al
    // final del tercer turno de la heroína después de lanzarla.
    ataque();
    expect(efectiva(c.heroina, 'defensa')).toBe(9);
    ataque();
    expect(efectiva(c.heroina, 'defensa')).toBe(9);
    const tercero = ataque();
    expect(tercero).toContainEqual({
      tipo: 'estado',
      objetivo: c.heroina,
      estado: 'Postura de hierro',
      activo: false,
    });
    expect(efectiva(c.heroina, 'defensa')).toBe(6);
  });

  test('Fuego fatuo envenena: el 8 % de PV máximos al final de cada turno suyo, 3 veces', () => {
    const c = combate(heroes.maga, 5);
    const eventos = usar(c, 'Fuego fatuo', heroes.maga);
    expect(eventos).toContainEqual({
      tipo: 'danioEstado',
      objetivo: c.enemigos[0],
      cantidad: 8,
      estado: 'Veneno',
    });
    const todos = [...eventos];
    for (let i = 0; i < 3; i++) todos.push(...actuar(c, { tipo: 'defender' }));
    expect(todos.filter((e) => e.tipo === 'danioEstado')).toHaveLength(3);
    expect(c.enemigos[0]!.estados).toEqual([]);
  });

  test('Aturdido hace perder el siguiente turno', () => {
    const c = combate(heroes.ronin);
    aplicarEstado(c, c.enemigos[0]!, 'aturdido', false, []);
    const eventos = actuar(c, { tipo: 'defender' });
    expect(tipos(eventos)).toEqual(['defensa', 'turno', 'estado', 'pierdeTurno', 'turno']);
    expect(c.heroina.pv).toBe(42);
  });

  test('Furia: +50 % de Ataque y −30 % de Defensa', () => {
    const c = combate(heroes.ronin);
    aplicarEstado(c, c.heroina, 'furia', true, []);
    expect(efectiva(c.heroina, 'ataque')).toBe(13.5);
    expect(efectiva(c.heroina, 'defensa')).toBeCloseTo(4.2);
  });

  test('el veneno puede rematar y dar la victoria', () => {
    const c = combate(heroes.maga, 5);
    c.enemigos[0]!.pv = 9; // Fuego fatuo quita (10 × 0,8 − 0,75) = 7,25 → 7; el veneno, 8.
    const eventos = usar(c, 'Fuego fatuo', heroes.maga);
    expect(eventos.slice(-4).map((e) => e.tipo)).toEqual([
      'danioEstado',
      'muerte',
      'experiencia',
      'fin',
    ]);
    expect(c.resultado).toBe('victoria');
  });

  test('un combate nuevo empieza sin los estados del anterior', () => {
    const c = combate(heroes.ronin);
    aplicarEstado(c, c.heroina, 'furia', true, []);
    const otro = crearCombate(c.heroina, [luchadorDeMonstruo(limo)], reglas, neutro);
    expect(otro.heroina.estados).toEqual([]);
  });
});
