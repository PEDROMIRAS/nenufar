import { beforeEach, describe, expect, test } from 'vitest';
import { crearAcciones } from '../src/core/acciones';
import { leerFuentes } from '../src/input/fuente';

// El teclado escucha en la ventana: aquí, unos oyentes falsos a los que se mandan las teclas a mano.
type Oyente = (e: {
  code: string;
  repeat?: boolean;
  target?: unknown;
  preventDefault(): void;
}) => void;
const oyentes = new Map<string, Oyente[]>();
const g = globalThis as unknown as Record<string, unknown>;
g.addEventListener = (tipo: string, fn: Oyente) =>
  oyentes.set(tipo, [...(oyentes.get(tipo) ?? []), fn]);
g.HTMLInputElement = class {};
g.HTMLButtonElement = class {};
const { crearTeclado } = await import('../src/input/teclado');

const tecla = (tipo: 'keydown' | 'keyup', code: string): void => {
  for (const fn of oyentes.get(tipo) ?? []) fn({ code, preventDefault: () => {} });
};

describe('teclado', () => {
  let teclado: ReturnType<typeof crearTeclado>;
  const acciones = crearAcciones();
  const paso = (): typeof acciones => {
    leerFuentes([teclado], acciones);
    return acciones;
  };
  beforeEach(() => {
    oyentes.clear();
    teclado = crearTeclado();
  });

  test('una flecha pulsada y soltada entre dos pasos cuenta como dirección en el paso siguiente, y solo en ese', () => {
    tecla('keydown', 'ArrowDown');
    tecla('keyup', 'ArrowDown');
    expect(paso().moverY).toBe(1);
    expect(paso().moverY).toBe(0);
  });

  test('una flecha mantenida sigue contando hasta soltarla', () => {
    tecla('keydown', 'ArrowRight');
    expect(paso().moverX).toBe(1);
    expect(paso().moverX).toBe(1);
    tecla('keyup', 'ArrowRight');
    expect(paso().moverX).toBe(0);
  });

  test('Enter pulsado y soltado entre dos pasos confirma una vez', () => {
    tecla('keydown', 'Enter');
    tecla('keyup', 'Enter');
    expect(paso().confirmar).toBe(true);
    expect(paso().confirmar).toBe(false);
  });
});
