import { describe, expect, test } from 'vitest';
import {
  actuar,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  type Luchador,
} from '../src/core/combate';
import {
  bonosDe,
  capasDeEquipo,
  crecerEquipo,
  equipar,
  inventarioInicial,
  ponerPieza,
} from '../src/core/equipo';
import { experienciaParaSubir, instantanea } from '../src/core/progresion';
import { aplicarRecompensa, elegirRecompensa, type Recompensa } from '../src/core/recompensas';
import type { EquipoJson, MonstruoJson } from '../src/core/types';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';

/** Los PNG de las capas que hay en el repo (solo los nombres). */
const CAPAS = import.meta.glob('../public/assets/sprites/piezas/*.png', { query: '?url' });

const suma = (b: Partial<Record<string, number>>): number =>
  Object.values(b).reduce<number>((a, v) => a + (v ?? 0), 0);

describe('elegirRecompensa', () => {
  test('nunca repite una que ya se tiene y da null con las tres', () => {
    for (let i = 0; i < 50; i++) {
      const azar = () => (i % 7) / 7;
      const ganadas: Recompensa[] = [];
      for (let n = 0; n < 3; n++) {
        const r = elegirRecompensa(ganadas, azar)!;
        expect(ganadas).not.toContain(r);
        ganadas.push(r);
      }
      expect(elegirRecompensa(ganadas, azar)).toBeNull();
    }
  });
});

describe('aplicarRecompensa', () => {
  test.each(Object.keys(HEROES) as (keyof typeof HEROES)[])('%s', (clave) => {
    const heroe = HEROES[clave];
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    expect(aplicarRecompensa(h, inv, heroe, 'arma')).toBe(heroe.especiales.arma);
    expect(aplicarRecompensa(h, inv, heroe, 'armadura')).toBe(heroe.especiales.armadura);
    expect(inv.mochila).toEqual([heroe.especiales.arma, heroe.especiales.armadura]);
    expect(aplicarRecompensa(h, inv, heroe, 'habilidad')).toBe(heroe.especiales.habilidad);
    expect(h.habilidadesGanadas).toEqual([heroe.especiales.habilidad]);
    expect(inv.recompensas).toEqual(['arma', 'armadura', 'habilidad']);
    expect([OBJETOS.equipo[heroe.especiales.arma]?.hueco]).toEqual(['arma']);
    expect([OBJETOS.equipo[heroe.especiales.armadura]?.hueco]).toEqual(['armadura']);
  });

  test('una partida nueva empieza sin recompensas ni Corazón', () => {
    const h = luchadorDeHeroe(HEROES.maga);
    const inv = inventarioInicial(h, HEROES.maga, OBJETOS);
    expect([inv.recompensas, inv.corazon, h.habilidadesGanadas]).toEqual([[], 'no', []]);
  });
});

test('bonosDe suma lo que crece por cada nivel por encima del 1', () => {
  const pieza: EquipoJson = {
    nombre: 'x',
    hueco: 'arma',
    bonos: { ataque: 5 },
    bonosPorNivel: { ataque: 1, pv: 2 },
  };
  expect(bonosDe(pieza, 1)).toEqual({ ataque: 5, pv: 0 });
  expect(bonosDe(pieza, 4)).toEqual({ ataque: 8, pv: 6 });
  expect(bonosDe(OBJETOS.equipo.hoja_runica!, 7)).toEqual({ ataque: 10 });
});

// Monstruo que no hace daño y cae de un golpe.
const muneco: MonstruoJson = {
  ...MONSTRUOS.limo!,
  estadisticas: { pv: 1, pm: 0, ataque: 0, magia: 0, defensa: 0, velocidad: 1 },
  acciones: [{ accion: 'defender', peso: 1 }],
  botin: [],
};

/** Gana un combate con justo la experiencia para subir dos niveles. */
function subirDosNiveles(h: Luchador, inv: ReturnType<typeof inventarioInicial>): void {
  const px =
    experienciaParaSubir(h.nivel, REGLAS.experiencia) +
    experienciaParaSubir(h.nivel + 1, REGLAS.experiencia) -
    h.experiencia;
  const c = crearCombate(
    h,
    [luchadorDeMonstruo({ ...muneco, experiencia: px })],
    REGLAS,
    () => 0.5,
  );
  c.inventario = inv;
  c.objetos = OBJETOS;
  avanzar(c);
  actuar(c, { tipo: 'atacar', objetivo: c.enemigos[0]! });
  expect(c.resultado).toBe('victoria');
}

