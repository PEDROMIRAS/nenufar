import { describe, expect, test, vi } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { montarSalaZona } from '../src/core/montaje';
import bosque from '../src/data/salas/plantillas_bosque.json';
import { EscenaMapa } from '../src/escenas/mapa';
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

const { zona, sala } = zonaCon((s) => s.tipo === 'descanso');
const fuente = montarSalaZona(zona, zona.salas[sala]!, bosque, catalogo).sala.objetos.find(
  (o) => o.inf.name === 'fuente_cen_inf',
)!;

function pasar(escena: EscenaMapa, segundos: number): void {
  const acciones = crearAcciones();
  for (let t = 0; t < segundos; t += 1 / 60) escena.update(1 / 60, acciones);
}

describe('la fuente de la sala de descanso', () => {
  test('junto a la fuente se eligen las habilidades una vez; apartarse y volver la abre otra', () => {
    let veces = 0;
    const o = opcionesMapa(zona, {
      recuperado: {
        sala,
        lado: null,
        visitadas: [sala],
        hechas: [],
        vencidos: {},
        fuenteUsada: false,
      },
      elegirHabilidades: () => veces++,
    });
    const escena = new EscenaMapa(o);
    const poner = (x: number, y: number): void => {
      const h = o.heroina;
      h.cuerpo.x = h.xAnterior = x;
      h.cuerpo.y = h.yAnterior = y;
    };
    const junto = (): void => poner((fuente.x + 0.5) * 32, (fuente.y + 1) * 32 + 2);
    // Recuperada sin lado (como al volver a la hoguera) no se abre hasta acercarse: primero se aparta.
    junto();
    pasar(escena, 0.5);
    expect(veces).toBe(0);
    poner(2.5 * 32, 3 * 32);
    pasar(escena, 0.5);
    junto();
    pasar(escena, 1);
    expect(veces).toBe(1);
    poner(2.5 * 32, 3 * 32);
    pasar(escena, 0.5);
    junto();
    pasar(escena, 0.5);
    expect(veces).toBe(2);
  });

  test('también con la fuente ya usada', () => {
    let veces = 0;
    const o = opcionesMapa(zona, {
      recuperado: {
        sala,
        lado: null,
        visitadas: [sala],
        hechas: [sala],
        vencidos: {},
        fuenteUsada: true,
      },
      elegirHabilidades: () => veces++,
    });
    const escena = new EscenaMapa(o);
    o.heroina.cuerpo.x = o.heroina.xAnterior = 2.5 * 32;
    o.heroina.cuerpo.y = o.heroina.yAnterior = 3 * 32;
    pasar(escena, 0.5);
    o.heroina.cuerpo.x = o.heroina.xAnterior = (fuente.x + 0.5) * 32;
    o.heroina.cuerpo.y = o.heroina.yAnterior = (fuente.y + 1) * 32 + 2;
    pasar(escena, 1);
    expect(veces).toBe(1);
  });
});

describe('la hoguera de la sala de descanso', () => {
  const montada = montarSalaZona(zona, zona.salas[sala]!, bosque, catalogo).sala;
  const hoguera = montada.objetos.find((o) => o.inf.name === 'hoguera')!;
  const estado = {
    sala,
    lado: null,
    visitadas: [sala],
    hechas: [sala],
    vencidos: {},
    fuenteUsada: true,
  };

  function probar(
    prende: boolean,
    encendida = false,
  ): { veces: number; escena: EscenaMapa; mover: (cerca: boolean) => void } {
    const r = { veces: 0 } as {
      veces: number;
      escena: EscenaMapa;
      mover: (cerca: boolean) => void;
    };
    const o = opcionesMapa(zona, {
      recuperado: estado,
      hoguera: {
        encendida,
        encender: () => {
          r.veces++;
          return { prende, aviso: 'x' };
        },
      },
    });
    r.escena = new EscenaMapa(o);
    r.mover = (cerca) => {
      const h = o.heroina;
      h.cuerpo.x = h.xAnterior = cerca ? (hoguera.x + 0.5) * 32 : 2.5 * 32;
      h.cuerpo.y = h.yAnterior = cerca ? (hoguera.y + 1) * 32 + 2 : 3 * 32;
      pasar(r.escena, 0.3);
    };
    return r;
  }

  test('se enciende al acercarse, una sola vez', () => {
    const r = probar(true);
    r.mover(true);
    expect(r.veces).toBe(1);
    r.mover(false);
    r.mover(true);
    expect(r.veces).toBe(1);
  });

  test('sin brasas no prende: lo dice una vez por acercamiento', () => {
    const r = probar(false);
    r.mover(true);
    r.mover(true);
    expect(r.veces).toBe(1);
    r.mover(false);
    r.mover(true);
    expect(r.veces).toBe(2);
  });

  test('ya encendida en la zona (al volver a ella), no se vuelve a encender', () => {
    const r = probar(true, true);
    r.mover(true);
    expect(r.veces).toBe(0);
  });
});
