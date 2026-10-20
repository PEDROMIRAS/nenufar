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
  salas: number;
  maxVecinas: number;
  distanciaMinimaJefe: number;
}

const MAX_SEMILLAS = 1000;

/** Genera una zona válida empezando por `semilla`; si una no vale, prueba la siguiente. */
export function generarZona(ajustes: AjustesZona, semilla: number): Zona {
  for (let s = semilla; s < semilla + MAX_SEMILLAS; s++) {
    const salas = intentar(ajustes, crearAzar(s));
    if (salas) return { semilla: s, salas };
  }
  throw new Error(`Ninguna semilla desde ${semilla} genera una zona válida`);
}

function intentar(a: AjustesZona, azar: () => number): SalaZona[] | null {
  const centro = Math.floor(a.rejilla / 2);
  const salas: SalaZona[] = [{ x: centro, y: centro, tipo: 'combate', distancia: 0, puertas: 0 }];
  const en = new Map<number, SalaZona>([[centro * a.rejilla + centro, salas[0]!]]);
  const sala = (x: number, y: number): SalaZona | undefined =>
    x < 0 || y < 0 || x >= a.rejilla || y >= a.rejilla ? undefined : en.get(y * a.rejilla + x);

  // Caminante aleatorio: desde una sala existente abre una puerta a una casilla libre de la rejilla.
  for (let intentos = 0; salas.length < a.salas; intentos++) {
    if (intentos > a.salas * 200) return null;
    const desde = salas[Math.floor(azar() * salas.length)]!;
    const lado = LADOS[Math.floor(azar() * 4)]!;
    const x = desde.x + lado.dx;
    const y = desde.y + lado.dy;
    if (x < 0 || y < 0 || x >= a.rejilla || y >= a.rejilla || sala(x, y)) continue;
    // Rechaza casillas rodeadas de salas para que la zona no forme bloques compactos.
    const vecinas = LADOS.filter((l) => sala(x + l.dx, y + l.dy)).length;
    if (vecinas > a.maxVecinas) continue;
    const nueva: SalaZona = { x, y, tipo: 'combate', distancia: 0, puertas: lado.opuesto };
    desde.puertas |= lado.bit;
    salas.push(nueva);
    en.set(y * a.rejilla + x, nueva);
  }

  // Distancias por BFS desde el inicio, siguiendo puertas.
  const inicio = salas[0]!;
  const visitadas = new Set<SalaZona>([inicio]);
  const cola = [inicio];
  for (let i = 0; i < cola.length; i++) {
    const s = cola[i]!;
    for (const l of LADOS) {
      const v = s.puertas & l.bit ? sala(s.x + l.dx, s.y + l.dy) : undefined;
      if (v && !visitadas.has(v)) {
        v.distancia = s.distancia + 1;
        visitadas.add(v);
        cola.push(v);
      }
    }
  }
  if (visitadas.size !== salas.length) return null;

  // El BFS deja la cola ordenada por distancia: la última es la más lejana.
  const jefe = cola[cola.length - 1]!;
  if (jefe.distancia < a.distanciaMinimaJefe) return null;
  inicio.tipo = 'inicio';
  jefe.tipo = 'jefe';

  const libres = salas.filter((s) => s.tipo === 'combate');
  const callejones = libres.filter((s) => contarBits(s.puertas) === 1);
  const tesoro = elegir(callejones.length > 0 ? callejones : libres, azar);
  if (!tesoro) return null;
  tesoro.tipo = 'tesoro';
  const descanso = elegir(
    libres.filter((s) => s !== tesoro),
    azar,
  );
  if (!descanso) return null;
  descanso.tipo = 'descanso';
  return salas;
}

function elegir<T>(lista: readonly T[], azar: () => number): T | undefined {
  return lista[Math.floor(azar() * lista.length)];
}

function contarBits(n: number): number {
  let c = 0;
  for (; n; n &= n - 1) c++;
  return c;
}
