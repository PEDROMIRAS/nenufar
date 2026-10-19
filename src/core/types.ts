// Tipos de los JSON de datos y assets.

export type Capa = 'suelo' | 'muro' | 'objeto' | 'dosel';

/** Un tile tal como viene en `public/assets/tilesets/*.json`. */
export interface TileJson {
  name: string;
  index: number;
  layer: Capa;
  solid: boolean;
  weight?: number;
  frames?: number;
  fps?: number;
}

export interface TilesetJson {
  tileSize: number;
  tiles: TileJson[];
}

/** `src/data/salas/plantillas_<zona>.json` */
export interface PlantillasJson {
  leyenda: Record<string, string>;
  autotiles: Record<string, string>;
  plantillas: { id: string; tipo: string; mapa: string[] }[];
}
