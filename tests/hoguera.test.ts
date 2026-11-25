import { describe, expect, test } from 'vitest';
import { luchadorDeHeroe } from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import {
  heroinaGuardada,
  leerGuardado,
  VERSION_GUARDADO,
  type Conocido,
  type PartidaGuardada,
} from '../src/core/guardado';
import {
  brasasDe,
  copiaHoguera,
  hogueraEn,
  textoBrasas,
  volverAHoguera,
} from '../src/core/hoguera';
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
    combate: { tipo: 'grupo', indice: 0, quien: null },
    heroina: heroinaGuardada(l),
    inventario: inventarioInicial(l, HEROES.ronin, OBJETOS),
    mapa: { sala: 3, lado: 2, visitadas: [0, 3], hechas: [], vencidos: {}, fuenteUsada: true },
    brasas: 1,
    vueltas: 0,
    hoguera: null,
  };
}

describe('la hoguera', () => {
  test('las brasas salen de la dificultad (3, 1, 0); sin el campo, ninguna', () => {
    expect(brasasDe(DIFICULTADES.facil)).toBe(3);
    expect(brasasDe(DIFICULTADES.normal)).toBe(1);
    expect(brasasDe(DIFICULTADES.dificil)).toBe(0);
    expect(brasasDe({ ...DIFICULTADES.normal, brasas: undefined })).toBe(0);
  });

  test('la copia es independiente, sin combate, junto a la fuente (sin lado) y sin hoguera dentro', () => {
    const g = ejemplo();
    g.hoguera = copiaHoguera(ejemplo());
    const c = copiaHoguera(g);
    expect(c.combate).toBeNull();
    expect(c.mapa.lado).toBeNull();
    expect('hoguera' in c || 'brasas' in c || 'vueltas' in c).toBe(false);
    g.inventario.consumibles.pocion = 99;
    g.mapa.visitadas.push(7);
    expect(c.inventario.consumibles.pocion).not.toBe(99);
    expect(c.mapa.visitadas).toEqual([0, 3]);
  });

  test('está encendida en la zona de su copia', () => {
    const g = ejemplo();
    expect(hogueraEn(null, 1)).toBe(false);
    expect(hogueraEn(copiaHoguera(g), 1)).toBe(true);
    expect(hogueraEn(copiaHoguera(g), 2)).toBe(false);
  });

  test('al caer se gasta una brasa, se suma una vuelta y el tiempo sigue; la hoguera sigue encendida', () => {
    const copia = copiaHoguera(ejemplo());
    const vuelta = volverAHoguera({ brasas: 2, vueltas: 1, hoguera: copia }, 900)!;
    expect(vuelta.brasas).toBe(1);
    expect(vuelta.vueltas).toBe(2);
    expect(vuelta.segundos).toBe(900);
    expect(vuelta.hoguera).toEqual(copia);
    expect(vuelta.mapa).toEqual(copia.mapa);
    expect(vuelta.mapa).not.toBe(copia.mapa); // la partida recuperada no toca la copia
  });

  test('sin brasas o sin hoguera no hay vuelta', () => {
    const copia = copiaHoguera(ejemplo());
    expect(volverAHoguera({ brasas: 0, vueltas: 0, hoguera: copia }, 1)).toBeNull();
    expect(volverAHoguera({ brasas: 3, vueltas: 0, hoguera: null }, 1)).toBeNull();
  });

  test('el guardado lleva brasas, vueltas y la copia; las partidas de antes, sin ellos, también valen', () => {
    const g = ejemplo();
    g.hoguera = copiaHoguera(ejemplo());
    expect(leerGuardado(JSON.stringify(g), conocido)).toEqual(g);
    const vieja: Partial<PartidaGuardada> = ejemplo();
    delete vieja.brasas;
    delete vieja.vueltas;
    delete vieja.hoguera;
    expect(leerGuardado(JSON.stringify(vieja), conocido)).toEqual(vieja);
  });

  test('se rechaza una copia rota o de otra partida', () => {
    const g = ejemplo();
    g.hoguera = { ...copiaHoguera(ejemplo()), semilla: 5 };
    expect(leerGuardado(JSON.stringify(g), conocido)).toBeNull();
    g.hoguera = { ...copiaHoguera(ejemplo()), heroina: null } as never;
    expect(leerGuardado(JSON.stringify(g), conocido)).toBeNull();
    const h = ejemplo();
    h.brasas = -1;
    expect(leerGuardado(JSON.stringify(h), conocido)).toBeNull();
  });
});

test('texto de las brasas', () => {
  expect(textoBrasas(0)).toMatch(/^No te quedan brasas/);
  expect(textoBrasas(1)).toBe('Te queda 1 brasa.');
  expect(textoBrasas(3)).toBe('Te quedan 3 brasas.');
});
