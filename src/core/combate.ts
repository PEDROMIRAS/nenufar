import type { HeroeJson, MonstruoJson, ReglasCombate } from './types';

export interface Luchador {
  nombre: string;
  pv: number;
  pvMax: number;
  pm: number;
  pmMax: number;
  ataque: number;
  magia: number;
  defensa: number;
  velocidad: number;
  esHeroina: boolean;
  /** Recibe menos daño hasta el comienzo de su próximo turno. */
  defendiendo: boolean;
  /** Anunció un golpe cargado: lo descarga en su próximo turno. */
  cargando: boolean;
  monstruo: MonstruoJson | null;
}

export type Resultado = 'victoria' | 'derrota' | 'huida';

/** Lo que pasa en el combate, en orden; la escena solo lo anima. */
export type Evento =
  | { tipo: 'turno'; actor: Luchador }
  | {
      tipo: 'danio';
      origen: Luchador;
      objetivo: Luchador;
      cantidad: number;
      critico: boolean;
      cargado: boolean;
    }
  | { tipo: 'defensa'; actor: Luchador; pm: number }
  | { tipo: 'carga'; actor: Luchador; aviso: string }
  | { tipo: 'huida'; exito: boolean }
  | { tipo: 'muerte'; objetivo: Luchador }
  | { tipo: 'fin'; resultado: Resultado };

export type AccionHeroina =
  { tipo: 'atacar'; objetivo: Luchador } | { tipo: 'defender' } | { tipo: 'huir' };

export interface Combate {
  heroina: Luchador;
  enemigos: Luchador[];
  /** Orden de la ronda actual; `turno` señala al siguiente en actuar. */
  orden: Luchador[];
  turno: number;
  intentosHuida: number;
  /** La heroína tiene el turno y se espera su acción. */
  esperando: boolean;
  resultado: Resultado | null;
  reglas: ReglasCombate;
  azar: () => number;
}

function luchador(
  nombre: string,
  e: HeroeJson['estadisticas'],
  esHeroina: boolean,
  monstruo: MonstruoJson | null,
): Luchador {
  return {
    nombre,
    pv: e.pv,
    pvMax: e.pv,
    pm: e.pm,
    pmMax: e.pm,
    ataque: e.ataque,
    magia: e.magia,
    defensa: e.defensa,
    velocidad: e.velocidad,
    esHeroina,
    defendiendo: false,
    cargando: false,
    monstruo,
  };
}

export const luchadorDeHeroe = (h: HeroeJson): Luchador =>
  luchador(h.nombre, h.estadisticas, true, null);
export const luchadorDeMonstruo = (m: MonstruoJson): Luchador =>
  luchador(m.nombre, m.estadisticas, false, m);

export function crearCombate(
  heroina: Luchador,
  enemigos: Luchador[],
  reglas: ReglasCombate,
  azar: () => number,
): Combate {
  // La heroína llega de combates anteriores: no arrastra su defensa.
  heroina.defendiendo = false;
  heroina.cargando = false;
  return {
    heroina,
    enemigos,
    orden: [],
    turno: 0,
    intentosHuida: 0,
    esperando: false,
    resultado: null,
    reglas,
    azar,
  };
}

/** Contra un jefe no se puede huir. */
export function puedeHuir(c: Combate): boolean {
  return !c.enemigos.some((e) => e.monstruo?.jefe);
}

/** daño = max(1, ⌊(ATQ × poder − DEF × factor) × varianza × crítico⌋), como en el documento de diseño. */
export function calcularDanio(
  ataque: number,
  poder: number,
  defensa: number,
  factorDefensa: number,
  reglas: ReglasCombate,
  azar: () => number,
): { cantidad: number; critico: boolean } {
  const { varianza, critico } = reglas;
  const v = varianza.min + azar() * (varianza.max - varianza.min);
  const esCritico = azar() < critico.probabilidad;
  const bruto =
    (ataque * poder - defensa * factorDefensa) * v * (esCritico ? critico.multiplicador : 1);
  return { cantidad: Math.max(1, Math.floor(bruto)), critico: esCritico };
}

