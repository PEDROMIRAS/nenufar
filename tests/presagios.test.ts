import { describe, expect, test } from 'vitest';
import {
  cofreCon,
  dificultadCon,
  elegirPresagio,
  lineasPresagio,
  presagioUtil,
  restaurarFuente,
} from '../src/core/presagios';
import type { BotinJson, PresagioJson } from '../src/core/types';
import { DIFICULTADES, PRESAGIOS } from '../src/data/datos';

const CLAVES = Object.keys(PRESAGIOS.lista);
const neutro: PresagioJson = {
  nombre: 'Neutro',
  descripcion: 'No cambia nada.',
  ataque: 1,
  vida: 1,
  recuperacion: 1,
  experiencia: 1,
  gruposExtra: 0,
  nivelCofre: 0,
  fuente: 'todo',
};

describe('elegirPresagio', () => {
  test('con probabilidad 0 nunca sale un presagio', () => {
    for (let s = 0; s < 1000; s++) {
      expect(elegirPresagio({ ...PRESAGIOS, probabilidad: 0 }, s)).toBeNull();
    }
  });

  test('con probabilidad 1 siempre sale una clave de la lista', () => {
    for (let s = 0; s < 1000; s++) {
      expect(CLAVES).toContain(elegirPresagio({ ...PRESAGIOS, probabilidad: 1 }, s));
    }
  });

  test('la misma semilla da siempre lo mismo', () => {
    for (let s = 0; s < 200; s++) {
      expect(elegirPresagio(PRESAGIOS, s)).toBe(elegirPresagio(PRESAGIOS, s));
    }
  });

  test('con la probabilidad real salen todos los presagios y también ninguno', () => {
    const vistos = new Set<string | null>();
    for (let s = 0; s < 2000; s++) vistos.add(elegirPresagio(PRESAGIOS, s));
    expect(vistos).toEqual(new Set([...CLAVES, null]));
  });
});

describe('lineasPresagio', () => {
  test('sin presagio no hay líneas', () => {
    expect(lineasPresagio(null, 20)).toEqual([]);
  });

  test('el nombre va primero y la descripción se parte al ancho sin perder palabras', () => {
    const p = {
      ...neutro,
      nombre: 'Luna roja',
      descripcion: 'Tras cada combate te recuperas menos.',
    };
    const lineas = lineasPresagio(p, 20);
    expect(lineas[0]).toBe('Luna roja');
    expect(lineas.slice(1).join(' ')).toBe(p.descripcion);
    for (const l of lineas) expect(l.length).toBeLessThanOrEqual(20);
  });

  test.each(CLAVES)('%s cabe en columnas de 20 letras en 6 líneas o menos', (clave) => {
    expect(lineasPresagio(PRESAGIOS.lista[clave]!, 20).length).toBeLessThanOrEqual(6);
  });
});

describe('elegirPresagio con filtro', () => {
  test('nunca devuelve un presagio que el filtro rechaza', () => {
    const sinCoraza = (p: PresagioJson) => p !== PRESAGIOS.lista.coraza;
    for (let s = 0; s < 1000; s++) {
      expect(elegirPresagio({ ...PRESAGIOS, probabilidad: 1 }, s, sinCoraza)).not.toBe('coraza');
    }
  });

  test('con un filtro que lo admite todo da lo mismo que sin filtro', () => {
    for (let s = 0; s < 1000; s++) {
      expect(elegirPresagio(PRESAGIOS, s, () => true)).toBe(elegirPresagio(PRESAGIOS, s));
    }
  });

  test('si el filtro lo rechaza todo, no sale ninguno', () => {
    for (let s = 0; s < 200; s++) {
      expect(elegirPresagio({ ...PRESAGIOS, probabilidad: 1 }, s, () => false)).toBeNull();
    }
  });
});

