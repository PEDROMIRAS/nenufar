import { expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { luchadorDeHeroe } from '../src/core/combate';
import { bestiarioCon, reglasCon } from '../src/core/dificultad';
import { equipar, inventarioInicial } from '../src/core/equipo';
import { DIFICULTADES, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import { pelear } from './simulador';

test('cada pieza que suelta un combate, o se la pone o va a lo que le sobra (para el mercader)', () => {
  const dificultad = DIFICULTADES.facil;
  const bestiario = bestiarioCon(MONSTRUOS, dificultad);
  // Un limo que siempre suelta un arma o una armadura de nivel 1.
  const limo = {
    ...bestiario.limo!,
    botin: [
      { objeto: 'arma', nivel: 1, peso: 1 },
      { objeto: 'armadura', nivel: 1, peso: 1 },
    ],
  };
  const mundo = { bestiario: { ...bestiario, limo }, reglas: reglasCon(REGLAS, dificultad) };
  let soltadas = 0;
  for (let s = 1; s <= 20; s++) {
    const heroe = HEROES.ronin;
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    // Con lo mejor puesto, lo de nivel 1 no se lo pone.
    equipar(h, inv, OBJETOS, 'katana_brasas');
    equipar(h, inv, OBJETOS, 'armadura_obsidiana');
    const antes = [inv.arma, inv.armadura];
    const sobran: string[] = [];
    const gana = pelear(h, inv, ['limo'], crearAzar(s), mundo, undefined, (k) => sobran.push(k));
    if (!gana) continue;
    // Un limo, una pieza, y no se la pone: sobra.
    expect([inv.arma, inv.armadura]).toEqual(antes);
    expect(sobran).toHaveLength(1);
    soltadas++;
  }
  expect(soltadas).toBeGreaterThan(0);
});
