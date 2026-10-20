import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { avanzar, crearCombate, luchadorDeHeroe, luchadoresDeGrupo } from '../src/core/combate';
import { actualizarPatrulla, crearPatrulla, iniciativa } from '../src/core/patrulla';
import { HEROES, MONSTRUOS, REGLAS } from '../src/data/datos';

const T = 32;
// Sala abierta de 15×11 sin muros.
const abierta = { ancho: 15, alto: 11, solido: new Array<boolean>(165).fill(false) };
const mov = { velocidad: 30, persecucion: 60, vision: 80, patrulla: 48 };
const cuerpo = (x: number, y: number) => ({ x, y, ancho: 20, alto: 12 });

describe('patrulla', () => {
  test('sin ver a la heroína se queda cerca de su casa', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    const azar = crearAzar(5);
    let lejos = 0;
    for (let i = 0; i < 60 * 30; i++) {
      actualizarPatrulla(p, mov, 10, 10, 1 / 60, abierta, T, azar);
      lejos = Math.max(lejos, Math.hypot(p.cuerpo.x - 240, p.cuerpo.y - 180));
    }
    expect(lejos).toBeGreaterThan(0); // se mueve…
    expect(lejos).toBeLessThanOrEqual(mov.patrulla + 1); // …sin salir de su zona
  });

  test('si la ve, la persigue a su velocidad de persecución y mira hacia ella', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    actualizarPatrulla(p, mov, 300, 180, 1, abierta, T, crearAzar(1));
    expect(p.persiguiendo).toBe(true);
    expect(p.cuerpo.x).toBe(300); // 60 px en un segundo, justo hasta ella
    expect([p.dirX, p.dirY]).toEqual([1, 0]);
  });

  test('deja de perseguir cuando la heroína se aleja más de 1,5 veces su visión', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    p.persiguiendo = true;
    actualizarPatrulla(p, mov, 240 + 121, 180, 1 / 60, abierta, T, crearAzar(1));
    expect(p.persiguiendo).toBe(false);
  });
});

describe('iniciativa', () => {
  const monstruo = { x: 100, y: 100, dirX: 1, dirY: 0 }; // mira a la derecha

  test('si el monstruo le da la espalda, empieza la heroína', () => {
    expect(iniciativa({ x: 90, y: 100, dirX: 1, dirY: 0 }, monstruo)).toBe('heroina');
  });

  test('si la heroína le da la espalda, empieza el monstruo', () => {
    // La heroína está delante del monstruo mirando hacia fuera: él la alcanza por detrás.
    expect(iniciativa({ x: 110, y: 100, dirX: 1, dirY: 0 }, monstruo)).toBe('monstruos');
  });

  test('cara a cara no empieza nadie en especial', () => {
    expect(iniciativa({ x: 110, y: 100, dirX: -1, dirY: 0 }, monstruo)).toBeNull();
  });

  test('en combate, la iniciativa pone a la heroína primera o última en la primera ronda', () => {
    // El Murciélago es más rápido: sin iniciativa actuaría antes.
    const crear = () =>
      crearCombate(
        luchadorDeHeroe(HEROES.ronin),
        luchadoresDeGrupo([MONSTRUOS.murcielago!]),
        REGLAS,
        () => 0.5,
      );
    const conVentaja = crear();
    conVentaja.iniciativa = 'heroina';
    expect(avanzar(conVentaja).slice(0, 2)).toEqual([
      { tipo: 'iniciativa', quien: 'heroina' },
      { tipo: 'turno', actor: conVentaja.heroina },
    ]);
    const sorprendida = crear();
    sorprendida.heroina.velocidad = 99;
    sorprendida.iniciativa = 'monstruos';
    const eventos = avanzar(sorprendida);
    expect(eventos[1]).toEqual({ tipo: 'turno', actor: sorprendida.enemigos[0] });
  });
});