test.each(Object.keys(HEROES) as (keyof typeof HEROES)[])(
  '%s: el equipo especial crece al subir de nivel y, al quitárselo, las estadísticas son las de sin él',
  (clave) => {
    const heroe = HEROES[clave];
    const conPieza = luchadorDeHeroe(heroe);
    const invCon = inventarioInicial(conPieza, heroe, OBJETOS);
    const sinPieza = luchadorDeHeroe(heroe);
    const invSin = inventarioInicial(sinPieza, heroe, OBJETOS);
    ponerPieza(conPieza, invCon, OBJETOS, heroe.especiales.arma);
    ponerPieza(conPieza, invCon, OBJETOS, heroe.especiales.armadura);

    subirDosNiveles(conPieza, invCon);
    subirDosNiveles(sinPieza, invSin);
    expect(conPieza.nivel).toBe(3);
    const crecida = suma(bonosDe(OBJETOS.equipo[heroe.especiales.arma]!, 3));
    expect(crecida).toBeGreaterThan(suma(OBJETOS.equipo[heroe.especiales.arma]!.bonos));

    ponerPieza(conPieza, invCon, OBJETOS, heroe.armaInicial);
    ponerPieza(conPieza, invCon, OBJETOS, OBJETOS.armaduraInicial);
    expect(instantanea(conPieza)).toEqual(instantanea(sinPieza));
  },
);

test('crecerEquipo suma lo que crecen las piezas puestas', () => {
  const heroe = HEROES.ronin;
  const h = luchadorDeHeroe(heroe);
  const inv = inventarioInicial(h, heroe, OBJETOS);
  equipar(h, inv, OBJETOS, heroe.especiales.arma);
  const antes = h.ataque;
  crecerEquipo(h, inv, OBJETOS, 2);
  expect(h.ataque - antes).toBe(
    2 * (OBJETOS.equipo[heroe.especiales.arma]!.bonosPorNivel?.ataque ?? 0),
  );
});

// Regla «siempre algo mejor»: tramo 1 en los niveles 1-3, 2 en los 4-6, 3 en los 7-9 y 4 en los 10-12 (el
// simulador llega al jefe del Bosque con nivel 2-3, al de las Ruinas con 5-6, al de la Cripta con 9-10 y al del Cauce Seco con 11-12).
const tramo = (nivel: number): number => (nivel <= 3 ? 1 : nivel <= 6 ? 2 : nivel <= 9 ? 3 : 4);

describe.each(Object.keys(HEROES) as (keyof typeof HEROES)[])('%s: siempre algo mejor', (clave) => {
  const heroe = HEROES[clave];
  test.each([
    ['arma', heroe.especiales.arma, heroe.armas],
    ['armadura', heroe.especiales.armadura, OBJETOS.armaduras],
  ])(
    '%s especial supera en un 10 %% a la mejor normal de su tramo',
    (_hueco, especial, normales) => {
      const pieza = OBJETOS.equipo[especial]!;
      for (let n = 1; n <= REGLAS.experiencia.nivelMaximo; n++) {
        const mejor = suma(OBJETOS.equipo[normales[tramo(n) - 1]!]!.bonos);
        // En enteros: especial ≥ 1,1 × mejor.
        expect(suma(bonosDe(pieza, n)) * 10, `nivel ${n}`).toBeGreaterThanOrEqual(mejor * 11);
      }
    },
  );
});

test('las piezas especiales no salen en cofres ni en botín', () => {
  for (const heroe of Object.values(HEROES)) {
    for (const k of [heroe.especiales.arma, heroe.especiales.armadura]) {
      expect(heroe.armas).not.toContain(k);
      expect(OBJETOS.armaduras).not.toContain(k);
    }
  }
});

describe('capas de las piezas especiales', () => {
  test('cada pieza especial tiene su capa, y su PNG existe', () => {
    for (const heroe of Object.values(HEROES)) {
      for (const clave of [heroe.especiales.arma, heroe.especiales.armadura]) {
        const capa = OBJETOS.equipo[clave]!.capa;
        expect(capa, clave).toBeTruthy();
        expect(Object.keys(CAPAS), clave).toContain(`../public/assets/sprites/${capa}.png`);
      }
    }
  });

  test('capasDeEquipo da las capas de lo que lleva puesto, en orden arma y armadura', () => {
    const heroe = HEROES.ronin;
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    expect(capasDeEquipo(inv, OBJETOS)).toEqual([]);
    ponerPieza(h, inv, OBJETOS, heroe.especiales.armadura);
    ponerPieza(h, inv, OBJETOS, heroe.especiales.arma);
    expect(capasDeEquipo(inv, OBJETOS)).toEqual([
      OBJETOS.equipo[heroe.especiales.arma]!.capa,
      OBJETOS.equipo[heroe.especiales.armadura]!.capa,
    ]);
  });
});
