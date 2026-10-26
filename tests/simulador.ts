import { crearAzar, elegirConPeso } from '../src/core/azar';
import {
  actuar,
  avanzar,
  crearCombate,
  habilidadesDisponibles,
  luchadorDeHeroe,
  luchadoresDeGrupo,
  type AccionHeroina,
  type Combate,
  type Luchador,
} from '../src/core/combate';
import { abrirCofre, equipar, inventarioInicial } from '../src/core/equipo';
import type { Inventario } from '../src/core/inventario';
import { mejorar } from '../src/core/progresion';
import type {
  DificultadJson,
  EquipoJson,
  Mejora,
  MonstruoJson,
  ReglasCombate,
} from '../src/core/types';
import { generarZona } from '../src/core/zona';
import { bestiarioCon, reglasCon } from '../src/core/dificultad';
import { DIFICULTADES, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import zonas from '../src/data/zonas.json';

/** Simulador de partidas enteras jugadas con una política razonable (para el equilibrado). */

/**
 * Probabilidad de que la jugadora se defienda de un golpe cargado anunciado. Los probadores no
 * siempre lo hacían (el golem los mataba de un golpe en Normal): la simulada tampoco.
 */
const DEFIENDE_CARGADO = 0.5;

/** Jugadora razonable: se cura con poca vida, a veces defiende el golpe cargado y usa lo más fuerte que tenga. */
function decidir(c: Combate, azar: () => number): AccionHeroina {
  const h = c.heroina;
  const vivos = c.enemigos.filter((e) => e.pv > 0).sort((a, b) => a.pv - b.pv);
  const objetivo = vivos[0]!;
  const habs = habilidadesDisponibles(h).filter((x) => x.pm <= h.pm);
  if (h.pv < h.pvMax * 0.35) {
    const cura = habs.find((x) => x.cura);
    if (cura) return { tipo: 'habilidad', habilidad: cura, objetivo: null };
    if ((c.inventario?.consumibles.pocion ?? 0) > 0) return { tipo: 'objeto', clave: 'pocion' };
  }
  const golpe = Math.max(h.ataque, h.magia) * 1.2;
  if (
    vivos.some((e) => e.cargando) &&
    !(vivos.length === 1 && objetivo.pv <= golpe) &&
    azar() < DEFIENDE_CARGADO
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
function quizaEquipar(h: Luchador, inv: Inventario, clave: string): void {
  const nueva = OBJETOS.equipo[clave];
  const actual = nueva && inv[nueva.hueco];
  if (nueva && valor(nueva) > valor(actual ? OBJETOS.equipo[actual] : undefined)) {
    equipar(h, inv, OBJETOS, clave);
  }
}

/** Reparto de los puntos de mejora de cada rana (por su hoja de sprite), por turnos. */
const PLAN: Record<string, Mejora[]> = {
  rana_ronin: ['ataque', 'pv', 'defensa'],
  rana_maga: ['magia', 'pv', 'pm'],
};

function gastarPuntos(h: Luchador): void {
  const plan = PLAN[h.heroe?.sprite ?? ''] ?? [];
  for (
    let i = 0;
    plan.length > 0 && mejorar(h, plan[(h.nivel + i) % plan.length]!, REGLAS.experiencia);
    i++
  );
}

/** Monstruos y reglas con la dificultad de la partida ya aplicada. */
export interface Mundo {
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
}

export function pelear(
  h: Luchador,
  inv: Inventario,
  grupo: string[],
  azar: () => number,
  { bestiario, reglas }: Mundo,
  /** Si se pasa, suma el daño que recibe la heroína, en fracción de su vida máxima. */
  recibido?: Media,
): boolean {
  const c = crearCombate(
    h,
    luchadoresDeGrupo(grupo.map((k) => bestiario[k]!)),
    reglas,
    azar,
    bestiario,
  );
  c.inventario = inv;
  c.objetos = OBJETOS;
  let danio = 0;
  const sumar = (eventos: ReturnType<typeof avanzar>): void => {
    for (const e of eventos) if (e.tipo === 'danio' && e.objetivo === h) danio += e.cantidad;
  };
  sumar(avanzar(c));
  // Las decisiones de la jugadora, con su propio azar: no cambian las tiradas del combate.
  const jugadora = crearAzar(Math.floor(azar() * 2 ** 31));
  for (let vueltas = 0; !c.resultado && vueltas < 300; vueltas++)
    sumar(actuar(c, decidir(c, jugadora)));
  if (recibido) {
    recibido.suma += Math.min(1, danio / h.pvMax);
    recibido.n++;
  }
  for (const pieza of c.equipoEncontrado) quizaEquipar(h, inv, pieza);
  gastarPuntos(h);
  return c.resultado === 'victoria';
}

export interface Cuenta {
  ganados: number;
  jugados: number;
}
export const pct = (c: Cuenta): number =>
  c.jugados ? Math.round((c.ganados / c.jugados) * 1000) / 10 : 0;

export interface Media {
  suma: number;
  n: number;
}
/** La media en porcentaje, con un decimal. */
export const media = (m: Media): number => (m.n ? Math.round((m.suma / m.n) * 1000) / 10 : 0);

export function simular(
  nombre: string,
  partidas = 300,
  dificultad: DificultadJson = DIFICULTADES.normal,
  /**
   * Se llama al terminar de explorar cada zona (antes de la fuente y del jefe), con la heroína tal
   * como entraría a la sala violeta: para probar combates con una copia sin tocar la partida.
   */
  alExplorar?: (
    zona: keyof typeof zonas.zonas,
    h: Luchador,
    inv: Inventario,
    mundo: Mundo,
    s: number,
  ) => void,
) {
  const mundo: Mundo = {
    bestiario: bestiarioCon(MONSTRUOS, dificultad),
    reglas: reglasCon(REGLAS, dificultad),
  };
  const heroe = HEROES[nombre as keyof typeof HEROES];
  const claves = Object.keys(zonas.zonas) as (keyof typeof zonas.zonas)[];
  const sueltos: Record<string, Cuenta> = {};
  const reales: Record<string, Cuenta> = {};
  const jefes: Record<string, Cuenta> = {};
  const trampas: Record<string, Cuenta> = {};
  /** Vida que quita de media un combate normal de cada zona empezado con la vida llena. */
  const recibido: Record<string, Media> = {};
  /** Nivel con que se llega a cada jefe. */
  const niveles: Record<string, number[]> = {};
  const contar = (t: Record<string, Cuenta>, k: string, gana: boolean): void => {
    t[k] ??= { ganados: 0, jugados: 0 };
    t[k].jugados++;
    if (gana) t[k].ganados++;
  };
  let completas = 0;
  for (let s = 1; s <= partidas; s++) {
    const azar = crearAzar(s * 97);
    const h = luchadorDeHeroe(heroe);
    const inv = inventarioInicial(h, heroe, OBJETOS);
    let viva = true;
    for (const [i, clave] of claves.entries()) {
      const z = zonas.zonas[clave];
      // Sin salas violetas (son opcionales), pero con el tesoro trampa, que no se distingue de uno normal.
      const zona = generarZona(
        {
          ...zonas.generacion,
          salas: z.salas,
          probabilidadTrampa: zonas.violetas.probabilidadTrampa,
        },
        s + i * 7919,
      );
      let fuente = zona.salas.some((x) => x.tipo === 'descanso');
      const abrir = (): void => {
        const hallazgo = abrirCofre(z.cofre, azar, heroe, OBJETOS, inv);
        if (hallazgo?.tipo === 'equipo') quizaEquipar(h, inv, hallazgo.clave);
      };
      for (const sala of zona.salas) {
        if (sala.tipo !== 'combate' && !sala.trampa) {
          if (sala.tipo === 'tesoro') abrir();
          continue;
        }
        // La fuente se guarda para cuando hace falta.
        if (fuente && h.pv < h.pvMax * 0.5) {
          fuente = false;
          h.pv = h.pvMax;
          h.pm = h.pmMax;
        }
        if (sala.trampa) {
          viva = pelear(h, inv, [z.cofreTrampa], azar, mundo);
          contar(trampas, clave, viva);
          if (!viva) break;
          abrir();
          continue;
        }
        const grupos = zonas.monstruos.gruposPorSala;
        const n = grupos.min + Math.floor(azar() * (grupos.max - grupos.min + 1));
        for (let g = 0; g < n && viva; g++) {
          const grupo = elegirConPeso(z.grupos, azar)!.monstruos;
          // El mismo combate empezando con la vida llena, sin tocar la partida.
          const copia = structuredClone(h);
          copia.pv = copia.pvMax;
          copia.pm = copia.pmMax;
          contar(
            sueltos,
            clave,
            pelear(
              copia,
              structuredClone(inv),
              grupo,
              crearAzar(s * 131 + g),
              mundo,
              (recibido[clave] ??= { suma: 0, n: 0 }),
            ),
          );
          viva = pelear(h, inv, grupo, azar, mundo);
          contar(reales, clave, viva);
        }
        if (!viva) break;
      }
      if (!viva) break;
      alExplorar?.(clave, h, inv, mundo, s);
      if (fuente) {
        h.pv = h.pvMax;
        h.pm = h.pmMax;
      }
      (niveles[clave] ??= []).push(h.nivel);
      viva = pelear(h, inv, [z.jefe], azar, mundo);
      contar(jefes, clave, viva);
      if (!viva) break;
    }
    if (viva) {
      (niveles.final ??= []).push(h.nivel);
      viva = pelear(h, inv, [zonas.jefeFinal], azar, mundo);
      contar(jefes, 'final', viva);
    }
    if (viva) completas++;
  }
  return {
    sueltos,
    reales,
    jefes,
    trampas,
    recibido,
    niveles,
    completas: Math.round((completas / partidas) * 1000) / 10,
  };
}
