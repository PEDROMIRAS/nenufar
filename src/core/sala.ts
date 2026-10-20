import { E, N, O, S } from './zona';
import type { PlantillasJson, TileJson, TilesetJson } from './types';

/** Tile del catálogo: recuerda de qué hoja viene (posición en la lista de tilesets cargados). */
export interface Tile extends TileJson {
  hoja: number;
}

/** Objeto colocado en una casilla. Los altos tienen parte superior (`sup`) en la casilla de encima. */
export interface ObjetoSala {
  x: number;
  y: number;
  inf: Tile;
  sup: Tile | null;
}

export interface Sala {
  ancho: number;
  alto: number;
  /** Tile de fondo (suelo, muro o autotile) por casilla, fila a fila. */
  base: Tile[];
  /** Ordenados por la Y de su base, para dibujarlos de arriba abajo. */
  objetos: ObjetoSala[];
  /** Casillas que no se pueden pisar, fila a fila. */
  solido: boolean[];
}

// Símbolos que, además de sí mismos, enlazan un autotile: el camino entra en puertas y portales (como en plantilla.py).
const ENLACES: Record<string, string> = { ':': 'D>' };

/** Junta varios tilesets en un catálogo por nombre. */
export function crearCatalogo(tilesets: readonly TilesetJson[]): Map<string, Tile> {
  const catalogo = new Map<string, Tile>();
  tilesets.forEach((tileset, hoja) => {
    for (const t of tileset.tiles) {
      if (catalogo.has(t.name)) throw new Error(`Tile repetido en dos tilesets: ${t.name}`);
      catalogo.set(t.name, { ...t, hoja });
    }
  });
  return catalogo;
}

/** Monta una sala a partir de su mapa ASCII. `azar` elige variantes y suelos. */
export function construirSala(
  mapa: readonly string[],
  plantillas: Pick<PlantillasJson, 'leyenda' | 'autotiles'>,
  catalogo: ReadonlyMap<string, Tile>,
  azar: () => number,
): Sala {
  const alto = mapa.length;
  const ancho = mapa[0]?.length ?? 0;
  if (alto === 0 || mapa.some((fila) => fila.length !== ancho)) {
    throw new Error('El mapa de la sala no es rectangular');
  }

  // Variantes: "muro" agrupa muro_a, muro_b...
  const variantes = new Map<string, Tile[]>();
  for (const [nombre, tile] of catalogo) {
    const grupo = /^(.+)_[a-z]$/.exec(nombre)?.[1];
    if (grupo) variantes.set(grupo, [...(variantes.get(grupo) ?? []), tile]);
  }
  const suelos = [...catalogo.values()].filter((t) => t.layer === 'suelo' && t.weight);
  const pesoTotal = suelos.reduce((suma, t) => suma + (t.weight ?? 0), 0);

  const resolver = (nombre: string): Tile => {
    const exacto = catalogo.get(nombre);
    if (exacto) return exacto;
    const grupo = variantes.get(nombre);
    const elegido = grupo?.[Math.floor(azar() * grupo.length)];
    if (!elegido) throw new Error(`Tile desconocido: ${nombre}`);
    return elegido;
  };
  const sortearSuelo = (): Tile => {
    let r = azar() * pesoTotal;
    for (const t of suelos) {
      r -= t.weight ?? 0;
      if (r < 0) return t;
    }
    const ultimo = suelos[suelos.length - 1];
    if (!ultimo) throw new Error('El tileset no tiene suelos con weight');
    return ultimo;
  };
  const celda = (x: number, y: number): string | undefined => mapa[y]?.[x];

  const base: Tile[] = [];
  const objetos: ObjetoSala[] = [];
  const solido: boolean[] = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const ch = celda(x, y) ?? '';
      const autotile = plantillas.autotiles[ch];
      let fondo: Tile;
      let objeto: ObjetoSala | null = null;

      if (autotile) {
        const enlazados = ch + (ENLACES[ch] ?? '');
        let mascara = 0;
        // N=1, E=2, S=4, O=8; fuera del mapa cuenta como conectado (el camino sigue a la sala vecina).
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].forEach(([dx = 0, dy = 0], bit) => {
          const vecino = celda(x + dx, y + dy);
          if (vecino === undefined || enlazados.includes(vecino)) mascara |= 1 << bit;
        });
        fondo = resolver(`${autotile}_${mascara}`);
      } else {
        const nombre = plantillas.leyenda[ch];
        if (nombre === undefined) throw new Error(`Símbolo desconocido '${ch}' en (${x}, ${y})`);
        if (nombre === 'suelo') {
          fondo = sortearSuelo();
        } else if (catalogo.has(`${nombre}_sup`)) {
          fondo = sortearSuelo();
          objeto = { x, y, inf: resolver(`${nombre}_inf`), sup: resolver(`${nombre}_sup`) };
        } else {
          const tile = resolver(nombre);
          if (tile.layer === 'objeto' || tile.layer === 'dosel') {
            fondo = sortearSuelo();
            objeto = { x, y, inf: tile, sup: null };
          } else {
            fondo = tile;
          }
        }
      }
      base.push(fondo);
      solido.push(fondo.solid || (objeto?.inf.solid ?? false));
      if (objeto) objetos.push(objeto);
    }
  }
  return { ancho, alto, base, objetos, solido };
}

export interface Salida {
  /** Lado (bit N/E/S/O de `SalaZona.puertas`). */
  lado: number;
  /** Casillas de la salida, empezando por la del borde del mapa. */
  celdas: [number, number][];
  /** Símbolo con que se tapia cada casilla si el lado no lleva a otra sala. */
  tapia: string[];
}

/** Las cuatro salidas de una sala, en el centro de cada lado (la norte cruza el muro de dos filas). */
export function salidas(ancho: number, alto: number): Salida[] {
  const cx = Math.floor(ancho / 2);
  const cy = Math.floor(alto / 2);
  return [
    {
      lado: N,
      celdas: [
        [cx, 0],
        [cx, 1],
      ],
      tapia: ['#', 'N'],
    },
    { lado: E, celdas: [[ancho - 1, cy]], tapia: ['#'] },
    { lado: S, celdas: [[cx, alto - 1]], tapia: ['#'] },
    { lado: O, celdas: [[0, cy]], tapia: ['#'] },
  ];
}

/** Copia del mapa con tapiadas las salidas de los lados que no están en `puertas`. */
export function aplicarPuertas(mapa: readonly string[], puertas: number): string[] {
  const filas = mapa.map((fila) => fila.split(''));
  for (const s of salidas(mapa[0]?.length ?? 0, mapa.length)) {
    if (puertas & s.lado) continue;
    s.celdas.forEach(([x, y], i) => {
      const fila = filas[y];
      if (fila) fila[x] = s.tapia[i] ?? '#';
    });
  }
  return filas.map((f) => f.join(''));
}
