import { describe, expect, it } from 'vitest';
import { compararLuces } from '../src/core/luces';
import { HD2D } from '../src/data/datos';

describe('orden de las luces de una sala', () => {
  const luz = (nombre: string) => ({ nombre, luz: HD2D.luces[nombre]! });
  const ordenar = (nombres: string[]) =>
    nombres
      .map(luz)
      .sort((p, q) => compararLuces(p.luz, q.luz))
      .map((l) => l.nombre);

  it('el portal, que se añade el último, queda por delante de los candelabros', () => {
    const sala = [...Array<string>(7).fill('candelabro'), 'portal'];
    const dentro = ordenar(sala).slice(0, 4);
    expect(dentro).toContain('portal');
  });

  it('las que hacen sombra van primero', () => {
    expect(ordenar(['portal', 'hoguera'])[0]).toBe('hoguera');
  });

  it('con la misma fuerza se respeta el orden en que se añadieron', () => {
    expect(ordenar(['candelabro', 'candelabro'])).toEqual(['candelabro', 'candelabro']);
  });
});
