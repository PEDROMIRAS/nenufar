import { describe, expect, test } from 'vitest';
import {
  anotarReto,
  leerReto,
  mejorResultado,
  progresoReto,
  RETO_VACIO,
  semillaDelDia,
  textoFecha,
  type ResultadoReto,
} from '../src/core/reto';
import { generarZona } from '../src/core/zona';
import zonas from '../src/data/zonas.json';

const gana = (segundos: number): ResultadoReto => ({ victoria: true, segundos, sala: 5, de: 5 });
const pierde = (sala: number): ResultadoReto => ({ victoria: false, segundos: 90, sala, de: 5 });

describe('semillaDelDia', () => {
  test('igual para la misma fecha y distinta en los cambios de año y de mes', () => {
    const a = semillaDelDia({ anio: 2026, mes: 11, dia: 18 });
    expect(semillaDelDia({ anio: 2026, mes: 11, dia: 18 })).toBe(a);
    expect(semillaDelDia({ anio: 2026, mes: 12, dia: 31 })).not.toBe(
      semillaDelDia({ anio: 2027, mes: 1, dia: 1 }),
    );
    expect(semillaDelDia({ anio: 2028, mes: 2, dia: 29 })).not.toBe(
      semillaDelDia({ anio: 2028, mes: 3, dia: 1 }),
    );
    for (const dia of [1, 15, 31]) {
      const s = semillaDelDia({ anio: 2027, mes: 1, dia });
      expect(Number.isInteger(s) && s >= 1).toBe(true);
    }
  });

  test('textoFecha con ceros a la izquierda', () => {
    expect(textoFecha({ anio: 2027, mes: 1, dia: 5 })).toBe('2027-01-05');
  });
});

describe('mejorResultado', () => {
  test('victoria > derrota; menos tiempo; más sala', () => {
    expect(mejorResultado(gana(200), pierde(6))).toBe(true);
    expect(mejorResultado(pierde(6), gana(200))).toBe(false);
    expect(mejorResultado(gana(150), gana(200))).toBe(true);
    expect(mejorResultado(gana(200), gana(150))).toBe(false);
    expect(mejorResultado(pierde(4), pierde(3))).toBe(true);
    expect(mejorResultado(pierde(3), null)).toBe(true);
    expect(mejorResultado(gana(150), gana(150))).toBe(false);
    expect(mejorResultado(pierde(3), pierde(3))).toBe(false);
  });
});

test('progresoReto cuenta las salas con monstruos y empieza en 1', () => {
  const zona = generarZona({ ...zonas.generacion, salas: 8 }, 7);
  const conMonstruos = zona.salas.filter((s) => s.tipo === 'combate' || s.tipo === 'jefe').length;
  const inicio = zona.salas.findIndex((s) => s.tipo === 'inicio');
  expect(progresoReto(zona.salas, [inicio])).toEqual({ sala: 1, de: conMonstruos });
  const todas = zona.salas.map((_, i) => i);
  expect(progresoReto(zona.salas, todas)).toEqual({ sala: conMonstruos, de: conMonstruos });
});

test('progresoReto no cuenta una sala de combate en la que no cupo ningún grupo', () => {
  const zona = generarZona({ ...zonas.generacion, salas: 8 }, 7);
  const conMonstruos = zona.salas.filter((s) => s.tipo === 'combate' || s.tipo === 'jefe').length;
  const vacia = zona.salas.find((s) => s.tipo === 'combate')!;
  const todas = zona.salas.map((_, i) => i);
  expect(progresoReto(zona.salas, todas, new Set([vacia]))).toEqual({
    sala: conMonstruos - 1,
    de: conMonstruos - 1,
  });
});

describe('anotarReto', () => {
  test('primer día, mismo día peor, otra rana y día nuevo', () => {
    const uno = anotarReto(RETO_VACIO, '2026-11-18', 'ronin', pierde(3));
    expect(uno.nuevo).toBe(true);
    expect(uno.estado.dias).toBe(1);
    const peor = anotarReto(uno.estado, '2026-11-18', 'ronin', pierde(2));
    expect(peor.nuevo).toBe(false);
    expect(peor.estado.mejores.ronin).toEqual(pierde(3));
    expect(peor.estado.dias).toBe(1);
    const maga = anotarReto(peor.estado, '2026-11-18', 'maga', pierde(1));
    expect(maga.nuevo).toBe(true);
    expect(maga.estado.mejores.ronin).toEqual(pierde(3));
    const manana = anotarReto(maga.estado, '2026-11-19', 'ronin', pierde(1));
    expect(manana.nuevo).toBe(true);
    expect(manana.estado.dias).toBe(2);
    expect(manana.estado.mejores).toEqual({ ronin: pierde(1) });
    // No muta el estado de entrada.
    expect(uno.estado.mejores.ronin).toEqual(pierde(3));
    expect(RETO_VACIO.dias).toBe(0);
  });
});

test('leerReto tolera basura', () => {
  expect(leerReto('{basura')).toEqual(RETO_VACIO);
  expect(leerReto(null)).toEqual(RETO_VACIO);
  expect(leerReto('{"dias":"x"}').dias).toBe(0);
  const bueno = anotarReto(RETO_VACIO, '2026-11-18', 'ronin', gana(120)).estado;
  expect(leerReto(JSON.stringify(bueno))).toEqual(bueno);
  expect(
    leerReto('{"fecha":"2026-11-18","dias":1,"mejores":{"ronin":{"victoria":"si"}}}').mejores,
  ).toEqual({});
});

test('un intento de una fecha anterior a la guardada no reinicia el récord ni suma días', () => {
  const hoy = anotarReto(RETO_VACIO, '2026-11-19', 'ronin', pierde(4)).estado;
  const ayer = anotarReto(hoy, '2026-11-18', 'ronin', pierde(5));
  expect(ayer.nuevo).toBe(false);
  expect(ayer.estado).toEqual(hoy);
  // Al revés sigue siendo un día nuevo.
  expect(anotarReto(hoy, '2026-11-20', 'ronin', pierde(1)).estado.dias).toBe(2);
});

test('leerReto no deja que «__proto__» cambie el prototipo de los mejores', () => {
  const r = leerReto(
    '{"fecha":"2026-11-18","dias":1,"mejores":{"__proto__":{"victoria":true,"segundos":9,"sala":1,"de":1}}}',
  );
  expect(Object.getPrototypeOf(r.mejores)).toBe(Object.prototype);
  expect(Object.keys(r.mejores)).toEqual([]);
});

test('leerReto descarta una fecha que no es AAAA-MM-DD', () => {
  expect(leerReto('{"fecha":"mañana","dias":3,"mejores":{}}').fecha).toBe('');
  expect(leerReto('{"fecha":"2026-11-18","dias":3,"mejores":{}}').fecha).toBe('2026-11-18');
});
