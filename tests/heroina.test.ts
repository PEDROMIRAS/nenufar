import { describe, expect, test } from 'vitest';
import type { Acciones } from '../src/core/acciones';
import { actualizarHeroina, crearHeroina } from '../src/core/heroina';

const datos = { sprite: 'x', velocidad: 60, caja: { ancho: 14, alto: 8 }, margenEsquina: 8 };
const libre = { ancho: 10, alto: 10, solido: new Array<boolean>(100).fill(false) };
const acciones = (moverX: number, moverY: number): Acciones => ({
  moverX,
  moverY,
  confirmar: false,
  cancelar: false,
  menu: false,
});

describe('actualizarHeroina', () => {
  test('avanza velocidad × dt y guarda la posición anterior', () => {
    const h = crearHeroina(datos, 100, 100);
    actualizarHeroina(h, acciones(1, 0), 0.5, libre, 32);
    expect(h.cuerpo.x).toBe(130);
    expect(h.xAnterior).toBe(100);
  });

  test('en diagonal sigue mirando hacia donde ya miraba si es una de las dos', () => {
    const h = crearHeroina(datos, 100, 100);
    actualizarHeroina(h, acciones(0, 1), 0.01, libre, 32);
    expect(h.direccion).toBe('down');
    actualizarHeroina(h, acciones(Math.SQRT1_2, Math.SQRT1_2), 0.01, libre, 32);
    expect(h.direccion).toBe('down');
    actualizarHeroina(h, acciones(-Math.SQRT1_2, -Math.SQRT1_2), 0.01, libre, 32);
    expect(h.direccion).toBe('left');
  });

  test('al cambiar de quieta a andando la animación empieza desde el principio', () => {
    const h = crearHeroina(datos, 100, 100);
    actualizarHeroina(h, acciones(0, 0), 0.5, libre, 32);
    expect(h.tiempoAnimacion).toBe(0.5);
    actualizarHeroina(h, acciones(1, 0), 0.1, libre, 32);
    expect([h.animacion, h.tiempoAnimacion]).toEqual(['walk', 0]);
  });
});
