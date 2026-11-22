import { describe, expect, test, vi } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import type { Resultado } from '../src/core/combate';
import type { CombateGuardado } from '../src/core/guardado';
import { montarSalaZona } from '../src/core/montaje';
import type { SalaZona } from '../src/core/zona';
import { EVENTOS } from '../src/data/datos';
import bosque from '../src/data/salas/plantillas_bosque.json';
import { EscenaMapa, type OpcionesMapa } from '../src/escenas/mapa';
import { catalogo, opcionesMapa, zonaCon } from './mapa_falso';

// El mapa sin dibujo ni sonido: aquí solo cuenta qué se guarda y cuándo.
vi.mock('../src/input/mando', () => ({ vibrar: () => {} }));
vi.mock('../src/render/hud', () => ({
  BOTON_MENU: { x: 0, y: 0, ancho: 0, alto: 0 },
  colocarHud: () => {},
  dibujarAviso: () => {},
  dibujarBotonMenu: () => {},
  dibujarHud: () => {},
}));
vi.mock('../src/render/minimapa', () => ({ pintarMinimapa: () => ({}) }));
vi.mock('../src/render/lluvia', () => ({
  crearLluvia: () => ({}),
  dibujarLluvia: () => {},
  moverLluvia: () => {},
}));
vi.mock('../src/render/monstruo', () => ({ direccionDe: () => 'down' }));
vi.mock('../src/render/accesibilidad', () => ({
  anunciar: () => {},
  movimientoReducido: () => false,
  temblorEfectivo: () => 1,
}));
vi.mock('../src/render/sonido', () => ({ ponerMusica: () => {}, sonar: () => {} }));
vi.mock('../src/render/pantalla', () => ({
  dentro: () => false,
  SALA_ANCHO: 672,
  seguir: () => {},
  vista: { hud: 1, ancho: 672, alto: 416 },
}));
vi.mock('../src/render/entrada', () => ({ dibujarEntrada: () => {} }));

const T = 32;
function pasar(escena: EscenaMapa, segundos: number): void {
  const acciones = crearAcciones();
  for (let t = 0; t < segundos; t += 1 / 60) escena.update(1 / 60, acciones);
}

/** El mapa abierto ya dentro de la sala de evento (sin hacer), con `cambios` en las opciones. */
function enLaSala(
  cumple: (s: SalaZona) => boolean,
  ajustes: Parameters<typeof zonaCon>[1],
  cambios: Partial<OpcionesMapa>,
) {
  const { zona, sala } = zonaCon(cumple, ajustes);
  const montada = montarSalaZona(zona, zona.salas[sala]!, bosque, catalogo);
  const altar = montada.sala.objetos.find((o) => o.inf.name === 'altar');
  const o = opcionesMapa(zona, {
    recuperado: {
      sala,
      lado: null,
      visitadas: [sala],
      hechas: [],
      vencidos: {},
      fuenteUsada: false,
    },
    ...cambios,
  });
  const escena = new EscenaMapa(o);
  const poner = (x: number, y: number): void => {
    const h = o.heroina;
    h.cuerpo.x = h.xAnterior = x;
    h.cuerpo.y = h.yAnterior = y;
  };
  // Junto al objeto del evento (el altar, o donde estaría: el ermitaño vive ahí).
  const casilla = altar ?? { x: montada.ermitano!.columna, y: montada.ermitano!.fila };
  const junto = (): void => poner((casilla.x + 0.5) * T, (casilla.y + 1) * T + 2);
  const lejos = (): void => poner(2.5 * T, 3 * T);
  const hecha = (): boolean => escena.estado().hechas.includes(sala);
  return { escena, junto, lejos, hecha };
}

