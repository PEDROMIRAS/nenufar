import { describe, expect, test } from 'vitest';
import { tocaCasillas } from '../src/core/mapa';
import { colisiona, moverCuerpo, type Cuerpo } from '../src/core/movimiento';
import { construirSala, chocarConElipse, crearCatalogo } from '../src/core/sala';
import type { PlantillasJson, TilesetJson } from '../src/core/types';
import { HD2D, HEROES } from '../src/data/datos';
import bosque from '../src/data/salas/plantillas_bosque.json';
import ruinas from '../src/data/salas/plantillas_ruinas.json';
import cripta from '../src/data/salas/plantillas_cripta.json';
import cauce from '../src/data/salas/plantillas_cauce.json';
import comunes from '../public/assets/tilesets/comunes.json';
import bosqueT from '../public/assets/tilesets/bosque.json';
import ruinasT from '../public/assets/tilesets/ruinas.json';
import criptaT from '../public/assets/tilesets/cripta.json';
import cauceT from '../public/assets/tilesets/cauce.json';
import bosqueA from '../public/assets/tilesets/bosque_autotiles.json';
import ruinasA from '../public/assets/tilesets/ruinas_autotiles.json';
import criptaA from '../public/assets/tilesets/cripta_autotiles.json';
import cauceA from '../public/assets/tilesets/cauce_autotiles.json';

const TAM = 32;
const ALCANCE = 4;
const ZONAS: [string, unknown, unknown, unknown][] = [
  ['bosque', bosque, bosqueT, bosqueA],
  ['ruinas', ruinas, ruinasT, ruinasA],
  ['cripta', cripta, criptaT, criptaA],
  ['cauce', cauce, cauceT, cauceA],
];
const caja = HEROES.ronin!.caja;

describe('la fuente se alcanza desde todos los lados', () => {
  for (const [nombre, plantillas, tiles, auto] of ZONAS) {
    const p = plantillas as PlantillasJson;
    const catalogo = crearCatalogo([tiles, comunes, auto] as unknown as TilesetJson[]);
    for (const plantilla of p.plantillas.filter((x) => x.tipo === 'descanso')) {
      test(`${nombre}: ${plantilla.id}`, () => {
        const sala = construirSala(plantilla.mapa, p, catalogo, () => 0.5);
        const fuente = sala.objetos.find((o) => o.inf.name === 'fuente_cen_inf')!;
        const f = HD2D.fuente;
        const cx = fuente.x + 0.5;
        const cz = fuente.y + f.centroZ;
        const celdas = chocarConElipse(sala, TAM, cx, cz, f.radioX, f.radioZ);
        let probadas = 0;
        for (let a = 0; a < 8; a++) {
          const ang = (a * Math.PI) / 4;
          const dx = Math.cos(ang);
          const dy = Math.sin(ang);
          // Sale a 3 casillas del centro en esa dirección; si allí hay algo, esa dirección no se prueba.
          const c: Cuerpo = {
            x: (cx + dx * 3) * TAM,
            y: (cz + dy * 3) * TAM + caja.alto / 2,
            ancho: caja.ancho,
            alto: caja.alto,
          };
          if (colisiona(sala, TAM, c.x, c.y, c.ancho, c.alto)) continue;
          // Anda hacia el centro (deslizándose, como en el juego) hasta pararse.
          for (let i = 0; i < 400; i++) {
            const hx = cx * TAM - c.x;
            const hy = cz * TAM + caja.alto / 2 - c.y;
            const d = Math.hypot(hx, hy) || 1;
            moverCuerpo(c, (hx / d) * 1.5, (hy / d) * 1.5, sala, TAM, 6);
          }
          probadas++;
          expect(tocaCasillas(sala, celdas, c, TAM, ALCANCE), `dirección ${a * 45}°`).toBe(true);
        }
        expect(probadas).toBeGreaterThanOrEqual(4);
      });
    }
  }
});
