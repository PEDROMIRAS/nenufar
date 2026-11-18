import { beforeEach, describe, expect, it } from 'vitest';
import { crearAcciones, type Acciones } from '../src/core/acciones';
import { leerMando, type MandoLeido } from '../src/core/mando';
import controles from '../src/data/controles.json';

const D = controles.mando;

interface MandoFalso extends MandoLeido {
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
}

function mandoFalso(): MandoFalso {
  return {
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    axes: [0, 0, 0, 0],
  };
}

function pulsar(m: MandoFalso, i: number, pulsado = true, valor = pulsado ? 1 : 0): void {
  m.buttons[i] = { pressed: pulsado, value: valor };
}

describe('leerMando', () => {
  let m: MandoFalso;
  let antes: boolean[];
  let a: Acciones;
  const paso = (): boolean => {
    a = crearAcciones();
    return leerMando(m, antes, D, a);
  };

  beforeEach(() => {
    m = mandoFalso();
    antes = new Array<boolean>(17).fill(false);
  });

  it('A pulsada confirma', () => {
    pulsar(m, D.botones.confirmar);
    expect(paso()).toBe(true);
    expect(a.confirmar).toBe(true);
  });

  it('A mantenida confirma una vez', () => {
    pulsar(m, D.botones.confirmar);
    paso();
    paso();
    expect(a.confirmar).toBe(false);
    pulsar(m, D.botones.confirmar, false);
    paso();
    pulsar(m, D.botones.confirmar);
    paso();
    expect(a.confirmar).toBe(true);
  });

  it('B, Menú e Y', () => {
    pulsar(m, D.botones.cancelar);
    paso();
    expect(a.cancelar).toBe(true);
    pulsar(m, D.botones.menu);
    paso();
    expect(a.menu).toBe(true);
    pulsar(m, D.botones.info);
    paso();
    expect(a.info).toBe(true);
  });

  it('correr mantenido', () => {
    pulsar(m, D.botones.correr);
    paso();
    expect(a.correr).toBe(true);
    paso();
    expect(a.correr).toBe(true);
    pulsar(m, D.botones.correr, false);
    pulsar(m, D.botones.gatilloCorrer, false, 0.6);
    paso();
    expect(a.correr).toBe(true);
    pulsar(m, D.botones.gatilloCorrer, false, 0.3);
    paso();
    expect(a.correr).toBe(false);
  });

  it('zona muerta', () => {
    m.axes[0] = 0.2;
    expect(paso()).toBe(false);
    expect(a.moverX).toBe(0);
    m.axes[0] = 0.9;
    paso();
    expect(a.moverX).toBe(1);
  });

  it('diagonal', () => {
    m.axes[0] = 0.7;
    m.axes[1] = 0.7;
    paso();
    expect(a.moverX).toBeCloseTo(Math.SQRT1_2);
    expect(a.moverY).toBeCloseTo(Math.SQRT1_2);
  });

  it('la cruceta gana al stick', () => {
    m.axes[0] = -0.9;
    pulsar(m, D.botones.derecha);
    paso();
    expect(a.moverX).toBe(1);
  });

  it('mando en reposo no cuenta', () => {
    m.axes[0] = 0.1;
    m.axes[1] = -0.1;
    expect(paso()).toBe(false);
    expect(a).toEqual(crearAcciones());
  });

  it('botones que no existen cuentan como sueltos', () => {
    m.buttons.length = 4;
    expect(paso()).toBe(false);
  });
});
