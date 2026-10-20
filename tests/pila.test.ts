import { expect, test } from 'vitest';
import type { Acciones } from '../src/core/acciones';
import type { Escena } from '../src/escenas/escena';
import { PilaEscenas } from '../src/escenas/pila';

const acciones: Acciones = { moverX: 0, moverY: 0, confirmar: false, cancelar: false, menu: false };
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
