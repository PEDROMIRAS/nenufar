import { describe, expect, test, vi } from 'vitest';
import { crearAcciones, type Acciones } from '../src/core/acciones';
import { crearAzar } from '../src/core/azar';
import {
  crearCombate,
  luchadorDeHeroe,
  luchadoresDeGrupo,
  type Combate,
  type Resultado,
} from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import { EscenaCombate } from '../src/escenas/combate';
import { filaCombate, listaCombate } from '../src/render/combate';
import type { Sprite } from '../src/render/recursos';

// La escena del combate sin pantalla, sonido ni dibujo, en la interfaz de 480×352: aquí cuentan los flujos del menú.
vi.mock('../src/render/pantalla', () => ({
  ANCHO: 480,
  ALTO: 352,
  aPixel: (v: number) => v,
  area: { x: 0, y: 0, ancho: 480, alto: 352 },
  interfaz: { ancho: 480, alto: 352, alta: false },
  rellenarArea: () => {},
}));
vi.mock('../src/render/accesibilidad', () => ({
  anunciar: () => {},
  temblorEfectivo: () => 0,
  movimientoReducido: () => true,
}));
vi.mock('../src/render/sonido', () => ({ ponerMusica: () => {}, sonar: () => {} }));
vi.mock('../src/input/mando', () => ({ vibrar: () => {} }));
vi.mock('../src/input/dispositivo', () => ({ dispositivo: () => 'teclado' }));

/** Un combate de la ronin contra `grupo`, con su inventario, y la escena que lo enseña. */
function abrir(grupo: string[]): { combate: Combate; escena: EscenaCombate; fin: Resultado[] } {
  const heroe = HEROES.ronin!;
  const h = luchadorDeHeroe(heroe);
  const inventario = inventarioInicial(h, heroe, OBJETOS);
  inventario.consumibles.pocion = 2;
  const combate = crearCombate(
    h,
    luchadoresDeGrupo(grupo.map((k) => MONSTRUOS[k]!)),
    REGLAS,
    crearAzar(3),
    MONSTRUOS,
  );
  combate.inventario = inventario;
  combate.objetos = OBJETOS;
  const fin: Resultado[] = [];
  const sprite = { datos: { animations: {} } } as unknown as Sprite;
  const escena = new EscenaCombate(
    combate,
    sprite,
    new Map(),
    () => {},
    (r) => fin.push(r),
  );
  escena.enter();
  return { combate, escena, fin };
}

/** En qué menú está la escena: 'principal', 'habilidades', 'objetos' u 'objetivo'. */
const modo = (e: EscenaCombate): string => (e as unknown as { modo: string }).modo;

const menuAbierto = (e: EscenaCombate): boolean =>
  (e as unknown as { v: { menu: unknown } }).v.menu !== null;

/**
 * Deja pasar el combate sin tocar nada hasta que se abre el menú de la heroína y se acaba de leer el último mensaje
 * (un toque o Enter durante esa lectura solo la salta, como al jugar).
 */
function hastaElMenu(e: EscenaCombate, combate: Combate): void {
  const nada = crearAcciones();
  for (let i = 0; i < 60 * 30 && !menuAbierto(e) && !combate.resultado; i++) e.update(1 / 60, nada);
  for (let i = 0; i < 60 * 3; i++) e.update(1 / 60, nada);
}

/** Una pulsación: un paso con la tecla y otro sin nada (como el teclado, que da cada flecha una vez). */
function pulsar(e: EscenaCombate, tecla: 'arriba' | 'abajo' | 'confirmar' | 'cancelar'): void {
  const a: Acciones = crearAcciones();
  if (tecla === 'arriba') a.moverY = -1;
  if (tecla === 'abajo') a.moverY = 1;
  if (tecla === 'confirmar') a.confirmar = true;
  if (tecla === 'cancelar') a.cancelar = true;
  e.update(1 / 60, a);
  e.update(1 / 60, crearAcciones());
}

/** Deja correr el combate hasta que acaba la escena: el cartel del final se cierra pulsando, y luego sale a negro. */
function hastaElFinal(e: EscenaCombate, fin: Resultado[]): void {
  for (let i = 0; i < 60 * 60 && fin.length === 0; i++)
    if (i % 30 === 0) pulsar(e, 'confirmar');
    else e.update(1 / 60, crearAcciones());
}

/** Las opciones del menú abierto (sus textos), para saber cuántas filas tiene y qué hay en cada una. */
const opciones = (e: EscenaCombate): string[] =>
  (e as unknown as { v: { menu: { opciones: { texto: string }[] } | null } }).v.menu?.opciones.map(
    (o) => o.texto,
  ) ?? [];

