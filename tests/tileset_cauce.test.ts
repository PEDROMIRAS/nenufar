import { describe, expect, test } from 'vitest';
import cauceJson from '../public/assets/tilesets/cauce.json';

interface TileJson {
  name: string;
  layer: string;
  solid: boolean;
  weight?: number;
  frames?: number;
  caja?: number[];
}
interface TilesetJson {
  tileSize: number;
  tiles: TileJson[];
}

const cauce = cauceJson as unknown as TilesetJson;
const tile = (nombre: string) => cauce.tiles.find((t) => t.name === nombre);

/** Los suelos, muros y puertas que `construirSala` y el mapa necesitan (los objetos van aparte). */
const SUELOS = ['suelo_liso_a', 'suelo_liso_b', 'suelo_grietas', 'suelo_guijarros', 'suelo_brasas'];
const MUROS_SOLIDOS = [
  'muro_norte_a',
  'muro_norte_b',
  'muro_norte_c',
  'muro_a',
  'muro_b',
  'puerta_norte_cerrada',
];

describe('tileset del Cauce Seco: base', () => {
  test('existe y es de 32 px', () => {
    expect(cauce.tileSize).toBe(32);
  });

  test.each(SUELOS)('%s es un suelo con peso', (nombre) => {
    expect(tile(nombre)?.layer).toBe('suelo');
    expect(tile(nombre)?.weight).toBeGreaterThan(0);
  });

  test.each(MUROS_SOLIDOS)('%s es un muro sólido', (nombre) => {
    expect(tile(nombre)?.layer).toBe('muro');
    expect(tile(nombre)?.solid).toBe(true);
  });

  test('la puerta abierta se puede cruzar', () => {
    expect(tile('puerta_norte_abierta')?.layer).toBe('muro');
    expect(tile('puerta_norte_abierta')?.solid).toBe(false);
  });

  test.each(['barrera_h', 'barrera_v'])('%s es un objeto sólido', (nombre) => {
    expect(tile(nombre)?.layer).toBe('objeto');
    expect(tile(nombre)?.solid).toBe(true);
  });
});
