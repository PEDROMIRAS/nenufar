import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { HEROES } from '../src/data/datos';

const hoja = JSON.parse(readFileSync('public/assets/sprites/efectos.json', 'utf8')) as {
  animations: Record<string, unknown>;
};

test('cada efecto que nombran las heroínas y sus habilidades existe en efectos.json', () => {
  for (const h of Object.values(HEROES)) {
    expect(hoja.animations).toHaveProperty(h.combate.efecto);
    for (const hab of h.habilidades) {
      expect(hab.efecto, hab.nombre).toBeDefined();
      expect(hoja.animations, hab.nombre).toHaveProperty(hab.efecto!);
    }
  }
});
