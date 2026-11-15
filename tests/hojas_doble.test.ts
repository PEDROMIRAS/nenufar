import { expect, test } from 'vitest';
import type { SpriteJson } from '../src/core/types';

// Monstruos a doble resolución: [clave, ancho, alto] en píxeles del juego (lo que medían antes).
const DOBLES: [string, number, number][] = [
  ['golem', 48, 48],
  ['lobo', 32, 32],
  ['reina_arana', 64, 48],
  ['acolito', 40, 40],
  ['cuervo', 32, 32],
  ['jabali', 40, 40],
  ['oni', 48, 48],
  ['rey_limo', 64, 48],
  ['senor_cripta', 48, 48],
  ['rey_sin_charca', 64, 48],
  ['limo', 32, 32],
  ['limo_grande', 32, 32],
  ['arana', 32, 32],
  ['esqueleto', 32, 32],
  ['caballero', 32, 32],
  ['espectro', 32, 32],
  ['salamandra', 40, 40],
  ['arbol_maldito', 48, 48],
  ['caballero_maldito', 48, 48],
  ['ojo_flotante', 48, 48],
  ['dragon_negro', 64, 48],
];

const HOJAS = import.meta.glob<{ default: SpriteJson }>(
  '../public/assets/sprites/monstruos/*.json',
  { eager: true },
);
const ruta = (clave: string): string => `../public/assets/sprites/monstruos/${clave}.json`;

test.each(DOBLES)(
  '%s: doble resolución, mismo tamaño de juego y más fotogramas',
  (clave, ancho, alto) => {
    const m = HOJAS[ruta(clave)]!.default;
    expect(m.scale).toBe(2);
    expect([m.frameWidth / 2, m.frameHeight / 2]).toEqual([ancho, alto]);
    expect(m.anchor).toEqual({ x: ancho, y: alto * 2 - 4 });
    expect(Object.keys(m.directions)).toEqual(['down', 'left', 'right', 'up']);
    const a = m.animations;
    expect([a.idle!.frames, a.walk!.frames, a.atacar!.frames, a.golpe!.frames]).toEqual([
      8, 8, 6, 1,
    ]);
    expect([a.idle!.fps, a.walk!.fps, a.atacar!.fps]).toEqual([12, 16, 20]);
  },
);

test('ninguna hoja sin convertir lleva scale', () => {
  for (const [r, m] of Object.entries(HOJAS))
    if (!DOBLES.some(([c]) => r.endsWith(`/${c}.json`))) expect(m.default.scale, r).toBeUndefined();
});
