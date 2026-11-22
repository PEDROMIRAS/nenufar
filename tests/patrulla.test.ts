import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { avanzar, crearCombate, luchadorDeHeroe, luchadoresDeGrupo } from '../src/core/combate';
import {
  actualizarPatrulla,
  crearPatrulla,
  iniciativa,
  miraX,
  miraY,
  vistaDe,
} from '../src/core/patrulla';
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

describe('avisos de la patrulla', () => {
  test('al verla avisa, la mira y se queda quieto la pausa', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    const azar = crearAzar(1);
    actualizarPatrulla(p, mov, 300, 180, 1 / 60, abierta, T, azar, 0.3);
    expect(p.cambio).toBe(1);
    expect(p.alerta).toBeGreaterThan(0.28);
    expect([p.dirX, p.dirY]).toEqual([1, 0]);
    expect(p.cuerpo.x).toBe(240);
    for (let i = 0; i < 17; i++)
      actualizarPatrulla(p, mov, 300, 180, 1 / 60, abierta, T, azar, 0.3);
    expect(p.cuerpo.x).toBeLessThanOrEqual(241);
    for (let i = 0; i < 30; i++)
      actualizarPatrulla(p, mov, 300, 180, 1 / 60, abierta, T, azar, 0.3);
    expect(p.cuerpo.x).toBeGreaterThan(250);
  });

  test('cambio vuelve a 0', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    actualizarPatrulla(p, mov, 300, 180, 1 / 60, abierta, T, crearAzar(1), 0.3);
    expect(p.cambio).toBe(1);
    actualizarPatrulla(p, mov, 300, 180, 1 / 60, abierta, T, crearAzar(1), 0.3);
    expect(p.cambio).toBe(0);
  });

  test('al perderla avisa con -1', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    p.persiguiendo = true;
    actualizarPatrulla(p, mov, 240 + 121, 180, 1 / 60, abierta, T, crearAzar(1), 0.3);
    expect(p.cambio).toBe(-1);
  });

  test('histéresis: entre la visión y el olvido no cambia nada', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    p.persiguiendo = true;
    const azar = crearAzar(1);
    for (let i = 0; i < 60; i++) {
      // La heroína se aparta a la vez que la sigue: siempre a 100 px.
      actualizarPatrulla(p, mov, p.cuerpo.x + 100, 180, 1 / 60, abierta, T, azar, 0.3);
      expect(p.cambio).toBe(0);
    }
  });
});

describe('cono de visión', () => {
  // 120° delante y 32 px en redondo; recién creado mira hacia abajo (+y).
  const vista = vistaDe({ angulo: 120, cerca: 32 });
  const paso = (p: ReturnType<typeof crearPatrulla>, x: number, y: number) =>
    actualizarPatrulla(p, mov, x, y, 1 / 60, abierta, T, crearAzar(1), 0.3, vista);

  test('no la ve detrás de él aunque esté dentro de su visión', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    paso(p, 240, 180 - 60);
    expect(p.persiguiendo).toBe(false);
    expect(p.cambio).toBe(0);
  });

  test('tampoco a un lado, fuera del cono', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    paso(p, 240 + 60, 180);
    expect(p.persiguiendo).toBe(false);
  });

  test('delante la ve y la mira enseguida', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    paso(p, 240 + 20, 180 + 60);
    expect(p.cambio).toBe(1);
    expect(p.dirX).toBeGreaterThan(0.3);
  });

  test('muy cerca la nota por detrás, pero no se gira hasta lanzarse: tocarlo antes es pillarlo por la espalda', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    paso(p, 240, 180 - 20);
    expect(p.cambio).toBe(1);
    expect([p.dirX, p.dirY]).toEqual([0, 1]);
    const h = { x: 240, y: 180 - 20, dirX: 0, dirY: 1 };
    expect(iniciativa(h, { x: 240, y: 180, dirX: p.dirX, dirY: p.dirY })).toBe('heroina');
    // Acabada la pausa, va a por ella y la mira.
    for (let i = 0; i < 30; i++) paso(p, 240, 180 - 20);
    expect(p.dirY).toBeLessThan(0);
  });

  test('ya persiguiéndola, no la pierde por quedarse a su espalda', () => {
    const p = crearPatrulla(cuerpo(240, 180));
    p.persiguiendo = true;
    paso(p, 240, 180 - 60);
    expect(p.persiguiendo).toBe(true);
    expect(p.cambio).toBe(0);
  });

  describe('de lado (su hoja solo tiene esa vista)', () => {
    const deLado = { ...mov, deLado: true };
    const pasoLado = (p: ReturnType<typeof crearPatrulla>, x: number, y: number) =>
      actualizarPatrulla(p, deLado, x, y, 1 / 60, abierta, T, crearAzar(1), 0.3, vista);

    test('mira a la derecha al empezar: la ve a su derecha y no debajo', () => {
      const p = crearPatrulla(cuerpo(240, 180));
      expect([miraX(p, deLado), miraY(p, deLado)]).toEqual([1, 0]);
      pasoLado(p, 240, 180 + 60);
      expect(p.persiguiendo).toBe(false);
      pasoLado(p, 240 + 60, 180);
      expect(p.persiguiendo).toBe(true);
    });

    test('al bajar después de ir a la izquierda sigue mirando a la izquierda', () => {
      const p = crearPatrulla(cuerpo(240, 180));
      p.persiguiendo = true;
      p.alerta = 0;
      // Persigue hacia la izquierda y luego casi en vertical, hacia abajo.
      for (let i = 0; i < 30; i++) pasoLado(p, p.cuerpo.x - 70, 180);
      expect(miraX(p, deLado)).toBe(-1);
      for (let i = 0; i < 30; i++) pasoLado(p, p.cuerpo.x + 1, p.cuerpo.y + 70);
      expect([miraX(p, deLado), miraY(p, deLado)]).toEqual([-1, 0]);
    });

    test('sin «deLado» mira hacia donde se mueve, como siempre', () => {
      const p = crearPatrulla(cuerpo(240, 180));
      expect([miraX(p, mov), miraY(p, mov)]).toEqual([0, 1]);
    });
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
    expect(avanzar(conVentaja).slice(0, 2)).toMatchObject([
      { tipo: 'iniciativa', quien: 'heroina' },
      { tipo: 'turno', actor: conVentaja.heroina },
    ]);
    const sorprendida = crear();
    sorprendida.heroina.velocidad = 99;
    sorprendida.iniciativa = 'monstruos';
    const eventos = avanzar(sorprendida);
    expect(eventos[1]).toMatchObject({ tipo: 'turno', actor: sorprendida.enemigos[0] });
  });
});

