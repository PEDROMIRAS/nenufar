import { beforeEach, describe, expect, test, vi } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { luchadorDeHeroe, type Resultado } from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import type { CombateGuardado, EstadoMapa } from '../src/core/guardado';
import { crearHeroina } from '../src/core/heroina';
import { crearCatalogo } from '../src/core/sala';
import type { MonstruoJson, TilesetJson } from '../src/core/types';
import { generarZona } from '../src/core/zona';
import { EVENTOS, HD2D, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import bosque from '../src/data/salas/plantillas_bosque.json';
import zonas from '../src/data/zonas.json';
import { EscenaMapa, type OpcionesMapa } from '../src/escenas/mapa';
import type { Mundo } from '../src/render/mundo/mundo';
import type { Sprite } from '../src/render/recursos';
import bosqueAuto from '../public/assets/tilesets/bosque_autotiles.json';
import bosqueTiles from '../public/assets/tilesets/bosque.json';
import comunes from '../public/assets/tilesets/comunes.json';

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

const datos = zonas.zonas.bosque;
const catalogo = crearCatalogo([bosqueTiles, comunes, bosqueAuto] as unknown as TilesetJson[]);
const monstruo = (clave: string): MonstruoJson => MONSTRUOS[clave]!;

/** Un Bosque con desafío (todos los eventos lo son) y el índice de su sala. */
function zonaConDesafio(): { zona: ReturnType<typeof generarZona>; sala: number } {
  for (let semilla = 1; ; semilla++) {
    const zona = generarZona(
      {
        ...zonas.generacion,
        salas: datos.salas,
        probabilidadEvento: 1,
        probabilidadDesafio: 1,
      },
      semilla,
    );
    const sala = zona.salas.findIndex((s) => s.evento === 'desafio');
    if (sala >= 0) return { zona, sala };
  }
}
const { zona, sala } = zonaConDesafio();

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
  const heroe = HEROES.ronin!;
  const luchadora = luchadorDeHeroe(heroe);
  const o: OpcionesMapa = {
    zona,
    plantillas: bosque,
    catalogo,
    imagenes: [],
    tam: 32,
    heroina: crearHeroina(heroe, 0, 0),
    sprite: { datos: { animations: {} } } as unknown as Sprite,
    musica: 'bosque',
    spritesMonstruos: new Map(),
    duracionFundido: zonas.transicionSalas,
    rejilla: zonas.generacion.rejilla,
    alUsarPortal: null,
    entrarDesdeNegro: false,
    grupos: datos.grupos.map(({ monstruos, peso }) => ({
      peso,
      monstruos: monstruos.map(monstruo),
    })),
    gruposPorSala: zonas.monstruos.gruposPorSala,
    gruposExtra: 0,
    modoFuente: 'todo',
    presagio: null,
    jefe: monstruo(datos.jefe),
    jefeVioleta: null,
    cofreTrampa: monstruo(datos.cofreTrampa),
    distanciaMonstruos: zonas.monstruos.distanciaEntradas,
    invulnerabilidad: REGLAS.invulnerabilidadTrasCombate,
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
    luchadora,
    nombreZona: datos.nombre,
    lluviaTrasJefe: 0,
    pistas: [],
    segundosPista: 1,
    cofre: datos.cofre,
    inventario: inventarioInicial(luchadora, heroe, OBJETOS),
    objetos: OBJETOS,
    usarAltar: () => {},
    desafio: EVENTOS.desafio,
    usarDesafio: () => {},
    ermitano: EVENTOS.ermitano,
    usarErmitano: () => {},
    usarMercader: () => {},
    // La comparación de la pieza se cierra en el acto.
    ofrecerEquipo: (_clave, alFinal) => alFinal(),
    abrirPausa: () => {},
    mundo: { refrescarLuces: () => {}, rehacerObjeto: () => {} } as unknown as Mundo,
    aspecto: HD2D.zonas.bosque!,
    fuente: HD2D.fuente,
    recuperado: recuperado?.mapa ?? null,
    alEntrarEnSala: (estado) => guardar(estado, null),
  };
  const escena: EscenaMapa = new EscenaMapa(o);
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
