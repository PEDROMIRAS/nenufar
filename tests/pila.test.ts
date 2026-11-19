import { expect, test } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import type { Escena } from '../src/escenas/escena';
import { PilaEscenas } from '../src/escenas/pila';

const acciones = crearAcciones();
const registro: string[] = [];
const escena = (nombre: string): Escena => ({
  enter: () => registro.push(`${nombre}.enter`),
  exit: () => registro.push(`${nombre}.exit`),
  update: () => registro.push(`${nombre}.update`),
  draw: () => {},
});

test('solo la escena de arriba se actualiza, y al desapilar vuelve la de debajo', () => {
  const pila = new PilaEscenas();
  pila.apilar(escena('mapa'));
  pila.apilar(escena('combate'));
  pila.update(1 / 60, acciones);
  pila.desapilar();
  pila.update(1 / 60, acciones);
  pila.cambiar(escena('otraZona'));
  expect(registro).toEqual([
    'mapa.enter',
    'combate.enter',
    'combate.update',
    'combate.exit',
    'mapa.update',
    'mapa.exit',
    'otraZona.enter',
  ]);
});

test('la pila avisa de si la escena de arriba dibuja en la ventana y si pide la interfaz alta', () => {
  const avisos: [boolean, boolean][] = [];
  const pila = new PilaEscenas((ventana, alta) => avisos.push([ventana, alta]));
  pila.apilar({ ...escena('mapa'), ventana: true });
  pila.apilar({ ...escena('combate'), alta: true });
  pila.apilar(escena('menu'));
  pila.desapilar();
  pila.desapilar();
  expect(avisos).toEqual([
    [true, false],
    [false, true],
    [false, false],
    [false, true],
    [true, false],
  ]);
});

test('alguna dice si hay una escena así en cualquier nivel de la pila, no solo arriba', () => {
  const pila = new PilaEscenas();
  const pausa = escena('pausa');
  pila.apilar(escena('mapa'));
  pila.apilar(pausa);
  pila.apilar(escena('equipo'));
  expect(pila.alguna((e) => e === pausa)).toBe(true);
  pila.desapilar();
  pila.desapilar();
  expect(pila.alguna((e) => e === pausa)).toBe(false);
});

test('tras fundirDesdeNegro, encima de la escena de arriba sale un velo negro que se aclara y desaparece', () => {
  const pila = new PilaEscenas();
  pila.apilar(escena('nivel'));
  const opacidades: number[] = [];
  const ctx = {
    canvas: { width: 100, height: 50 },
    globalAlpha: 1,
    fillStyle: '',
    save: () => {},
    restore: () => {},
    setTransform: () => {},
    fillRect(this: { globalAlpha: number }) {
      opacidades.push(this.globalAlpha);
    },
  } as unknown as CanvasRenderingContext2D;
  pila.fundirDesdeNegro(0.3);
  pila.draw(ctx, 0);
  pila.update(0.15, acciones);
  pila.draw(ctx, 0);
  pila.update(0.2, acciones);
  pila.draw(ctx, 0);
  expect(opacidades[0]).toBeCloseTo(1);
  expect(opacidades[1]).toBeCloseTo(0.5);
  expect(opacidades).toHaveLength(2);
});
