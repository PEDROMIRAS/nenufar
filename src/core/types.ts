// Tipos de los JSON de datos y assets.

export type Capa = 'suelo' | 'muro' | 'objeto' | 'dosel';

/** Un tile tal como viene en `public/assets/tilesets/*.json`. */
export interface TileJson {
  name: string;
  index: number;
  layer: Capa;
  solid: boolean;
  /** En los objetos sólidos, la base que choca [x0, y0, x1, y1) en píxeles del tile; sin ella, el tile entero. */
  caja?: [number, number, number, number];
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

/** Estadísticas de combate (las seis del documento). */
export interface Estadisticas {
  pv: number;
  pm: number;
  ataque: number;
  magia: number;
  defensa: number;
  velocidad: number;
}

/** Una heroína de `src/data/heroes.json`. */
export interface HeroeJson {
  nombre: string;
  sprite: string;
  /** Cómo se ve y suena su ataque: animación de su hoja, efecto sobre el objetivo, sonido (de sonido.json) y proyectil, si lanza algo. */
  combate: { ataque: string; efecto: string; sonido: string; proyectil?: string };
  /** Colores de su hoja (hex) que cambian con el equipo: los de la ropa (armadura) y los del arma, en orden. */
  tintes: { ropa: string[]; arma: string[] };
  /** Sus páginas de la historia: tras las comunes al empezar, y al vencer al jefe final. */
  historia: { inicio: string[]; final: string[] };
  /** Píxeles por segundo. */
  velocidad: number;
  /** Por cuánto se multiplica la velocidad al correr. */
  carrera: number;
  /** Caja de colisión en los pies, más pequeña que el sprite. */
  caja: { ancho: number; alto: number };
  /** Píxeles que se la empuja de lado para que no se enganche en la esquina de un hueco. */
  margenEsquina: number;
  estadisticas: Estadisticas;
  /** Lo que suma cada estadística al subir de nivel. */
  porNivel: Estadisticas;
  /** El arma con la que empieza (sin bonos): clave de equipo en objetos.json. */
  armaInicial: string;
  /** Sus armas por nivel (1, 2, 3): claves de equipo en objetos.json. */
  armas: string[];
  habilidades: HabilidadJson[];
  /** Recompensas de los jefes violetas: claves de equipo en objetos.json y el nombre de su quinta habilidad. */
  especiales: { arma: string; armadura: string; habilidad: string };
}

/** Una habilidad: cuesta PM, se desbloquea en un nivel y hace daño, cura o aplica un estado. */
export interface HabilidadJson {
  nombre: string;
  nivel: number;
  pm: number;
  /**
   * A quién afecta: un rival elegido, todos los rivales, quien la usa o un aliado (el más herido si
   * cura; si aplica un estado, uno que aún no lo tenga).
   */
  objetivo: 'uno' | 'todos' | 'propio' | 'aliado';
  danio?: { tipo: 'fisico' | 'magico'; poder: number; criticoSeguro?: boolean };
  /** Fracción de los PV máximos del objetivo que cura. */
  cura?: number;
  /** Clave de un estado de combate.json que aplica al objetivo. */
  estado?: string;
  /**
   * Animación de efectos.json que se ve al usarla: sobre cada objetivo si hace daño, sobre quien la usa
   * si no. Sin ella, la del ataque normal.
   */
  efecto?: string;
  /** Sonido de sonido.json al usarla, en lugar del de su ataque normal. */
  sonido?: string;
  /** No se desbloquea por nivel sino como recompensa de un jefe violeta (su `nivel` no se alcanza). */
  recompensa?: true;
  /** Quita el golpe cargado que estén preparando los objetivos que sobreviven. */
  rompeCarga?: true;
}

/** Un estado alterado de combate.json: dura unos turnos del afectado y cambia sus estadísticas o su turno. */
export interface EstadoJson {
  nombre: string;
  turnos: number;
  /** Fracción de PV máximos que pierde al final de cada turno suyo. */
  danioPorTurno?: number;
  /** Pierde su siguiente turno. */
  pierdeTurno?: boolean;
  /** Multiplicadores de estadísticas mientras dura. */
  ataque?: number;
  magia?: number;
  defensa?: number;
}

/** Una entrada de la tabla de acciones de un monstruo: 'atacar', 'cargar', 'defender' o el nombre de una habilidad suya. */
export interface AccionMonstruoJson {
  accion: string;
  peso: number;
  /** Solo puede elegirla si se cumple: sus PV, o los de algún aliado, por debajo de esa fracción. */
  condicion?: { pvPropioMenorQue?: number; pvAliadoMenorQue?: number };
}

/** Un consumible de objetos.json. */
export interface ConsumibleJson {
  nombre: string;
  /** PV y PM que restaura. */
  pv?: number;
  pm?: number;
  /** Clave del estado que quita. */
  quitaEstado?: string;
}

/** Una pieza de equipo de objetos.json: suma estadísticas planas y, a veces, tiene un efecto. */
export interface EquipoJson {
  nombre: string;
  hueco: 'arma' | 'armadura';
  bonos: Partial<Estadisticas>;
  /** Lo que crecen los bonos por cada nivel de la heroína por encima del 1 (solo las piezas especiales). */
  bonosPorNivel?: Partial<Estadisticas>;
  /** Al golpear, probabilidad de aplicar un estado de combate.json. */
  efecto?: { estado: string; probabilidad: number };
  /** Colores nuevos (hex) para la ropa o el arma de la heroína que la lleva, en el orden de sus `tintes`. */
  tinte?: string[];
}

/** `src/data/objetos.json` */
export interface ObjetosJson {
  maximoPorTipo: number;
  consumibles: Record<string, ConsumibleJson>;
  equipo: Record<string, EquipoJson>;
  /** La armadura con la que empiezan las dos heroínas (sin bonos). */
  armaduraInicial: string;
  /** Armaduras por nivel (1, 2, 3); las armas de cada heroína están en heroes.json. */
  armaduras: string[];
}

/** Una entrada de la tabla de botín de un monstruo; `objeto: "nada"` es no soltar nada. */
export interface BotinJson {
  /** Clave de un consumible, "arma" o "armadura" (con `nivel`), o "nada". */
  objeto: string;
  nivel?: number;
  peso: number;
}

/** Cómo se mueve un monstruo por el mapa, en píxeles y píxeles por segundo. */
export interface MovimientoMapaJson {
  velocidad: number;
  persecucion: number;
  /** Distancia a la que ve a la heroína y empieza a perseguirla. */
  vision: number;
  /** Radio alrededor de su casa por el que patrulla. */
  patrulla: number;
}

/** Una fase de jefe: empieza cuando sus PV bajan de `pvMenorQue` × PV máximos. */
export interface FaseJson {
  pvMenorQue: number;
  aviso: string;
  /** Tabla de acciones desde esta fase (si falta, sigue con la anterior). */
  acciones?: AccionMonstruoJson[];
  /** Se retira del combate y en su lugar aparecen estos monstruos (claves de monstruos.json). */
  transformarEn?: string[];
}

/** Un monstruo de `src/data/monstruos.json`. */
export interface MonstruoJson {
  nombre: string;
  /** Su clave en monstruos.json (la pone datos.ts al cargar; las copias la conservan). */
  clave?: string;
  estadisticas: Estadisticas;
  /** Qué hace en su turno, elegido al azar según los pesos. */
  acciones: AccionMonstruoJson[];
  /** Habilidades propias, usadas por nombre desde `acciones`. */
  habilidades?: HabilidadJson[];
  /** Golpe fuerte que anuncia un turno antes con la acción "cargar"; `aviso` va tras su nombre («Limo A se hincha...»). */
  cargado?: { poder: number; aviso: string };
  /** Acción "invocar": trae a estos monstruos (claves de monstruos.json) mientras haya menos enemigos vivos que `maximo`. */
  invocacion?: { monstruos: string[]; maximo: number; aviso: string };
  /** Fases de jefe, de mayor a menor umbral: al bajar de cada una cambia de acciones o se transforma. */
  fases?: FaseJson[];
  jefe: boolean;
  /** Experiencia que da al vencerlo. */
  experiencia: number;
  /** Lo que puede soltar al vencerlo, una tirada por monstruo. */
  botin?: BotinJson[];
  /** Caja de colisión en el mapa, anclada en los pies. */
  caja: { ancho: number; alto: number };
  /** Patrulla y persecución en el mapa; sin este campo se queda quieto (los jefes). */
  mapa?: MovimientoMapaJson;
  /** Hoja de sprites en `public/assets/sprites/`, sin extensión. */
  sprite: string;
  /** Color que lo identifica en la barra de turnos. */
  color: string;
}

/** `violetas` de zonas.json: probabilidades de sala violeta, de que su jefe sea el dragón y de tesoro trampa. */
export interface AjustesVioletas {
  probabilidad: number;
  probabilidadDragon: number;
  probabilidadTrampa: number;
  /** Clave del dragón negro de cada zona en monstruos.json. */
  dragon: Record<string, string>;
}

/** Una dificultad de `src/data/dificultades.json`: multiplicadores sobre los monstruos y la recuperación. */
export interface DificultadJson {
  nombre: string;
  descripcion: string;
  /** Multiplica el ataque y la magia de todos los monstruos. */
  ataque: number;
  /** Multiplica sus PV. */
  vida: number;
  /** Multiplica lo que la heroína recupera tras cada victoria. */
  recuperacion: number;
}

/** `src/data/combate.json`: reglas comunes de todos los combates. */
export interface ReglasCombate {
  varianza: { min: number; max: number };
  critico: { probabilidad: number; multiplicador: number };
  /** Fracción de la Defensa del objetivo que se resta al daño físico y al mágico. */
  defensaFisica: number;
  defensaMagica: number;
  defender: { factorDanio: number; pm: number };
  /** Lo más que quita un golpe cargado, en fracción de los PV máximos de quien lo recibe (antes de Defender). */
  topeGolpeCargado: number;
  huida: { base: number; porIntento: number };
  /** Segundos sin poder empezar otro combate en el mapa tras huir o vencer. */
  invulnerabilidadTrasCombate: number;
  /** Fracción de PV y PM máximos que recupera la heroína al ganar un combate. */
  recuperacionTrasVictoria: number;
  experiencia: ReglasProgresion;
  estados: Record<string, EstadoJson>;
}

/** Subida de nivel: hacen falta `porNivel` × n PX para pasar del nivel n al n + 1. */
export interface ReglasProgresion {
  porNivel: number;
  nivelMaximo: number;
  /** Fracción de PV y PM máximos que se recupera al subir. */
  restaurarAlSubir: number;
  /** Puntos de mejora que da cada nivel, para repartir a mano. */
  puntosPorNivel: number;
  /** Lo que suma un punto a cada cosa (`critico`: al multiplicador del golpe crítico). */
  mejoras: Record<Mejora, number>;
}

/** Lo que se puede mejorar con puntos al subir de nivel. */
export type Mejora = 'pv' | 'pm' | 'ataque' | 'magia' | 'defensa' | 'velocidad' | 'critico';
