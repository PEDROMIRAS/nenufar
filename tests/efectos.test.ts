import { expect, test } from 'vitest';
import { HEROES } from '../src/data/datos';
import hoja from '../public/assets/sprites/efectos.json';
import sonido from '../src/data/sonido.json';

test('cada efecto que nombran las heroínas y sus habilidades existe en efectos.json', () => {
  for (const h of Object.values(HEROES)) {
    expect(hoja.animations).toHaveProperty(h.combate.efecto);
    for (const hab of h.habilidades) {
      expect(hab.efecto, hab.nombre).toBeDefined();
      expect(hoja.animations, hab.nombre).toHaveProperty(hab.efecto!);
      expect(sonido.efectos, hab.nombre).toHaveProperty(hab.sonido!);
    }
  }
});
