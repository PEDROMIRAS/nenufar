import { describe, expect, test } from 'vitest';
import {
  actuar,
  aplicarEstado,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  type Combate,
} from '../src/core/combate';
import { describirPieza, equipar, piezaDeBotin } from '../src/core/equipo';
import { crearInventario, guardar } from '../src/core/inventario';
import type { MonstruoJson } from '../src/core/types';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';

// Monstruo de prueba que no hace daño y suelta siempre una Poción.
const muneco: MonstruoJson = {
  ...MONSTRUOS.limo!,
  estadisticas: { pv: 1, pm: 0, ataque: 0, magia: 0, defensa: 0, velocidad: 1 },
  acciones: [{ accion: 'defender', peso: 1 }],
  botin: [{ objeto: 'pocion', peso: 1 }],
};

function combate(): Combate {
  const c = crearCombate(
    luchadorDeHeroe(HEROES.ronin),
    [luchadorDeMonstruo(muneco)],
    REGLAS,
    () => 0.5,
  );
  c.objetos = OBJETOS;
  avanzar(c);
  return c;
}

describe('inventario', () => {
  test('guarda hasta 5 de cada tipo', () => {
    const inv = crearInventario();
    for (let i = 0; i < 5; i++) expect(guardar(inv, 'pocion', 5)).toBe(true);
    expect(guardar(inv, 'pocion', 5)).toBe(false);
    expect(guardar(inv, 'eter', 5)).toBe(true);
    expect(inv.consumibles).toEqual({ pocion: 5, eter: 1 });
  });
});

describe('objetos en combate', () => {
  test('la Poción cura 25 PV sin pasarse del máximo y se gasta', () => {
    const c = combate();
    c.inventario.consumibles.pocion = 2;
    c.heroina.pv = 30;
    const eventos = actuar(c, { tipo: 'objeto', clave: 'pocion' });
    expect(eventos.slice(0, 2)).toEqual([
      { tipo: 'objeto', actor: c.heroina, nombre: 'Poción' },
      { tipo: 'cura', objetivo: c.heroina, cantidad: 12 },
    ]);
    expect(c.inventario.consumibles.pocion).toBe(1);
  });

  test('el Éter devuelve 10 PM', () => {
    const c = combate();
    c.inventario.consumibles.eter = 1;
    c.heroina.pm = 0;
    actuar(c, { tipo: 'objeto', clave: 'eter' });
    expect(c.heroina.pm).toBe(8); // máximo de la ronin
  });

  test('el Antídoto quita el veneno', () => {
    const c = combate();
    c.inventario.consumibles.antidoto = 1;
    aplicarEstado(c, c.heroina, 'veneno', false, []);
    actuar(c, { tipo: 'objeto', clave: 'antidoto' });
    expect(c.heroina.estados).toEqual([]);
  });

  test('sin unidades no se puede usar', () => {
    const c = combate();
    expect(() => actuar(c, { tipo: 'objeto', clave: 'pocion' })).toThrow('No queda pocion');
  });
});

describe('botín', () => {
  test('al ganar, lo que suelta el monstruo va al inventario', () => {
    const c = combate();
    const eventos = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(eventos).toContainEqual({ tipo: 'botin', nombre: 'Poción', guardado: true });
    expect(c.inventario.consumibles.pocion).toBe(1);
  });

  test('si ya se llevan 5, el botín se pierde', () => {
    const c = combate();
    c.inventario.consumibles.pocion = 5;
    const eventos = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(eventos).toContainEqual({ tipo: 'botin', nombre: 'Poción', guardado: false });
    expect(c.inventario.consumibles.pocion).toBe(5);
  });

  test('todas las tablas de botín usan objetos o niveles de equipo que existen', () => {
    for (const [clave, m] of Object.entries(MONSTRUOS)) {
      for (const b of m.botin ?? []) {
        const valido =
          b.objeto === 'nada' ||
          b.objeto in OBJETOS.consumibles ||
          Object.values(HEROES).every((h) => piezaDeBotin(b.objeto, b.nivel, h, OBJETOS) !== null);
        expect(valido, `${clave}: ${b.objeto} ${b.nivel ?? ''}`).toBe(true);
      }
    }
  });
});

describe('equipo', () => {
  test('las armas y armaduras de los datos existen en objetos.json', () => {
    const claves = [...OBJETOS.armaduras, ...Object.values(HEROES).flatMap((h) => h.armas)];
    for (const c of claves) expect(OBJETOS.equipo[c], c).toBeDefined();
  });

  test('el botín «arma» es el arma de la heroína que se juega', () => {
    expect(piezaDeBotin('arma', 2, HEROES.ronin, OBJETOS)).toBe('katana_acero');
    expect(piezaDeBotin('arma', 2, HEROES.maga, OBJETOS)).toBe('baston_amatista');
    expect(piezaDeBotin('armadura', 3, HEROES.maga, OBJETOS)).toBe('armadura_placas');
    expect(piezaDeBotin('pocion', undefined, HEROES.maga, OBJETOS)).toBeNull();
  });

  test('equipar suma los bonos y, al cambiar, quita los de la pieza anterior', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    const inv = crearInventario();
    equipar(h, inv, OBJETOS, 'katana_madera');
    expect([h.ataque, inv.arma]).toEqual([9 + 3, 'katana_madera']);
    equipar(h, inv, OBJETOS, 'hoja_runica');
    expect([h.ataque, inv.arma]).toEqual([9 + 10, 'hoja_runica']);
    equipar(h, inv, OBJETOS, 'cota_malla');
    expect([h.defensa, inv.armadura]).toEqual([6 + 5, 'cota_malla']);
  });

  test('al ganar, una pieza que cae queda pendiente de decidir, y la que ya se lleva no', () => {
    const c = combate();
    c.enemigos[0]!.monstruo = { ...muneco, botin: [{ objeto: 'arma', nivel: 1, peso: 1 }] };
    const eventos = actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
    expect(eventos).toContainEqual({ tipo: 'equipo', nombre: 'Katana de madera' });
    expect(c.equipoEncontrado).toEqual(['katana_madera']);

    const otro = combate();
    otro.inventario.arma = 'katana_madera';
    otro.enemigos[0]!.monstruo = c.enemigos[0]!.monstruo;
    actuar(otro, { tipo: 'atacar', objetivo: otro.enemigos[0]! });
    expect(otro.equipoEncontrado).toEqual([]);
  });
});

test('describirPieza: bonos y efecto en texto', () => {
  expect(describirPieza(OBJETOS.equipo.hoja_runica!, REGLAS.estados)).toEqual([
    '+10 Ataque',
    '10 % de Veneno al golpear',
  ]);
  expect(describirPieza(OBJETOS.equipo.tunica!, REGLAS.estados)).toEqual(['+2 Defensa']);
});
