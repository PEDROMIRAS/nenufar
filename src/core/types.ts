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

export type Direccion = 'down' | 'left' | 'right' | 'up';

export interface AnimacionJson {
  startColumn: number;
  frames: number;
  fps: number;
  loop: boolean;
}

/** `public/assets/sprites/*.json`: una fila por dirección, animaciones por columnas. */
export interface SpriteJson {
  frameWidth: number;
  frameHeight: number;
  /** Punto del frame que se coloca en la posición del personaje (los pies). */
  anchor: { x: number; y: number };
  directions: Record<Direccion, number>;
  animations: Record<string, AnimacionJson>;
  castReleaseFrame?: number;
}

/** Una heroína de `src/data/heroes.json`. */
export interface HeroeJson {
  sprite: string;
  /** Píxeles por segundo. */
  velocidad: number;
  /** Caja de colisión en los pies, más pequeña que el sprite. */
  caja: { ancho: number; alto: number };
  /** Píxeles que se la empuja de lado para que no se enganche en la esquina de un hueco. */
  margenEsquina: number;
}
