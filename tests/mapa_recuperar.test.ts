import { beforeEach, describe, expect, test, vi } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { type Resultado } from '../src/core/combate';
import type { CombateGuardado, EstadoMapa } from '../src/core/guardado';
import { EVENTOS } from '../src/data/datos';
import { EscenaMapa } from '../src/escenas/mapa';
import { opcionesMapa, zonaCon } from './mapa_falso';

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

const { zona, sala } = zonaCon((s) => s.evento === 'desafio');

/** Lo que hay en el almacenamiento: el estado del mapa y el combate interrumpido o pendiente. */
interface Disco {
  mapa: EstadoMapa;
  combate: CombateGuardado | null;
}
let disco: Disco | null;
const guardar = (mapa: EstadoMapa, combate: CombateGuardado | null): void => {
  disco = structuredClone({ mapa, combate });
};
/** Combates que el mapa ha pedido empezar en la última apertura, con lo que pasa al acabarlos. */
let combates: { combate: CombateGuardado; acabar: (r: Resultado) => void }[];

/**
 * Abre la zona como `crearZona` (src/partida/zona.ts): nueva o recuperada del disco, y con el mismo guardado al entrar
 * en una sala, al empezar un combate (con él) y al acabarlo (con lo pendiente). Como al recargar, reanuda el combate.
 */
function abrir(recuperado: Disco | null): EscenaMapa {
  combates = [];
  const escena: EscenaMapa = new EscenaMapa(
    opcionesMapa(zona, {
      iniciarCombate: (_grupo, alTerminarMapa, _quien, combate) => {
        guardar(escena.estado(), combate);
        combates.push({
          combate,
          acabar: (r) => {
            alTerminarMapa(r);
            guardar(escena.estado(), escena.combatePendiente());
          },
        });
      },
      recuperado: recuperado?.mapa ?? null,
      alEntrarEnSala: (estado) => guardar(estado, null),
    }),
  );
  return escena;
}

/** `segundos` de juego sin tocar nada (la entrada al combate dura menos). */
function pasar(escena: EscenaMapa, segundos = 2): void {
  const acciones = crearAcciones();
  for (let t = 0; t < segundos; t += 1 / 60) escena.update(1 / 60, acciones);
}

/** Recarga la página: abre lo guardado y, tras el cartel, reanuda lo que hubiera pendiente. */
function recargar(): EscenaMapa {
  const guardado = structuredClone(disco);
  const escena = abrir(guardado);
  if (guardado?.combate) escena.reanudarCombate(guardado.combate);
  pasar(escena);
  return escena;
}

const desafio = (paso: number): CombateGuardado => ({ tipo: 'desafio', paso });

describe('recuperar una partida no borra lo que había pendiente', () => {
  beforeEach(() => {
    // Se cerró en mitad del segundo combate del desafío (el círculo ya apagado: la sala está hecha).
    disco = {
      mapa: {
        sala,
        lado: null,
        visitadas: [sala],
        hechas: [sala],
        vencidos: {},
        fuenteUsada: false,
      },
      combate: desafio(1),
    };
  });

  test('al abrir la zona recuperada, el guardado sigue con el combate interrumpido', () => {
    abrir(structuredClone(disco));
    expect(disco?.combate).toEqual(desafio(1));
  });

  test('cerrar dos veces seguidas en cada momento del desafío no pierde la cadena ni el premio', () => {
    // Se cierra otra vez con el cartel «Combate interrumpido» en pantalla, antes de volver al combate.
    abrir(structuredClone(disco));
    recargar();
    expect(combates.map((c) => c.combate)).toEqual([desafio(1)]);
    combates[0]!.acabar('victoria');
    expect(disco?.combate).toEqual(desafio(2));

    // Cerrar entre combates (dos veces) y volver: el tercero.
    abrir(structuredClone(disco));
    recargar();
    expect(combates.map((c) => c.combate)).toEqual([desafio(2)]);
    combates[0]!.acabar('victoria');
    // Con el último ganado, lo pendiente es el premio.
    expect(disco?.combate).toEqual(desafio(EVENTOS.desafio.combates));

    abrir(structuredClone(disco));
    expect(disco?.combate).toEqual(desafio(EVENTOS.desafio.combates));
    recargar();
    // El premio resuelto: ya no queda nada pendiente, y recargar no lo repite.
    expect(combates).toEqual([]);
    expect(disco?.combate).toBeNull();
  });
});