/** Juega turnos de monstruos hasta que le toca a la heroína o se acaba el combate. */
export function avanzar(c: Combate): Evento[] {
  const eventos: Evento[] = [];
  while (!c.resultado && !c.esperando) {
    const actor = siguienteActor(c);
    actor.defendiendo = false; // la defensa dura hasta el comienzo de su propio turno
    eventos.push({ tipo: 'turno', actor });
    if (actor.esHeroina) c.esperando = true;
    else actuarMonstruo(c, actor, eventos);
  }
  return eventos;
}

/** La heroína hace su acción; después se juega hasta su siguiente turno o el final. */
export function actuar(c: Combate, accion: AccionHeroina): Evento[] {
  if (!c.esperando) throw new Error('No es el turno de la heroína');
  c.esperando = false;
  const h = c.heroina;
  const eventos: Evento[] = [];
  if (accion.tipo === 'atacar') {
    golpear(c, h, accion.objetivo, 1, false, eventos);
  } else if (accion.tipo === 'defender') {
    h.defendiendo = true;
    const pm = Math.min(h.pmMax, h.pm + c.reglas.defender.pm) - h.pm;
    h.pm += pm;
    eventos.push({ tipo: 'defensa', actor: h, pm });
  } else {
    if (!puedeHuir(c)) throw new Error('No se puede huir de este combate');
    const exito = c.azar() < c.reglas.huida.base + c.reglas.huida.porIntento * c.intentosHuida;
    eventos.push({ tipo: 'huida', exito });
    if (exito) terminar(c, 'huida', eventos);
    else c.intentosHuida++;
  }
  eventos.push(...avanzar(c));
  return eventos;
}

function siguienteActor(c: Combate): Luchador {
  for (;;) {
    if (c.turno >= c.orden.length) {
      // Nueva ronda: por Velocidad, y los empates al azar.
      const vivos = [c.heroina, ...c.enemigos].filter((l) => l.pv > 0);
      const desempate = new Map(vivos.map((l) => [l, c.azar()]));
      c.orden = vivos.sort(
        (a, b) => b.velocidad - a.velocidad || desempate.get(a)! - desempate.get(b)!,
      );
      c.turno = 0;
    }
    const actor = c.orden[c.turno++]!;
    if (actor.pv > 0) return actor;
  }
}

function actuarMonstruo(c: Combate, m: Luchador, eventos: Evento[]): void {
  const datos = m.monstruo;
  if (m.cargando && datos?.cargado) {
    m.cargando = false;
    golpear(c, m, c.heroina, datos.cargado.poder, true, eventos);
    return;
  }
  const accion = elegirPorPeso(datos?.acciones ?? [], c.azar);
  if (accion === 'cargar' && datos?.cargado) {
    m.cargando = true;
    eventos.push({ tipo: 'carga', actor: m, aviso: datos.cargado.aviso });
  } else {
    golpear(c, m, c.heroina, 1, false, eventos);
  }
}

function golpear(
  c: Combate,
  origen: Luchador,
  objetivo: Luchador,
  poder: number,
  cargado: boolean,
  eventos: Evento[],
): void {
  const { reglas } = c;
  const golpe = calcularDanio(
    origen.ataque,
    poder,
    objetivo.defensa,
    reglas.defensaFisica,
    reglas,
    c.azar,
  );
  const cantidad = objetivo.defendiendo
    ? Math.max(1, Math.floor(golpe.cantidad * reglas.defender.factorDanio))
    : golpe.cantidad;
  objetivo.pv = Math.max(0, objetivo.pv - cantidad);
  eventos.push({ tipo: 'danio', origen, objetivo, cantidad, critico: golpe.critico, cargado });
  if (objetivo.pv > 0) return;
  eventos.push({ tipo: 'muerte', objetivo });
  if (objetivo.esHeroina) terminar(c, 'derrota', eventos);
  else if (c.enemigos.every((e) => e.pv <= 0)) terminar(c, 'victoria', eventos);
}

function terminar(c: Combate, resultado: Resultado, eventos: Evento[]): void {
  c.resultado = resultado;
  c.esperando = false;
  eventos.push({ tipo: 'fin', resultado });
}

function elegirPorPeso<T extends { peso: number }>(
  tabla: readonly (T & { accion: string })[],
  azar: () => number,
): string | undefined {
  const total = tabla.reduce((s, a) => s + a.peso, 0);
  let r = azar() * total;
  for (const a of tabla) {
    r -= a.peso;
    if (r < 0) return a.accion;
  }
  return tabla[tabla.length - 1]?.accion;
}
