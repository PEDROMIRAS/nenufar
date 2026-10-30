import { describe, expect, test } from 'vitest';
import { luchadoresDeGrupo } from '../src/core/combate';
import { MONSTRUOS } from '../src/data/datos';
import zonas from '../src/data/zonas.json';

// Monstruos de la entrega 2 (jabalí y cuervo en el Bosque, lobo en la Cripta).
const NUEVOS = ['jabali', 'cuervo', 'lobo'];
// Lado del cuadro de cada hoja (el jabalí, más grande, va en 40×40).
const LADO: Record<string, number> = { jabali: 40 };

const HOJAS = import.meta.glob<{ default: Record<string, unknown> }>(
  '../public/assets/sprites/monstruos/*.json',
  { eager: true },
);
const PNG = import.meta.glob('../public/assets/sprites/monstruos/*.png', { query: '?url' });
const nombre = (sprite: string): string => sprite.split('/').pop()!;

describe.each(NUEVOS)('%s', (clave) => {
  test('es un monstruo normal con mapa y caja', () => {
    const m = MONSTRUOS[clave];
    expect(m, clave).toBeDefined();
    expect([m!.jefe, m!.oculto]).toEqual([false, undefined]);
    expect(m!.mapa).toBeDefined();
    expect(m!.caja).toBeDefined();
  });

  test('su hoja de sprites está completa: 4 filas de fotogramas cuadrados, ancla en los pies', () => {
    const archivo = nombre(MONSTRUOS[clave]!.sprite);
    const meta = HOJAS[`../public/assets/sprites/monstruos/${archivo}.json`]?.default as {
      frameWidth: number;
      frameHeight: number;
      anchor: unknown;
      directions: Record<string, number>;
      animations: Record<string, { frames: number }>;
    };
    expect(meta, archivo).toBeDefined();
    const lado = LADO[clave] ?? 32;
    expect([meta.frameWidth, meta.frameHeight]).toEqual([lado, lado]);
    expect(meta.anchor).toEqual({ x: lado / 2, y: lado - 2 });
    expect(Object.keys(meta.directions)).toEqual(['down', 'left', 'right', 'up']);
    const frames = Object.fromEntries(
      Object.entries(meta.animations).map(([k, v]) => [k, v.frames]),
    );
    expect(frames).toEqual({ idle: 2, walk: 4, atacar: 3, golpe: 1 });
    expect(Object.keys(PNG)).toContain(`../public/assets/sprites/monstruos/${archivo}.png`);
  });
});

describe('grupos de las zonas', () => {
  const claves = (zona: keyof typeof zonas.zonas): string[] =>
    zonas.zonas[zona].grupos.flatMap((g) => g.monstruos);

  test('el Bosque usa jabalí y cuervo', () => {
    expect(claves('bosque')).toEqual(expect.arrayContaining(['jabali', 'cuervo']));
  });

  test('la Cripta usa el lobo y ya ninguna zona usa al Espectro', () => {
    expect(claves('cripta')).toContain('lobo');
    for (const zona of Object.keys(zonas.zonas) as (keyof typeof zonas.zonas)[]) {
      expect(claves(zona), zona).not.toContain('espectro');
    }
  });

  test('el Espectro sigue existiendo, oculto hasta el Cauce Seco', () => {
    expect(MONSTRUOS.espectro?.oculto).toBe(true);
  });

  test('todos los grupos nombran monstruos que existen y no son jefes', () => {
    for (const zona of Object.keys(zonas.zonas) as (keyof typeof zonas.zonas)[]) {
      for (const clave of claves(zona)) {
        expect(MONSTRUOS[clave], `${zona}/${clave}`).toBeDefined();
        expect(MONSTRUOS[clave]!.jefe, `${zona}/${clave}`).toBe(false);
      }
    }
  });

  test('un grupo con dos monstruos del mismo tipo los distingue por letra', () => {
    const nombres = luchadoresDeGrupo([
      MONSTRUOS.jabali!,
      MONSTRUOS.jabali!,
      MONSTRUOS.cuervo!,
    ]).map((l) => l.nombre);
    expect(nombres).toEqual(['Jabalí A', 'Jabalí B', 'Cuervo']);
  });
});
