import { describe, expect, test } from 'vitest';
import {
  actuar,
  avanzar,
  crearCombate,
  luchadorDeHeroe,
  luchadorDeMonstruo,
  luchadoresDeGrupo,
  type Combate,
  type Luchador,
} from '../src/core/combate';
import { HEROES, MONSTRUOS, REGLAS } from '../src/data/datos';

/** Azar fijo: varianza 1, sin crítico, y siempre el mismo punto de la tabla de pesos. */
const fijo = (v: number) => () => v;

function contra(nombres: string[], azar: () => number): Combate {
  const c = crearCombate(
    luchadorDeHeroe(HEROES.ronin),
    nombres.map((n) => luchadorDeMonstruo(MONSTRUOS[n]!)),
    REGLAS,
    azar,
  );
  c.heroina.pv = c.heroina.pvMax = 999; // que aguante lo que haga falta
  return c;
}

describe('IA de los monstruos', () => {
  test('el Esqueleto solo se defiende con poca vida', () => {
    // 0,9 cae en la última parte de la tabla: «defender» si está disponible.
    const c = contra(['esqueleto'], fijo(0.9));
    avanzar(c);
    const sano = actuar(c, { tipo: 'defender' });
    expect(sano.some((e) => e.tipo === 'defensa' && e.actor === c.enemigos[0])).toBe(false);
    c.enemigos[0]!.pv = 5;
    const herido = actuar(c, { tipo: 'defender' });
    expect(herido).toContainEqual({ tipo: 'defensa', actor: c.enemigos[0], pm: 0 });
  });

  test('la Araña envenena con su Picadura y gasta sus PM', () => {
    // La Araña es más rápida que la ronin: actúa ya en avanzar, y otra vez tras la heroína.
    const c = contra(['arana'], fijo(0.9));
    const eventos = [...avanzar(c), ...actuar(c, { tipo: 'defender' })];
    const picaduras = eventos.filter((e) => e.tipo === 'habilidad' && e.nombre === 'Picadura');
    expect(picaduras.length).toBeGreaterThan(0);
    expect(c.heroina.estados.map((e) => e.id)).toEqual(['veneno']);
    expect(c.enemigos[0]!.pm).toBe(12 - 3 * picaduras.length);
  });

  test('sin PM la Araña ya no puede usar la Picadura y ataca', () => {
    const c = contra(['arana'], fijo(0.9));
    c.enemigos[0]!.pm = 0;
    avanzar(c);
    const eventos = actuar(c, { tipo: 'defender' });
    expect(eventos.some((e) => e.tipo === 'habilidad')).toBe(false);
    expect(eventos.some((e) => e.tipo === 'danio' && e.origen === c.enemigos[0])).toBe(true);
  });

  test('el Espectro cura al aliado más herido cuando alguno baja del 60 %', () => {
    // 0,5 en la tabla [atacar 40, Llama de vela 60, Lamento 30] cae en «Llama de vela».
    const c = contra(['espectro', 'caballero', 'esqueleto'], fijo(0.5));
    const [espectro, caballero, esqueleto] = c.enemigos as [Luchador, Luchador, Luchador];
    caballero.pv = Math.round(caballero.pvMax * 0.5);
    esqueleto.pv = Math.round(esqueleto.pvMax * 0.29); // el más herido
    // El Espectro es más rápido que la ronin: cura ya en avanzar.
    const eventos = avanzar(c);
    expect(eventos).toContainEqual({
      tipo: 'cura',
      objetivo: esqueleto,
      cantidad: Math.round(esqueleto.pvMax * 0.3),
    });
    expect(espectro.pm).toBe(20 - 5);
  });

  test('sin aliados heridos, el Espectro no gasta la Llama de vela y da Furia a quien no la tenga', () => {
    // 0,9 cae al final de la tabla sin Llama de vela [atacar 40, Lamento 30] → «Lamento».
    const c = contra(['espectro', 'caballero'], fijo(0.9));
    avanzar(c);
    const eventos = actuar(c, { tipo: 'defender' });
    expect(eventos.some((e) => e.tipo === 'cura')).toBe(false);
    expect(eventos).toContainEqual(
      expect.objectContaining({ tipo: 'estado', estado: 'Furia', activo: true }),
    );
  });

  test('el Murciélago actúa antes que cualquiera de las heroínas', () => {
    const v = MONSTRUOS.murcielago!.estadisticas.velocidad;
    expect(v).toBeGreaterThan(HEROES.ronin.estadisticas.velocidad);
    expect(v).toBeGreaterThan(HEROES.maga.estadisticas.velocidad);
  });
});

test('en un grupo, los monstruos repetidos se distinguen con una letra', () => {
  const nombres = luchadoresDeGrupo([MONSTRUOS.limo!, MONSTRUOS.murcielago!, MONSTRUOS.limo!]).map(
    (l) => l.nombre,
  );
  expect(nombres).toEqual(['Limo A', 'Murciélago', 'Limo B']);
});
