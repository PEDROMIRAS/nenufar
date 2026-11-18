import { crearAzar } from './azar';
import {
  actuar,
  avanzar,
  crearCombate,
  habilidadesDisponibles,
  luchadoresDeGrupo,
  type AccionHeroina,
  type Combate,
  type Luchador,
} from './combate';
import { equipar } from './equipo';
import type { Inventario } from './inventario';
import { repartirPuntos } from './progresion';
import type {
  EquipoJson,
  MonstruoJson,
  ObjetosJson,
  ReglasCombate,
  ReglasProgresion,
} from './types';

/**
 * La jugadora simulada: una persona razonable jugando un combate. La usan los tests de equilibrado y el reto del día,
 * que con ella comprueba que el mapa de hoy es justo antes de jugarlo.
 */

/** Cómo juega (src/data/jugadora.json). */
export interface PoliticaJugadora {
  /**
   * Probabilidad de que se defienda de un golpe cargado anunciado. Los probadores no siempre lo hacían (el golem los
   * mataba de un golpe en Normal): la simulada tampoco.
   */
  defiendeCargado: number;
  /** Se cura por debajo de esta fracción de su vida. */
  curarBajo: number;
  /** No se defiende si su golpe (su mejor estadística por esto) remata al último enemigo. */
  margenGolpe: number;
  /** Usa la fuente por debajo de esta fracción de su vida (si no, la guarda para antes del jefe). */
  fuenteBajo: number;
  /** Tope de acciones por combate (por si alguno no acabara). */
  vueltas: number;
}

/** Monstruos, reglas y objetos con la dificultad de la partida ya aplicada, y cómo juega. */
export interface MundoJugadora {
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
  objetos: ObjetosJson;
  experiencia: ReglasProgresion;
  politica: PoliticaJugadora;
}

/** Se cura con poca vida, a veces defiende el golpe cargado y usa lo más fuerte que tenga. */
function decidir(c: Combate, azar: () => number, p: PoliticaJugadora): AccionHeroina {
  const h = c.heroina;
  const vivos = c.enemigos.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv);
  const objetivo = vivos[0]!;
  const habs = habilidadesDisponibles(h).filter((x) => x.pm <= h.pm);
  if (h.pv < h.pvMax * p.curarBajo) {
    const cura = habs.find((x) => x.cura);
    if (cura) return { tipo: 'habilidad', habilidad: cura, objetivo: null };
    if ((c.inventario?.consumibles.pocion ?? 0) > 0) return { tipo: 'objeto', clave: 'pocion' };
  }
  const golpe = Math.max(h.ataque, h.magia) * p.margenGolpe;
  if (
    vivos.some((e) => e.cargando) &&
    !(vivos.length === 1 && objetivo.pv <= golpe) &&
    azar() < p.defiendeCargado
  ) {
    return { tipo: 'defender' };
  }
  const area = habs.find((x) => x.objetivo === 'todos' && x.danio);
  if (area && vivos.length > 1) return { tipo: 'habilidad', habilidad: area, objetivo: null };
  const porPoder = habilidadesDisponibles(h)
    .filter((x) => x.objetivo === 'uno' && x.danio)
    .sort((a, b) => b.danio!.poder - a.danio!.poder);
  // Contra un jefe bebe éter si no le llega para su golpe más fuerte, como haría una persona.
  if (
    porPoder[0] &&
    porPoder[0].pm > h.pm &&
    vivos.some((e) => e.monstruo?.jefe) &&
    (c.inventario?.consumibles.eter ?? 0) > 0
  ) {
    return { tipo: 'objeto', clave: 'eter' };
  }
  const uno = porPoder.find((x) => x.pm <= h.pm);
  if (uno) return { tipo: 'habilidad', habilidad: uno, objetivo };
  return { tipo: 'atacar', objetivo };
}

const valor = (p: EquipoJson | undefined): number =>
  p ? Object.values(p.bonos).reduce((a, b) => a + (b ?? 0), 0) : 0;

/** Se pone la pieza si suma más que la que lleva en ese hueco. */
export function quizaEquipar(
  h: Luchador,
  inv: Inventario,
  objetos: ObjetosJson,
  clave: string,
): void {
  const nueva = objetos.equipo[clave];
  const actual = nueva && inv[nueva.hueco];
  if (nueva && valor(nueva) > valor(actual ? objetos.equipo[actual] : undefined)) {
    equipar(h, inv, objetos, clave);
  }
}

/**
 * Lucha contra `grupo` (claves del bestiario) hasta el final; se equipa lo que encuentre si es mejor y reparte sus
 * puntos. Devuelve si ganó. `recibido`, si se pasa, suma el daño recibido en fracción de su vida máxima.
 */
export function pelear(
  h: Luchador,
  inv: Inventario,
  grupo: readonly string[],
  azar: () => number,
  m: MundoJugadora,
  recibido?: { suma: number; n: number },
): boolean {
  const c = crearCombate(
    h,
    luchadoresDeGrupo(grupo.map((k) => m.bestiario[k]!)),
    m.reglas,
    azar,
    m.bestiario,
  );
  c.inventario = inv;
  c.objetos = m.objetos;
  let danio = 0;
  const sumar = (eventos: ReturnType<typeof avanzar>): void => {
    for (const e of eventos) if (e.tipo === 'danio' && e.objetivo === h) danio += e.cantidad;
  };
  sumar(avanzar(c));
  // Las decisiones de la jugadora, con su propio azar: no cambian las tiradas del combate.
  const jugadora = crearAzar(Math.floor(azar() * 2 ** 31));
  for (let vueltas = 0; !c.resultado && vueltas < m.politica.vueltas; vueltas++)
    sumar(actuar(c, decidir(c, jugadora, m.politica)));
  if (recibido) {
    recibido.suma += Math.min(1, danio / h.pvMax);
    recibido.n++;
  }
  for (const pieza of c.equipoEncontrado) quizaEquipar(h, inv, m.objetos, pieza);
  repartirPuntos(h, h.heroe?.planPuntos ?? [], m.experiencia);
  return c.resultado === 'victoria';
}
