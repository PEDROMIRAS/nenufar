import { describe, expect, test } from 'vitest';
import { HD2D } from '../src/data/datos';

describe('aspecto HD-2D del Cauce Seco', () => {
  const cauce = HD2D.zonas['cauce'];
  const cripta = HD2D.zonas['cripta'];

  test('tiene las mismas claves que las demás zonas', () => {
    expect(cauce).toBeDefined();
    expect(Object.keys(cauce!).sort()).toEqual(Object.keys(cripta!).sort());
  });

  test('las fosas son de lava y el borde es de sillares', () => {
    expect(cauce?.hundido.autotile).toBe('lava');
    expect(cauce?.borde.tipo).toBe('sillares');
  });

  test('el brasero tiene luz, con la misma forma que el candelabro', () => {
    expect(HD2D.luces['brasero']).toBeDefined();
    expect(Object.keys(HD2D.luces['brasero']!).sort()).toEqual(
      Object.keys(HD2D.luces['candelabro']!).sort(),
    );
  });
});
