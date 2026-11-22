import { crearAzar } from './azar';
import {
  actuar,
  avanzar,
  crearCombate,
  habilidadesConocidas,
  habilidadesDisponibles,
  luchadoresDeGrupo,
  type AccionHeroina,
  type Combate,
  type Luchador,
} from './combate';
import { equipar, valorPieza } from './equipo';
import type { Inventario } from './inventario';
import { repartirPuntos } from './progresion';
import type { MonstruoJson, ObjetosJson, ReglasCombate, ReglasProgresion } from './types';

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
  /**
   * Quema o envenena a un jefe solo si le quedan más PV que este múltiplo de su golpe: en un combate corto el daño por
   * turno no compensa el turno gastado.
   */
  quemarSiVida: number;
}

/** Monstruos, reglas y objetos con la dificultad de la partida ya aplicada, y cómo juega. */
export interface MundoJugadora {
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
  objetos: ObjetosJson;
  experiencia: ReglasProgresion;
  politica: PoliticaJugadora;
}

/**
 * Se equipa las primeras de `orden` que conozca, hasta su máximo; si no llega, completa con las que conoce, en su
 * orden. Lo que haría una persona con su plan de habilidades (`planHabilidades` de heroes.json).
 */
export function elegirEquipadas(h: Luchador, orden: readonly string[]): void {
  const conocidas = habilidadesConocidas(h).map((x) => x.nombre);
  const maximo = h.heroe?.equipables ?? 0;
  const elegidas = orden.filter((n) => conocidas.includes(n)).slice(0, maximo);
  for (const n of conocidas)
    if (elegidas.length < maximo && !elegidas.includes(n)) elegidas.push(n);
  h.equipadas = elegidas;
}

/**
 * Se quita el veneno o la quemadura si lleva con qué, se cura con poca vida, rompe el golpe cargado si puede (si no, a
 * veces se defiende), contra un jefe lo debilita o se enfurece primero y si no
 * usa lo más fuerte que tenga.
 */
export function decidir(c: Combate, azar: () => number, p: PoliticaJugadora): AccionHeroina {
  const h = c.heroina;
  const vivos = c.enemigos.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv);
  const objetivo = vivos[0]!;
  const habs = habilidadesDisponibles(h).filter((x) => x.pm <= h.pm);
  const tiene = (l: Luchador, id: string | undefined): boolean =>
    l.estados.some((e) => e.id === id);
  const limpiar = habs.find((x) => x.quitaEstados?.some((id) => tiene(h, id)));
  if (limpiar) return { tipo: 'habilidad', habilidad: limpiar, objetivo: null };
  if (h.pv < h.pvMax * p.curarBajo) {
    const cura = habs.find((x) => x.cura);
    if (cura) return { tipo: 'habilidad', habilidad: cura, objetivo: null };
    if ((c.inventario?.consumibles.pocion ?? 0) > 0) return { tipo: 'objeto', clave: 'pocion' };
  }
  const cargando = vivos.find((e) => e.cargando);
  const romper = habs.find((x) => x.rompeCarga && x.objetivo === 'uno');
  if (cargando && romper) return { tipo: 'habilidad', habilidad: romper, objetivo: cargando };
  const golpe = Math.max(h.ataque, h.magia) * p.margenGolpe;
  if (cargando && !(vivos.length === 1 && objetivo.pv <= golpe) && azar() < p.defiendeCargado) {
    return { tipo: 'defender' };
  }
  // Contra un jefe, primero lo que dura: debilitarlo, envenenarlo o quemarlo, o su propia furia.
  const jefe = vivos.find((e) => e.monstruo?.jefe);
  if (jefe) {
    const preparar = habs.find((x) =>
      x.objetivo === 'uno'
        ? x.estado !== undefined &&
          !tiene(jefe, x.estado) &&
          (!c.reglas.estados[x.estado]?.danioPorTurno || jefe.pv > p.quemarSiVida * golpe)
        : x.objetivo === 'propio' &&
          x.estado !== undefined &&
          (c.reglas.estados[x.estado]?.ataque ?? 1) > 1 &&
          !tiene(h, x.estado),
    );
    if (preparar)
      return {
        tipo: 'habilidad',
        habilidad: preparar,
        objetivo: preparar.objetivo === 'uno' ? jefe : null,
      };
  }
  const area = habs.find((x) => x.objetivo === 'todos' && x.danio);
  if (area && vivos.length > 1) return { tipo: 'habilidad', habilidad: area, objetivo: null };
  // Solo golpes más fuertes que el ataque normal (poder 1): uno más flojo (Golpe de pomo, Escarcha) es para romper
  // cargas, y a la ronin, además, atacar le devuelve PM.
  const porPoder = habilidadesDisponibles(h)
    .filter((x) => x.objetivo === 'uno' && x.danio && x.danio.poder > 1)
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

/** Se pone la pieza si suma más que la que lleva en ese hueco, con lo que crecen las dos en su nivel. */
export function quizaEquipar(
  h: Luchador,
  inv: Inventario,
  objetos: ObjetosJson,
  clave: string,
): void {
  const nueva = objetos.equipo[clave];
  const actual = nueva && inv[nueva.hueco];
  if (
    nueva &&
    valorPieza(nueva, h.nivel) > valorPieza(actual ? objetos.equipo[actual] : undefined, h.nivel)
  ) {
    equipar(h, inv, objetos, clave);
  }
}

/**
 * Lucha contra `grupo` (claves del bestiario) hasta el final; se equipa lo que encuentre si es mejor y reparte sus
 * puntos. Devuelve si ganó. `recibido`, si se pasa, suma el daño recibido en fracción de su vida máxima. `sobra`, si
 * se pasa, recibe cada pieza encontrada que no se pone (en el juego iría a la mochila y se podría dejar al mercader).
 */
export function pelear(
  h: Luchador,
  inv: Inventario,
  grupo: readonly string[],
  azar: () => number,
  m: MundoJugadora,
  recibido?: { suma: number; n: number },
  sobra?: (clave: string) => void,
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
  for (const pieza of c.equipoEncontrado) {
    const hueco = m.objetos.equipo[pieza]?.hueco;
    const antes = hueco ? inv[hueco] : null;
    quizaEquipar(h, inv, m.objetos, pieza);
    if (hueco && inv[hueco] === antes) sobra?.(pieza);
  }
  repartirPuntos(h, h.heroe?.planPuntos ?? [], m.experiencia);
  return c.resultado === 'victoria';
}
