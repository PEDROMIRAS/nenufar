import { describe, expect, test } from 'vitest';
import { luchadorDeHeroe } from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import {
  heroinaGuardada,
  leerGuardado,
  restaurarHeroina,
  VERSION_GUARDADO,
  type Conocido,
  type PartidaGuardada,
} from '../src/core/guardado';
import { DIFICULTADES, HEROES, OBJETOS } from '../src/data/datos';
import zonas from '../src/data/zonas.json';

const conocido: Conocido = {
  heroes: Object.keys(HEROES),
  dificultades: Object.keys(DIFICULTADES),
  equipo: Object.keys(OBJETOS.equipo),
  consumibles: Object.keys(OBJETOS.consumibles),
  zonas: Object.keys(zonas.zonas).length,
};

function ejemplo(): PartidaGuardada {
  const l = luchadorDeHeroe(HEROES.ronin);
  const inventario = inventarioInicial(l, HEROES.ronin, OBJETOS);
  inventario.consumibles.pocion = 2;
  return {
    version: VERSION_GUARDADO,
    semilla: 1234,
    zona: 1,
    heroe: 'ronin',
    dificultad: 'normal',
    combates: 7,
    vencidos: 9,
    violetasAntes: 1,
    dragonAntes: true,
    rival: 'Señor de la Cripta',
    segundos: 321.5,
    combate: null,
    heroina: heroinaGuardada(l),
    inventario,
    mapa: {
      sala: 3,
      lado: 2,
      visitadas: [0, 1, 3],
      hechas: [1],
      vencidos: { 1: [0, 1], 3: [] },
      fuenteUsada: false,
    },
  };
}

describe('guardado de la partida', () => {
  test('ida y vuelta', () => {
    const g = ejemplo();
    expect(leerGuardado(JSON.stringify(g), conocido)).toEqual(g);
  });

  test.each([
    [{ tipo: 'grupo', indice: 1, quien: 'heroina' }],
    [{ tipo: 'grupo', indice: 0, quien: null }],
    [{ tipo: 'trampa' }],
    [{ tipo: 'final' }],
  ] as const)('conserva el combate interrumpido %j', (combate) => {
    const g = { ...ejemplo(), combate };
    expect(leerGuardado(JSON.stringify(g), conocido)?.combate).toEqual(combate);
  });

  test('conserva violetasAntes y dragonAntes', () => {
    const g = leerGuardado(JSON.stringify(ejemplo()), conocido);
    expect(g?.violetasAntes).toBe(1);
    expect(g?.dragonAntes).toBe(true);
  });

  test('heroína', () => {
    const l = luchadorDeHeroe(HEROES.ronin);
    l.nivel = 5;
    l.experiencia = 12;
    l.puntos = 2;
    l.pv = 30;
    l.pvMax = 70;
    l.pm = 4;
    l.ataque = 20;
    l.critico = 0.2;
    l.habilidadesGanadas = ['Tajo de llama morada'];
    l.estados = [{ nombre: 'veneno', turnos: 2, nuevo: false } as never];
    const otra = luchadorDeHeroe(HEROES.ronin);
    restaurarHeroina(otra, heroinaGuardada(l));
    for (const k of [
      'nombre',
      'nivel',
      'experiencia',
      'puntos',
      'pv',
      'pvMax',
      'pm',
      'pmMax',
      'ataque',
      'magia',
      'defensa',
      'velocidad',
      'critico',
      'habilidadesGanadas',
    ] as const)
      expect(otra[k]).toEqual(l[k]);
    expect(otra.estados).toEqual([]);
  });

  test.each([
    ['nada', null],
    ['vacío', ''],
    ['JSON roto', '{'],
    ['un número', '42'],
    ['null', 'null'],
  ])('descarta %s', (_, texto) => {
    expect(leerGuardado(texto, conocido)).toBeNull();
  });

  test.each<[string, (g: Record<string, unknown> & PartidaGuardada) => void]>([
    ['otra versión', (g) => ((g as Record<string, unknown>).version = 2)],
    ['sin mapa', (g) => delete (g as Record<string, unknown>).mapa],
    ['sin campo de combate', (g) => delete (g as Record<string, unknown>).combate],
    [
      'combate de tipo desconocido',
      (g) => ((g as Record<string, unknown>).combate = { tipo: 'duelo' }),
    ],
    [
      'grupo sin índice',
      (g) => ((g as Record<string, unknown>).combate = { tipo: 'grupo', quien: null }),
    ],
    [
      'iniciativa rara',
      (g) =>
        ((g as Record<string, unknown>).combate = { tipo: 'grupo', indice: 0, quien: 'nadie' }),
    ],
    ['heroína desconocida', (g) => (g.heroe = 'sapo')],
    ['dificultad desconocida', (g) => (g.dificultad = 'imposible')],
    ['arma desconocida', (g) => (g.inventario.arma = 'espada_inexistente')],
    ['pieza desconocida en la mochila', (g) => g.inventario.mochila.push('escudo_raro')],
    ['consumible desconocido', (g) => (g.inventario.consumibles = { elixir: 1 })],
    ['zona fuera de rango', (g) => (g.zona = 4)],
    ['sala no entera', (g) => (g.mapa.sala = 1.5)],
    ['pv no numérico', (g) => ((g.heroina as unknown as Record<string, unknown>).pv = 'mucho')],
  ])('descarta %s', (_, romper) => {
    const g = ejemplo() as Record<string, unknown> & PartidaGuardada;
    romper(g);
    expect(leerGuardado(JSON.stringify(g), conocido)).toBeNull();
  });
});
