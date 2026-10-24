import { describe, expect, test } from 'vitest';
import { crearAzar } from '../src/core/azar';
import { colocarMonstruos } from '../src/core/monstruos';
import { colisiona } from '../src/core/movimiento';
import { construirSala, crearCatalogo, salidas } from '../src/core/sala';
import { HEROES } from '../src/data/datos';
import zonas from '../src/data/zonas.json';
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
/** Lado de un tile en píxeles. */
const TAM = 32;
const TIPOS: TipoSala[] = ['inicio', 'combate', 'tesoro', 'descanso', 'jefe'];
// Los JSON de assets traen 'layer' como string; aquí se tratan como el tipo que documentan.
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

      // Relleno por inundación desde la primera salida sobre las casillas libres.
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

  // Con las puertas cerradas hasta vencer a todos, un monstruo en un rincón al que la heroína no
  // llega la dejaría encerrada. Se mira píxel a píxel con su caja real (los objetos solo chocan con
  // su base y a veces se pasa por su lado).
  test.each(
    plantillas.plantillas.filter((p) => p.tipo === 'combate').map((p) => [p.id, p.mapa] as const),
  )('%s: se llega a cada casilla donde puede salir un monstruo', (_, mapa) => {
    const sala = construirSala(mapa, plantillas, catalogo, crearAzar(1));
    const lista = salidas(sala.ancho, sala.alto);
    const { ancho, alto } = HEROES.ronin.caja;
    const PASO = 2;
    const columnas = (sala.ancho * TAM) / PASO;
    const filas = (sala.alto * TAM) / PASO;
    const libre = (cx: number, cy: number): boolean =>
      !colisiona(sala, TAM, cx * PASO, cy * PASO, ancho, alto);
    const [ex, ey] = lista[0]!.entrada;
    const inicio: [number, number] = [(ex * TAM + TAM / 2) / PASO, (ey * TAM + TAM - 4) / PASO];
    const vistas = new Set([inicio[1] * columnas + inicio[0]]);
    const cola = [inicio];
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
        if (nx < 0 || ny < 0 || nx >= columnas || ny >= filas) continue;
        const i = ny * columnas + nx;
        if (vistas.has(i) || !libre(nx, ny)) continue;
        vistas.add(i);
        cola.push([nx, ny]);
      }
    }
    // Todas las casillas posibles: más grupos de los que caben.
    const candidatas = colocarMonstruos(
      sala,
      lista,
      sala.ancho * sala.alto,
      zonas.monstruos.distanciaEntradas,
      crearAzar(1),
    );
    for (const [c, f] of candidatas) {
      // Basta con que la heroína pueda pisar algún punto de la casilla.
      let llega = false;
      for (let y = f * TAM; y < (f + 1) * TAM && !llega; y += PASO)
        for (let x = c * TAM; x < (c + 1) * TAM && !llega; x += PASO)
          llega = vistas.has((y / PASO) * columnas + x / PASO);
      expect(llega, `casilla (${c}, ${f})`).toBe(true);
    }
  });
});
