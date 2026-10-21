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
import {
  abrirCofre,
  coloresDeEquipo,
  describirPieza,
  equipar,
  guardarPieza,
  inventarioInicial,
  piezaDeBotin,
  piezasDe,
  ponerPieza,
} from '../src/core/equipo';
import { crearInventario, guardar } from '../src/core/inventario';
import type { MonstruoJson } from '../src/core/types';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import zonas from '../src/data/zonas.json';

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
      { tipo: 'cura', objetivo: c.heroina, cantidad: Math.min(25, c.heroina.pvMax - 30) },
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

describe('cofres', () => {
  test('un cofre con equipo devuelve la pieza de la heroína que se juega', () => {
    const tabla = [{ objeto: 'arma', nivel: 3, peso: 1 }];
    expect(abrirCofre(tabla, () => 0.5, HEROES.maga, OBJETOS, crearInventario())).toEqual({
      tipo: 'equipo',
      clave: 'cetro_luna',
    });
  });

  test('un cofre con un consumible lo guarda', () => {
    const inv = crearInventario();
    const hallazgo = abrirCofre(
      [{ objeto: 'eter', peso: 1 }],
      () => 0.5,
      HEROES.ronin,
      OBJETOS,
      inv,
    );
    expect(hallazgo).toEqual({ tipo: 'consumible', nombre: 'Éter', guardado: true });
    expect(inv.consumibles.eter).toBe(1);
  });

  test('un cofre no ofrece la pieza que ya se lleva: sale lo otro de su tabla', () => {
    const inv = crearInventario();
    inv.arma = 'katana_acero';
    const tabla = [
      { objeto: 'arma', nivel: 2, peso: 99 },
      { objeto: 'armadura', nivel: 2, peso: 1 },
    ];
    expect(abrirCofre(tabla, () => 0, HEROES.ronin, OBJETOS, inv)).toEqual({
      tipo: 'equipo',
      clave: 'cota_malla',
    });
  });

  test('los cofres de zonas.json solo tienen cosas que existen, y el de la Cripta es de nivel 3', () => {
    for (const z of Object.values(zonas.zonas)) {
      for (const b of z.cofre) {
        const ok =
          b.objeto in OBJETOS.consumibles ||
          piezaDeBotin(b.objeto, (b as { nivel?: number }).nivel, HEROES.ronin, OBJETOS) !== null;
        expect(ok, b.objeto).toBe(true);
      }
    }
    expect(zonas.zonas.cripta.cofre.every((b) => (b as { nivel?: number }).nivel === 3)).toBe(true);
  });
});

describe('colores del equipo', () => {
  test('sin equipo no cambia nada; el arma tiñe su parte y la armadura la ropa', () => {
    const ronin = HEROES.ronin;
    const inv = crearInventario();
    expect(coloresDeEquipo(ronin, inv, OBJETOS)).toEqual([]);
    inv.arma = 'katana_acero';
    inv.armadura = 'tunica';
    const pares = coloresDeEquipo(ronin, inv, OBJETOS);
    expect(pares).toHaveLength(ronin.tintes.arma.length + ronin.tintes.ropa.length);
    expect(pares[0]).toEqual([ronin.tintes.arma[0], OBJETOS.equipo.katana_acero!.tinte![0]]);
  });

  test('cada pieza trae tantos colores como la parte que tiñe en las heroínas que pueden llevarla', () => {
    for (const heroe of Object.values(HEROES)) {
      for (const clave of [...heroe.armas, ...OBJETOS.armaduras]) {
        const pieza = OBJETOS.equipo[clave]!;
        const parte = pieza.hueco === 'arma' ? heroe.tintes.arma : heroe.tintes.ropa;
        expect(pieza.tinte, clave).toHaveLength(parte.length);
      }
    }
  });
});

describe('mochila de equipo', () => {
  test('ponerse una pieza manda la que llevaba a la mochila y las estadísticas cuadran', () => {
    const h = luchadorDeHeroe(HEROES.ronin);
    const ataqueBase = h.ataque;
    const inv = crearInventario();
    ponerPieza(h, inv, OBJETOS, 'katana_madera');
    ponerPieza(h, inv, OBJETOS, 'katana_acero');
    expect(inv.arma).toBe('katana_acero');
    expect(inv.mochila).toEqual(['katana_madera']);
    expect(h.ataque).toBe(ataqueBase + OBJETOS.equipo.katana_acero!.bonos.ataque!);
    // Volver a la de madera desde la mochila: intercambio limpio, sin sumar dos veces.
    ponerPieza(h, inv, OBJETOS, 'katana_madera');
    expect(inv.mochila).toEqual(['katana_acero']);
    expect(h.ataque).toBe(ataqueBase + OBJETOS.equipo.katana_madera!.bonos.ataque!);
    expect(piezasDe(inv, OBJETOS, 'arma')).toEqual(['katana_madera', 'katana_acero']);
  });

  test('guardar en la mochila no se pone nada, y lo que se tiene ya no sale en cofres', () => {
    const inv = crearInventario();
    guardarPieza(inv, 'cota_malla');
    guardarPieza(inv, 'cota_malla');
    expect(inv.mochila).toEqual(['cota_malla']);
    expect(inv.armadura).toBeNull();
    const tabla = [
      { objeto: 'armadura', nivel: 2, peso: 99 },
      { objeto: 'arma', nivel: 2, peso: 1 },
    ];
    expect(abrirCofre(tabla, () => 0, HEROES.ronin, OBJETOS, inv)).toEqual({
      tipo: 'equipo',
      clave: 'katana_acero',
    });
  });
});

describe('equipo inicial', () => {
  test('se empieza con el arma y la armadura iniciales, sin bonos, y no se pierden al cambiar', () => {
    const h = luchadorDeHeroe(HEROES.maga);
    const magiaBase = h.magia;
    const inv = inventarioInicial(h, HEROES.maga, OBJETOS);
    expect(inv.arma).toBe(HEROES.maga.armaInicial);
    expect(inv.armadura).toBe(OBJETOS.armaduraInicial);
    expect(h.magia).toBe(magiaBase);
    ponerPieza(h, inv, OBJETOS, 'baston_amatista');
    ponerPieza(h, inv, OBJETOS, 'tunica');
    expect(inv.mochila).toEqual([HEROES.maga.armaInicial, OBJETOS.armaduraInicial]);
  });
});