describe('salas de evento', () => {
  test('desafío: tres combates seguidos y, ganados, el premio (y la sala queda hecha)', () => {
    const empezados: CombateGuardado[] = [];
    const acabar: ((r: Resultado) => void)[] = [];
    let guardados = 0;
    const s = enLaSala(
      (x) => x.evento === 'desafio',
      {},
      {
        usarDesafio: (alTerminar) => alTerminar(true),
        iniciarCombate: (_g, alTerminar, _q, combate) => {
          empezados.push(combate);
          acabar.push(alTerminar);
        },
        alEntrarEnSala: () => guardados++,
      },
    );
    s.junto();
    pasar(s.escena, 1);
    for (let i = 0; i < EVENTOS.desafio.combates; i++) {
      expect(empezados).toHaveLength(i + 1);
      acabar[i]!('victoria');
      pasar(s.escena, 1);
    }
    expect(empezados).toEqual([0, 1, 2].map((paso) => ({ tipo: 'desafio', paso })));
    expect(s.escena.combatePendiente()).toBeNull();
    expect(s.hecha()).toBe(true);
    // El premio guarda la partida sin nada pendiente.
    expect(guardados).toBeGreaterThan(0);
  });

  test('desafío: huir del primero deja el círculo apagado y sin premio', () => {
    const acabar: ((r: Resultado) => void)[] = [];
    let guardados = 0;
    const s = enLaSala(
      (x) => x.evento === 'desafio',
      {},
      {
        usarDesafio: (alTerminar) => alTerminar(true),
        iniciarCombate: (_g, alTerminar) => acabar.push(alTerminar),
        alEntrarEnSala: () => guardados++,
      },
    );
    s.junto();
    pasar(s.escena, 1);
    acabar[0]!('huida');
    pasar(s.escena, 2);
    expect(acabar).toHaveLength(1);
    expect(s.hecha()).toBe(true);
    expect(guardados).toBe(0);
  });

  test('altar: marcharse deja volver a abrirlo al apartarse; un trato lo apaga', () => {
    const tratos: ((usado: boolean, aviso: string) => void)[] = [];
    const s = enLaSala(
      (x) => x.evento === 'altar',
      { probabilidadDesafio: 0 },
      {
        usarAltar: (alTerminar) => tratos.push(alTerminar),
      },
    );
    s.junto();
    pasar(s.escena, 0.5);
    expect(tratos).toHaveLength(1);
    tratos[0]!(false, '');
    pasar(s.escena, 0.5);
    expect(tratos).toHaveLength(1); // quieta al lado, no se reabre
    s.lejos();
    pasar(s.escena, 0.2);
    s.junto();
    pasar(s.escena, 0.2);
    expect(tratos).toHaveLength(2);
    tratos[1]!(true, 'Hecho');
    expect(s.hecha()).toBe(true);
    s.lejos();
    pasar(s.escena, 0.2);
    s.junto();
    pasar(s.escena, 0.2);
    expect(tratos).toHaveLength(2);
  });

  test('mercader: un trueque lo apaga y la sala queda hecha', () => {
    let abierto = 0;
    const s = enLaSala(
      (x) => x.evento === 'mercader',
      { probabilidadDesafio: 0, probabilidadMercader: 1 },
      {
        usarMercader: (alTerminar) => {
          abierto++;
          alTerminar(true, 'Trato');
        },
      },
    );
    s.junto();
    pasar(s.escena, 0.5);
    expect(abierto).toBe(1);
    expect(s.hecha()).toBe(true);
  });

  test('ermitaño: al acercarse ofrece; llevarse algo deja la sala hecha y ya no vuelve a ofrecer', () => {
    let abierto = 0;
    const s = enLaSala(
      (x) => x.evento === 'ermitano',
      { probabilidadDesafio: 0, probabilidadErmitano: 1 },
      {
        usarErmitano: (_azar, alTerminar) => {
          abierto++;
          alTerminar(true, 'Te da');
        },
      },
    );
    s.junto();
    pasar(s.escena, 0.5);
    expect(abierto).toBe(1);
    expect(s.hecha()).toBe(true);
    s.lejos();
    pasar(s.escena, 0.3);
    s.junto();
    pasar(s.escena, 0.5);
    expect(abierto).toBe(1);
  });
});