describe('línea de vista', () => {
  /** Sala abierta de 15×11 con casillas marcadas: «#» muro (sólido y opaco), «~» agua (sólida, no tapa la vista). */
  function conMuro(dibujo: Record<string, '#' | '~'>) {
    const solido = new Array<boolean>(165).fill(false);
    const opaco = new Array<boolean>(165).fill(false);
    for (const [k, v] of Object.entries(dibujo)) {
      const [c, f] = k.split(',').map(Number) as [number, number];
      solido[f * 15 + c] = true;
      opaco[f * 15 + c] = v === '#';
    }
    return { ancho: 15, alto: 11, solido, opaco };
  }
  // Monstruo en la casilla (2, 5) y la heroína en la (4, 5), a 64 px (ve a 80); en medio, la casilla (3, 5).
  const m = () => crearPatrulla(cuerpo(2 * T + 16, 5 * T + 22));
  const hx = 4 * T + 16;
  const hy = 5 * T + 22;

  test('no la ve a través de un muro u objeto alto', () => {
    const p = m();
    actualizarPatrulla(p, mov, hx, hy, 1 / 60, conMuro({ '3,5': '#' }), T, crearAzar(1));
    expect(p.persiguiendo).toBe(false);
  });

  test('sí a través del agua', () => {
    const p = m();
    actualizarPatrulla(p, mov, hx, hy, 1 / 60, conMuro({ '3,5': '~' }), T, crearAzar(1));
    expect(p.persiguiendo).toBe(true);
  });

  test('si se esconde tras un muro, va a donde la vio y, sin verla, la pierde', () => {
    // Un muro en la columna 5; con vista larga, para que la pierda por el muro y no por la distancia.
    const sala = conMuro({
      '5,2': '#',
      '5,3': '#',
      '5,4': '#',
      '5,5': '#',
      '5,6': '#',
      '5,7': '#',
      '5,8': '#',
    });
    const lejos = { ...mov, vision: 200 };
    const vista = { ...vistaDe({ angulo: 360, cerca: 0 }), olvido: 2 };
    const p = m();
    const azar = crearAzar(1);
    actualizarPatrulla(p, lejos, hx, hy, 1 / 60, sala, T, azar, 0, vista);
    expect(p.persiguiendo).toBe(true);
    // Se esconde detrás del muro: el monstruo va hacia donde la vio y acaba perdiéndola.
    let perdida = false;
    for (let t = 0; t < 4 && !perdida; t += 1 / 60) {
      actualizarPatrulla(p, lejos, 6 * T + 16, 5 * T + 22, 1 / 60, sala, T, azar, 0, vista);
      if (p.cambio === -1) perdida = true;
    }
    expect(perdida).toBe(true);
    expect(p.persiguiendo).toBe(false);
    // Fue hacia donde la vio (x = 144), sin rodear el muro hasta donde está.
    expect(p.cuerpo.x).toBeGreaterThan(3 * T);
    expect(p.cuerpo.x).toBeLessThan(5 * T);
  });
});
