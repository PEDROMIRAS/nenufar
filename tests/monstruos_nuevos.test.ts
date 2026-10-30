import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { MONSTRUOS } from '../src/data/datos';

// Monstruos de la entrega 2 (jabalí y cuervo en el Bosque, lobo en la Cripta).
const NUEVOS = ['jabali', 'cuervo', 'lobo'];

const ruta = (sprite: string, ext: string): string => `public/assets/sprites/${sprite}.${ext}`;

describe.each(NUEVOS)('%s', (clave) => {
  test('es un monstruo normal con mapa y caja', () => {
    const m = MONSTRUOS[clave];
    expect(m, clave).toBeDefined();
    expect([m!.jefe, m!.oculto]).toEqual([false, undefined]);
    expect(m!.mapa).toBeDefined();
    expect(m!.caja).toBeDefined();
  });

  test('su hoja de sprites está completa: 10 columnas × 4 filas de 32 × 32, ancla en los pies', () => {
    const { sprite } = MONSTRUOS[clave]!;
    const meta = JSON.parse(readFileSync(ruta(sprite, 'json'), 'utf8'));
    expect([meta.frameWidth, meta.frameHeight]).toEqual([32, 32]);
    expect(meta.anchor).toEqual({ x: 16, y: 30 });
    expect(Object.keys(meta.directions)).toEqual(['down', 'left', 'right', 'up']);
    const frames = Object.fromEntries(
      Object.entries(meta.animations).map(([k, v]) => [k, (v as { frames: number }).frames]),
    );
    expect(frames).toEqual({ idle: 2, walk: 4, atacar: 3, golpe: 1 });
    // Cabecera PNG: ancho y alto en big endian en los bytes 16-23.
    const png = readFileSync(ruta(sprite, 'png'));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([10 * 32, 4 * 32]);
  });
});