describe('presagioUtil', () => {
  const tope: BotinJson[] = [
    { objeto: 'arma', nivel: 4, peso: 40 },
    { objeto: 'armadura', nivel: 4, peso: 30 },
  ];
  const bajo: BotinJson[] = [
    { objeto: 'arma', nivel: 2, peso: 40 },
    { objeto: 'pocion', peso: 30 },
  ];

  test('un presagio sin nivel de cofre sirve en cualquier zona', () => {
    expect(presagioUtil(neutro, tope, 4)).toBe(true);
  });

  test('con nivel de cofre solo sirve si algún cofre puede subir de nivel', () => {
    expect(presagioUtil({ ...neutro, nivelCofre: 1 }, bajo, 4)).toBe(true);
    expect(presagioUtil({ ...neutro, nivelCofre: 1 }, tope, 4)).toBe(false);
    expect(presagioUtil({ ...neutro, nivelCofre: 1 }, [{ objeto: 'pocion', peso: 1 }], 4)).toBe(
      false,
    );
  });
});

describe('dificultadCon', () => {
  test('sin presagio devuelve la misma dificultad', () => {
    expect(dificultadCon(DIFICULTADES.normal, null)).toBe(DIFICULTADES.normal);
  });

  test('multiplica el ataque y la vida y fija la experiencia', () => {
    const d = dificultadCon(DIFICULTADES.normal, {
      ...neutro,
      ataque: 1.5,
      vida: 2,
      recuperacion: 0.5,
      experiencia: 1.25,
    });
    expect(d.ataque).toBeCloseTo(DIFICULTADES.normal.ataque * 1.5);
    expect(d.vida).toBeCloseTo(DIFICULTADES.normal.vida * 2);
    expect(d.experiencia).toBe(1.25);
    expect(d.recuperacion).toBeCloseTo(DIFICULTADES.normal.recuperacion * 0.5);
    expect(d.violetas).toBe(DIFICULTADES.normal.violetas);
  });
});

describe('cofreCon', () => {
  const tabla: BotinJson[] = [
    { objeto: 'arma', nivel: 1, peso: 40 },
    { objeto: 'armadura', nivel: 4, peso: 30 },
    { objeto: 'pocion', peso: 30 },
  ];

  test('sube el nivel del equipo sin pasar del máximo y deja intacto lo demás', () => {
    const r = cofreCon(tabla, { ...neutro, nivelCofre: 1 }, 4);
    expect(r).toEqual([
      { objeto: 'arma', nivel: 2, peso: 40 },
      { objeto: 'armadura', nivel: 4, peso: 30 },
      { objeto: 'pocion', peso: 30 },
    ]);
  });

  test('no modifica la tabla original y sin presagio devuelve una copia igual', () => {
    cofreCon(tabla, { ...neutro, nivelCofre: 1 }, 4);
    expect(tabla[0]!.nivel).toBe(1);
    expect(cofreCon(tabla, null, 4)).toEqual(tabla);
  });
});

describe('restaurarFuente', () => {
  const herida = () => ({ pv: 3, pvMax: 40, pm: 2, pmMax: 20 });

  test("'todo' deja PV y PM al máximo", () => {
    const l = herida();
    restaurarFuente(l, 'todo');
    expect(l).toEqual({ pv: 40, pvMax: 40, pm: 20, pmMax: 20 });
  });

  test("'pm' solo restaura los PM", () => {
    const l = herida();
    restaurarFuente(l, 'pm');
    expect(l).toEqual({ pv: 3, pvMax: 40, pm: 20, pmMax: 20 });
  });
});

describe('datos de los presagios', () => {
  test.each(CLAVES)('%s: textos cortos y cifras válidas', (clave) => {
    const p = PRESAGIOS.lista[clave]!;
    expect(p.nombre.length).toBeGreaterThan(0);
    expect(p.nombre.length).toBeLessThanOrEqual(12);
    expect(p.descripcion.length).toBeGreaterThan(0);
    for (const k of ['ataque', 'vida', 'recuperacion', 'experiencia'] as const)
      expect(p[k]).toBeGreaterThan(0);
    expect(Number.isInteger(p.gruposExtra) && p.gruposExtra >= 0).toBe(true);
    expect(Number.isInteger(p.nivelCofre) && p.nivelCofre >= 0).toBe(true);
    expect(['todo', 'pm']).toContain(p.fuente);
  });

  test('la probabilidad está entre 0 y 1', () => {
    expect(PRESAGIOS.probabilidad).toBeGreaterThanOrEqual(0);
    expect(PRESAGIOS.probabilidad).toBeLessThanOrEqual(1);
  });
});
