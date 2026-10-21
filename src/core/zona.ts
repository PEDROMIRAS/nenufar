import { crearAzar } from './azar';

export type TipoSala = 'inicio' | 'combate' | 'tesoro' | 'descanso' | 'jefe';

/** Bits de `puertas`, en el mismo orden que la máscara de los autotiles. */
export const N = 1;
export const E = 2;
export const S = 4;
export const O = 8;
const LADOS = [
  { bit: N, dx: 0, dy: -1, opuesto: S },
  { bit: E, dx: 1, dy: 0, opuesto: O },
  { bit: S, dx: 0, dy: 1, opuesto: N },
  { bit: O, dx: -1, dy: 0, opuesto: E },
] as const;

export interface SalaZona {
  x: number;
  y: number;
  tipo: TipoSala;
  /** Salas que hay que cruzar desde el inicio. */
  distancia: number;
  /** Lados con puerta (N|E|S|O). */
  puertas: number;
}

export interface Zona {
  /** Semilla con la que salió válida (puede ser posterior a la pedida). */
  semilla: number;
  salas: SalaZona[];
}

export interface AjustesZona {
  rejilla: number;
  /** Total de salas: inicio + salas de paso con 3 salidas nuevas + callejones; tiene que ser 2 + 3k. */
  salas: number;
  /** Salas del tesoro (con un cofre cada una), si hay callejones libres para ellas. */
  tesoros: number;
}

const MAX_SEMILLAS = 1000;

/** Genera una zona válida empezando por `semilla`; si una no cabe en la rejilla, prueba la siguiente. */
export function generarZona(ajustes: AjustesZona, semilla: number): Zona {
  if (ajustes.salas < 5 || (ajustes.salas - 2) % 3 !== 0) {
    throw new Error(`Una zona en ramas de 3 tiene 2 + 3k salas (5, 8, 11...), no ${ajustes.salas}`);
  }
  for (let s = semilla; s < semilla + MAX_SEMILLAS; s++) {
    const salas = intentar(ajustes, crearAzar(s));
    if (salas) return { semilla: s, salas };
  }
  throw new Error(`Ninguna semilla desde ${semilla} genera una zona válida`);
}

/**
 * El inicio tiene una sola puerta. Cada sala de paso tiene la puerta por la que se llega y 3 nuevas.
 * Las salas del final de cada rama son callejones: ahí van el jefe (en el más profundo), los tesoros y el descanso.
 */
function intentar(a: AjustesZona, azar: () => number): SalaZona[] | null {
  const centro = Math.floor(a.rejilla / 2);
  const ocupadas = new Set<number>();
  const salas: SalaZona[] = [];
  const libre = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < a.rejilla && y < a.rejilla && !ocupadas.has(y * a.rejilla + x);
  const crear = (x: number, y: number, distancia: number, puertas: number): SalaZona => {
    const sala: SalaZona = { x, y, tipo: 'combate', distancia, puertas };
    ocupadas.add(y * a.rejilla + x);
    salas.push(sala);
    return sala;
  };
  const abrir = (desde: SalaZona, lado: (typeof LADOS)[number]): SalaZona => {
    desde.puertas |= lado.bit;
    return crear(desde.x + lado.dx, desde.y + lado.dy, desde.distancia + 1, lado.opuesto);
  };

  const inicio = crear(centro, centro, 0, 0);
  inicio.tipo = 'inicio';
  let callejones = [abrir(inicio, LADOS[Math.floor(azar() * 4)]!)];

  while (salas.length < a.salas) {
    // Solo puede ser sala de paso un callejón con sus otros 3 lados libres en la rejilla.
    const ampliables = callejones.filter((c) =>
      LADOS.every((l) => c.puertas & l.bit || libre(c.x + l.dx, c.y + l.dy)),
    );
    const paso = elegir(ampliables, azar);
    if (!paso) return null;
    callejones = callejones.filter((c) => c !== paso);
    for (const l of LADOS) if (!(paso.puertas & l.bit)) callejones.push(abrir(paso, l));
  }

  const fondo = Math.max(...callejones.map((c) => c.distancia));
  const jefe = elegir(
    callejones.filter((c) => c.distancia === fondo),
    azar,
  )!;
  jefe.tipo = 'jefe';
  let resto = callejones.filter((c) => c !== jefe);
  // Siempre queda un callejón para el descanso.
  for (let i = 0; i < a.tesoros && resto.length > 1; i++) {
    const tesoro = elegir(resto, azar)!;
    tesoro.tipo = 'tesoro';
    resto = resto.filter((c) => c !== tesoro);
  }
  elegir(resto, azar)!.tipo = 'descanso';
  return salas;
}

function elegir<T>(lista: readonly T[], azar: () => number): T | undefined {
  return lista[Math.floor(azar() * lista.length)];
}