/** Un toque en la fila `i` del menú abierto (como el dedo: se cuenta al levantarlo, una vez). */
function tocar(e: EscenaCombate, i: number): void {
  const n = opciones(e).length;
  const lista = listaCombate(n);
  const fila = filaCombate(n);
  const a = crearAcciones();
  a.toqueX = lista.x + lista.ancho / 2;
  a.toqueY = lista.y + i * fila + fila / 2;
  e.update(1 / 60, a);
  e.update(1 / 60, crearAcciones());
}

describe('flujos del menú de combate', () => {
  test('con el dedo: un toque en el menú principal; en las listas, el primero elige y el segundo usa', () => {
    const { combate, escena } = abrir(['limo', 'limo']);
    hastaElMenu(escena, combate);
    const pm = combate.heroina.pm;
    const pvB = combate.enemigos[1]!.pv;
    expect(opciones(escena)[1]).toBe('Habilidad');
    tocar(escena, 1); // en el menú principal, un toque basta
    expect(modo(escena)).toBe('habilidades');
    // Golpe de pomo (la tercera, no la elegida): el primer toque solo la elige; el segundo la usa.
    expect(opciones(escena)[2]).toBe('Golpe de pomo');
    tocar(escena, 2);
    expect(modo(escena)).toBe('habilidades');
    tocar(escena, 2);
    expect(modo(escena)).toBe('objetivo');
    // Objetivo: «Limo B» (el segundo): igual, dos toques.
    tocar(escena, 1);
    expect(modo(escena)).toBe('objetivo');
    tocar(escena, 1);
    expect(combate.heroina.pm).toBeLessThan(pm);
    expect(combate.enemigos[1]!.pv).toBeLessThan(pvB);
  });

  test('Habilidad → Corte rápido → objetivo: gasta sus PM y le quita vida al enemigo', () => {
    const { combate, escena } = abrir(['limo']);
    hastaElMenu(escena, combate);
    const pm = combate.heroina.pm;
    const pv = combate.enemigos[0]!.pv;
    pulsar(escena, 'abajo'); // Habilidad
    pulsar(escena, 'confirmar');
    pulsar(escena, 'confirmar'); // Corte rápido
    pulsar(escena, 'confirmar'); // el limo
    expect(combate.heroina.pm).toBeLessThan(pm);
    expect(combate.enemigos[0]!.pv).toBeLessThan(pv);
  });

  test('Cancelar en la lista de habilidades vuelve al menú sin gastar nada', () => {
    const { combate, escena } = abrir(['limo']);
    hastaElMenu(escena, combate);
    const pm = combate.heroina.pm;
    const pv = combate.enemigos[0]!.pv;
    pulsar(escena, 'abajo');
    pulsar(escena, 'confirmar'); // abre Habilidad
    pulsar(escena, 'cancelar'); // vuelve
    expect(menuAbierto(escena)).toBe(true);
    expect([combate.heroina.pm, combate.enemigos[0]!.pv]).toEqual([pm, pv]);
    // Desde el menú principal sigue en «Habilidad»: volver y atacar (arriba) funciona.
    pulsar(escena, 'arriba');
    pulsar(escena, 'confirmar'); // Atacar
    pulsar(escena, 'confirmar'); // el limo
    expect(combate.enemigos[0]!.pv).toBeLessThan(pv);
  });

  test('Objeto → Poción: gasta una y cura', () => {
    const { combate, escena } = abrir(['limo']);
    hastaElMenu(escena, combate);
    combate.heroina.pv = 10;
    pulsar(escena, 'abajo');
    pulsar(escena, 'abajo'); // Objeto
    pulsar(escena, 'confirmar');
    pulsar(escena, 'confirmar'); // la poción (el único consumible)
    expect(combate.inventario.consumibles.pocion).toBe(1);
    expect(combate.heroina.pv).toBeGreaterThan(10);
  });

  test('Huir de un combate normal lo acaba con «huida» (si sale bien)', () => {
    let huida = false;
    for (let intento = 0; intento < 5 && !huida; intento++) {
      const { combate, escena, fin } = abrir(['limo']);
      hastaElMenu(escena, combate);
      for (let i = 0; i < 4; i++) pulsar(escena, 'abajo'); // Huir
      pulsar(escena, 'confirmar');
      if (combate.resultado === 'huida') {
        hastaElFinal(escena, fin);
        expect(fin).toEqual(['huida']);
        huida = true;
      }
    }
    expect(huida).toBe(true);
  });

  test('de un jefe no se huye: elegir Huir no hace nada y el menú sigue abierto', () => {
    const { combate, escena } = abrir(['rey_limo']);
    hastaElMenu(escena, combate);
    for (let i = 0; i < 4; i++) pulsar(escena, 'abajo'); // Huir
    pulsar(escena, 'confirmar');
    expect(combate.resultado).toBeNull();
    expect(menuAbierto(escena)).toBe(true);
  });
});
