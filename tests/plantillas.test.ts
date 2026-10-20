import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { construirSala, crearCatalogo, salidas } from '../src/core/sala';
import type { PlantillasJson, TilesetJson } from '../src/core/types';
import type { TipoSala } from '../src/core/zona';
import bosque from '../src/data/salas/plantillas_bosque.json';
import cripta from '../src/data/salas/plantillas_cripta.json';
import ruinas from '../src/data/salas/plantillas_ruinas.json';
import bosqueAuto from '../public/assets/tilesets/bosque_autotiles.json';
import bosqueTiles from '../public/assets/tilesets/bosque.json';
import comunes from '../public/assets/tilesets/comunes.json';
import criptaAuto from '../public/assets/tilesets/cripta_autotiles.json';
import criptaTiles from '../public/assets/tilesets/cripta.json';
import ruinasAuto from '../public/assets/tilesets/ruinas_autotiles.json';
import ruinasTiles from '../public/assets/tilesets/ruinas.json';

const ZONAS: Record<string, PlantillasJson> = { bosque, ruinas, cripta };
const TIPOS: TipoSala[] = ['inicio', 'combate', 'tesoro', 'descanso', 'jefe'];
// Los JSON de assets traen 'layer' como string; aquÃ­ se tratan como el tipo que documentan.
const TILESETS = {
  bosque: [bosqueTiles, bosqueAuto],
  ruinas: [ruinasTiles, ruinasAuto],
  cripta: [criptaTiles, criptaAuto],
} as unknown as Record<string, [TilesetJson, TilesetJson]>;

describe.each(Object.entries(ZONAS))('plantillas de %s', (zona, plantillas) => {
  const [propio, auto] = TILESETS[zona]!;
  const catalogo = crearCatalogo([propio, comunes as unknown as TilesetJson, auto]);

  test('hay al menos una plantilla de cada tipo de sala', () => {
    for (const tipo of TIPOS) expect(plantillas.plantillas.some((p) => p.tipo === tipo)).toBe(true);
  });

  test.each(plantillas.plantillas.map((p) => [p.id, p.mapa, p.tipo] as const))(
    '%s: las salidas y sus entradas se pisan y se llega de una a otra',
    (_, mapa, tipo) => {
      const sala = construirSala(mapa, plantillas, catalogo, crearAzar(1));
      const libre = (x: number, y: number) => sala.solido[y * sala.ancho + x] === false;
      const exteriores = salidas(sala.ancho, sala.alto).map((s) => s.celdas[0]!);
      for (const [x, y] of exteriores) expect(libre(x, y), `salida (${x}, ${y})`).toBe(true);

      // Relleno por inundaciÃ³n desde la primera salida sobre las casillas libres.
      const [x0, y0] = exteriores[0]!;
      const vistas = new Set([y0 * sala.ancho + x0]);
      const cola: [number, number][] = [[x0, y0]];
      while (cola.length > 0) {
        const [x, y] = cola.pop()!;
        for (const [dx, dy] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const i = ny * sala.ancho + nx;
          if (nx < 0 || ny < 0 || nx >= sala.ancho || ny >= sala.alto) continue;
          if (vistas.has(i) || !libre(nx, ny)) continue;
          vistas.add(i);
          cola.push([nx, ny]);
        }
      }
      // Las casillas donde aparece la heroína al entrar también tienen que estar libres y conectadas.
      const entradas = salidas(sala.ancho, sala.alto).map((s) => s.entrada);
      for (const [x, y] of [...exteriores, ...entradas]) {
        expect(vistas.has(y * sala.ancho + x), `casilla (${x}, ${y})`).toBe(true);
      }
      // La sala del jefe lleva el portal a la zona siguiente, y hay que poder llegar a él.
      const portales = sala.objetos.filter((o) => o.inf.name === 'portal');
      expect(portales).toHaveLength(tipo === 'jefe' ? 1 : 0);
      for (const o of portales) expect(vistas.has(o.y * sala.ancho + o.x)).toBe(true);
    },
  );
});
