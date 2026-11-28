import { describe, expect, test, vi } from 'vitest';
import { luchadorDeHeroe } from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import { heroinaGuardada, VERSION_GUARDADO, type PartidaGuardada } from '../src/core/guardado';
import { copiaHoguera } from '../src/core/hoguera';
import { HEROES, OBJETOS } from '../src/data/datos';
import { EscenaNegra } from '../src/escenas/negra';
import { PilaEscenas } from '../src/escenas/pila';
import { intentarVuelta, type PartidaVuelta } from '../src/partida/vuelta';

function partida(
  brasas: number,
  conHoguera = true,
): { p: PartidaVuelta; mapa: ReturnType<typeof escena> } {
  const l = luchadorDeHeroe(HEROES.ronin);
  const pila = new PilaEscenas();
  const mapa = escena();
  pila.apilar(mapa);
  const hoguera = copiaHoguera({
    version: VERSION_GUARDADO,
    semilla: 7,
    zona: 0,
    heroe: 'ronin',
    dificultad: 'normal',
    combates: 3,
    vencidos: 4,
    violetasAntes: 0,
    dragonAntes: false,
    rival: 'x',
    segundos: 10,
    combate: null,
    heroina: heroinaGuardada(l),
    inventario: inventarioInicial(l, HEROES.ronin, OBJETOS),
    mapa: { sala: 2, lado: 1, visitadas: [2], hechas: [], vencidos: {}, fuenteUsada: false },
  });
  const p: PartidaVuelta = {
    pila,
    brasas,
    vueltas: 0,
    hoguera: conHoguera ? hoguera : null,
    combates: 9,
    inventario: inventarioInicial(l, HEROES.ronin, OBJETOS),
  };
  return { p, mapa };
}

function escena() {
  return { enter: vi.fn(), update: vi.fn(), draw: vi.fn(), exit: vi.fn() };
}

describe('caer con la hoguera encendida', () => {
  test('quita el mapa antes de nada, guarda la vuelta con una brasa menos y vuelve', () => {
    const { p, mapa } = partida(1);
    const orden: string[] = [];
    const guardadas: PartidaGuardada[] = [];
    mapa.exit.mockImplementation(() => orden.push('mapa fuera'));
    const volvio = intentarVuelta(
      p,
      50,
      (g) => {
        orden.push('guardar');
        guardadas.push(g);
      },
      () => orden.push('volver'),
    );
    expect(volvio).toBe(true);
    expect(orden).toEqual(['mapa fuera', 'guardar', 'volver']);
    expect(guardadas[0]).toMatchObject({ brasas: 0, vueltas: 1, combates: 9, segundos: 50 });
    // El mapa viejo ya no recibe pasos mientras carga la zona de la hoguera.
    p.pila.update(1 / 60, {} as never);
    expect(mapa.update).not.toHaveBeenCalled();
    expect((p.pila as unknown as { escenas: unknown[] }).escenas).toHaveLength(1);
    expect((p.pila as unknown as { escenas: unknown[] }).escenas[0]).toBeInstanceOf(EscenaNegra);
  });

  test('sin brasas o sin hoguera no toca nada', () => {
    for (const { p, mapa } of [partida(0), partida(2, false)]) {
      const guardar = vi.fn();
      const volver = vi.fn();
      expect(intentarVuelta(p, 1, guardar, volver)).toBe(false);
      expect(guardar).not.toHaveBeenCalled();
      expect(volver).not.toHaveBeenCalled();
      expect(mapa.exit).not.toHaveBeenCalled();
    }
  });
});
