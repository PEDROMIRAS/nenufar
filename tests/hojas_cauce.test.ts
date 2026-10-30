import { describe, expect, test } from 'vitest';

// Hojas de sprites del Cauce Seco (entrega 3a) y el Dragón negro rehecho: [clave, ancho, alto] de cada fotograma.
const HOJAS_ESPERADAS: [string, number, number][] = [
  ['acolito', 32, 32],
  ['salamandra', 32, 32],
  ['sacerdote', 48, 48],
  ['oni', 48, 48],
  ['dragon_fuego', 64, 48],
  ['dragon_negro', 64, 48],
];

const JSON_HOJAS = import.meta.glob<{ default: Record<string, unknown> }>(
  '../public/assets/sprites/monstruos/*.json',
  { eager: true },
);
const PNG_HOJAS = import.meta.glob('../public/assets/sprites/monstruos/*.png', { query: '?url' });
const ruta = (clave: string, ext: string): string =>
  `../public/assets/sprites/monstruos/${clave}.${ext}`;

describe.each(HOJAS_ESPERADAS)('hoja de %s', (clave, ancho, alto) => {
  test(`tiene fotogramas de ${ancho}×${alto}, ancla en los pies, cuatro direcciones y las cuatro animaciones`, () => {
    const meta = JSON_HOJAS[ruta(clave, 'json')]?.default as {
      frameWidth: number;
      frameHeight: number;
      anchor: unknown;
      directions: Record<string, number>;
      animations: Record<string, { frames: number }>;
    };
    expect(meta, clave).toBeDefined();
    expect([meta.frameWidth, meta.frameHeight]).toEqual([ancho, alto]);
    expect(meta.anchor).toEqual({ x: ancho / 2, y: alto - 2 });
    expect(Object.keys(meta.directions)).toEqual(['down', 'left', 'right', 'up']);
    const frames = Object.fromEntries(
      Object.entries(meta.animations).map(([k, v]) => [k, v.frames]),
    );
    expect(frames).toEqual({ idle: 2, walk: 4, atacar: 3, golpe: 1 });
  });

  test('tiene su imagen', () => {
    expect(Object.keys(PNG_HOJAS)).toContain(ruta(clave, 'png'));
  });
});
