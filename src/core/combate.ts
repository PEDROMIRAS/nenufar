import { elegirConPeso } from './azar';
import { ganarExperiencia } from './progresion';
import type {
  AccionMonstruoJson,
  EstadoJson,
  Estadisticas,
  HabilidadJson,
  HeroeJson,
  MonstruoJson,
  ReglasCombate,
} from './types';

/** Un estado alterado activo sobre un luchador. */
export interface EstadoActivo {
  id: string;
  def: EstadoJson;
  /** Turnos del afectado que le quedan. */
  turnos: number;
  /** Se aplicó durante el turno del propio afectado: ese turno no cuenta. */
  nuevo: boolean;
}

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
  nivel: number;
  /** Experiencia acumulada dentro del nivel actual. */
  experiencia: number;
  /** Recibe menos daño hasta el comienzo de su próximo turno. */
  defendiendo: boolean;
  /** Anunció un golpe cargado: lo descarga en su próximo turno. */
  cargando: boolean;
  estados: EstadoActivo[];
  /** Fases de jefe ya alcanzadas (0 = ninguna). */
  fase: number;
  heroe: HeroeJson | null;
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
  | { tipo: 'habilidad'; actor: Luchador; nombre: string }
  | { tipo: 'cura'; objetivo: Luchador; cantidad: number }
  | { tipo: 'estado'; objetivo: Luchador; estado: string; activo: boolean }
  | { tipo: 'danioEstado'; objetivo: Luchador; cantidad: number; estado: string }
  | { tipo: 'pierdeTurno'; actor: Luchador }
  /** Anuncio de un monstruo (cambio de fase, invocación…); `retira` = deja el combate sin morir. */
  | { tipo: 'aviso'; actor: Luchador; texto: string; retira: boolean }
  | { tipo: 'aparece'; objetivo: Luchador }
  | { tipo: 'huida'; exito: boolean }
  | { tipo: 'muerte'; objetivo: Luchador }
  | { tipo: 'experiencia'; cantidad: number }
  /** PV y PM que recupera la heroína al ganar. */
  | { tipo: 'recupera'; pv: number; pm: number }
  | { tipo: 'nivel'; nivel: number }
  | { tipo: 'fin'; resultado: Resultado };

export type AccionHeroina =
  | { tipo: 'atacar'; objetivo: Luchador }
  | { tipo: 'habilidad'; habilidad: HabilidadJson; objetivo: Luchador | null }
  | { tipo: 'defender' }
  | { tipo: 'huir' };

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
  /** Monstruos que pueden aparecer a mitad de combate (invocaciones y transformaciones). */
  bestiario: Readonly<Record<string, MonstruoJson>>;
}

function luchador(
  nombre: string,
  e: Estadisticas,
  heroe: HeroeJson | null,
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
    esHeroina: heroe !== null,
    nivel: 1,
    experiencia: 0,
    defendiendo: false,
    cargando: false,
    estados: [],
    fase: 0,
    heroe,
    monstruo,
  };
}

export const luchadorDeHeroe = (h: HeroeJson): Luchador =>
  luchador(h.nombre, h.estadisticas, h, null);
export const luchadorDeMonstruo = (m: MonstruoJson): Luchador =>
  luchador(m.nombre, m.estadisticas, null, m);

/** Luchadores de un grupo; los repetidos se distinguen con una letra («Limo A», «Limo B»). */
export function luchadoresDeGrupo(grupo: readonly MonstruoJson[]): Luchador[] {
  return grupo.map((m, i) => {
    const l = luchadorDeMonstruo(m);
    const iguales = grupo.filter((o) => o.nombre === m.nombre).length;
    const antes = grupo.slice(0, i).filter((o) => o.nombre === m.nombre).length;
    if (iguales > 1) l.nombre += ` ${String.fromCharCode(65 + antes)}`;
    return l;
  });
}

export function crearCombate(
  heroina: Luchador,
  enemigos: Luchador[],
  reglas: ReglasCombate,
  azar: () => number,
  bestiario: Readonly<Record<string, MonstruoJson>> = {},
): Combate {
  // La heroína llega de combates anteriores: no arrastra defensa ni estados.
  heroina.defendiendo = false;
  heroina.cargando = false;
  heroina.estados = [];
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
    bestiario,
  };
}

/** Contra un jefe no se puede huir. */
export function puedeHuir(c: Combate): boolean {
  return !c.enemigos.some((e) => e.monstruo?.jefe);
}

/** Habilidades que la heroína ya ha desbloqueado por nivel. */
export function habilidadesDisponibles(h: Luchador): HabilidadJson[] {
  return (h.heroe?.habilidades ?? []).filter((hab) => hab.nivel <= h.nivel);
}

/** Estadística con los multiplicadores de los estados activos (Furia, Postura de hierro…). */
export function efectiva(l: Luchador, clave: 'ataque' | 'magia' | 'defensa'): number {
  let valor = l[clave];
  for (const e of l.estados) valor *= e.def[clave] ?? 1;
  return valor;
}

/** daño = max(1, ⌊(ATQ × poder − DEF × factor) × varianza × crítico⌋), como en el documento de diseño. */
export function calcularDanio(
  ataque: number,
  poder: number,
  defensa: number,
  factorDefensa: number,
  reglas: ReglasCombate,
  azar: () => number,
  criticoSeguro = false,
): { cantidad: number; critico: boolean } {
  const { varianza, critico } = reglas;
  const v = varianza.min + azar() * (varianza.max - varianza.min);
  const esCritico = criticoSeguro || azar() < critico.probabilidad;
  const bruto =
    (ataque * poder - defensa * factorDefensa) * v * (esCritico ? critico.multiplicador : 1);
  return { cantidad: Math.max(1, Math.floor(bruto)), critico: esCritico };
}

/** Aplica (o renueva) un estado de combate.json a un luchador. */
export function aplicarEstado(
  c: Combate,
  objetivo: Luchador,
  id: string,
  enSuTurno: boolean,
  eventos: Evento[],
): void {
  const def = c.reglas.estados[id];
  if (!def) throw new Error(`Estado desconocido: ${id}`);
  const activo = objetivo.estados.find((e) => e.id === id);
  if (activo) {
    activo.turnos = def.turnos;
    activo.nuevo = enSuTurno;
  } else {
    objetivo.estados.push({ id, def, turnos: def.turnos, nuevo: enSuTurno });
  }
  eventos.push({ tipo: 'estado', objetivo, estado: def.nombre, activo: true });
}

/** Juega turnos de monstruos hasta que le toca a la heroína o se acaba el combate. */
export function avanzar(c: Combate): Evento[] {
  const eventos: Evento[] = [];
  while (!c.resultado && !c.esperando) {
    const actor = siguienteActor(c);
    actor.defendiendo = false; // la defensa dura hasta el comienzo de su propio turno
    eventos.push({ tipo: 'turno', actor });
    const aturdido = actor.estados.find((e) => e.def.pierdeTurno);
    if (aturdido) {
      quitarEstado(actor, aturdido, eventos);
      eventos.push({ tipo: 'pierdeTurno', actor });
      finDeTurno(c, actor, eventos);
    } else if (actor.esHeroina) {
      c.esperando = true;
    } else {
      actuarMonstruo(c, actor, eventos);
      finDeTurno(c, actor, eventos);
    }
  }
  return eventos;
}

/** La heroína hace su acción; después se juega hasta su siguiente turno o el final. */
export function actuar(c: Combate, accion: AccionHeroina): Evento[] {
  if (!c.esperando) throw new Error('No es el turno de la heroína');
  const h = c.heroina;
  if (accion.tipo === 'habilidad') {
    const { habilidad } = accion;
    if (habilidad.nivel > h.nivel) throw new Error(`${habilidad.nombre} aún no está disponible`);
    if (habilidad.pm > h.pm) throw new Error(`No hay PM para ${habilidad.nombre}`);
  }
  if (accion.tipo === 'huir' && !puedeHuir(c)) throw new Error('No se puede huir de este combate');
  c.esperando = false;
  const eventos: Evento[] = [];
  if (accion.tipo === 'atacar') {
    golpear(c, h, accion.objetivo, 1, false, false, false, eventos);
  } else if (accion.tipo === 'habilidad') {
    usarHabilidad(c, h, accion.habilidad, accion.objetivo, eventos);
  } else if (accion.tipo === 'defender') {
    h.defendiendo = true;
    const pm = Math.min(h.pmMax, h.pm + c.reglas.defender.pm) - h.pm;
    h.pm += pm;
    eventos.push({ tipo: 'defensa', actor: h, pm });
  } else {
    const exito = c.azar() < c.reglas.huida.base + c.reglas.huida.porIntento * c.intentosHuida;
    eventos.push({ tipo: 'huida', exito });
    if (exito) terminar(c, 'huida', eventos);
    else c.intentosHuida++;
  }
  if (!c.resultado) finDeTurno(c, h, eventos);
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
    golpear(c, m, c.heroina, datos.cargado.poder, true, false, false, eventos);
    return;
  }
  // La tabla de la última fase alcanzada que tenga una; si no, la de siempre.
  const fases = (datos?.fases ?? []).slice(0, m.fase);
  const tabla = fases.reverse().find((f) => f.acciones)?.acciones ?? datos?.acciones ?? [];
  // Solo cuentan las acciones cuya condición se cumple y que puede pagar.
  const posibles = tabla.filter((a) => cumple(c, m, a) && sePuede(c, m, a.accion));
  const accion = elegirConPeso(posibles, c.azar)?.accion;
  const habilidad = datos?.habilidades?.find((h) => h.nombre === accion);
  if (accion === 'cargar' && datos?.cargado) {
    m.cargando = true;
    eventos.push({ tipo: 'carga', actor: m, aviso: datos.cargado.aviso });
  } else if (accion === 'invocar' && datos?.invocacion) {
    eventos.push({ tipo: 'aviso', actor: m, texto: datos.invocacion.aviso, retira: false });
    for (const clave of datos.invocacion.monstruos) {
      if (vivos(c.enemigos) >= datos.invocacion.maximo) break;
      sumarEnemigo(c, clave, eventos);
    }
  } else if (accion === 'defender') {
    m.defendiendo = true;
    eventos.push({ tipo: 'defensa', actor: m, pm: 0 });
  } else if (habilidad) {
    usarHabilidad(c, m, habilidad, c.heroina, eventos);
  } else {
    golpear(c, m, c.heroina, 1, false, false, false, eventos);
  }
}

function cumple(c: Combate, m: Luchador, a: AccionMonstruoJson): boolean {
  const { pvPropioMenorQue, pvAliadoMenorQue } = a.condicion ?? {};
  if (pvPropioMenorQue !== undefined && m.pv >= m.pvMax * pvPropioMenorQue) return false;
  if (
    pvAliadoMenorQue !== undefined &&
    !aliados(c, m).some((l) => l.pv > 0 && l.pv < l.pvMax * pvAliadoMenorQue)
  ) {
    return false;
  }
  return true;
}

/** ¿Puede hacer esa acción ahora? Una habilidad necesita sus PM y, si es de apoyo, un aliado al que ayudar. */
const vivos = (lista: readonly Luchador[]): number => lista.filter((l) => l.pv > 0).length;

/** Añade al combate un monstruo del bestiario a mitad de pelea. */
function sumarEnemigo(c: Combate, clave: string, eventos: Evento[]): void {
  const datos = c.bestiario[clave];
  if (!datos) throw new Error(`Monstruo desconocido en el bestiario: ${clave}`);
  const nuevo = luchadorDeMonstruo(datos);
  // Una letra para distinguirlo de los que ya hay del mismo tipo («Araña B»).
  const iguales = c.enemigos.filter((e) => e.monstruo === datos).length;
  if (iguales > 0) nuevo.nombre += ` ${String.fromCharCode(65 + iguales)}`;
  c.enemigos.push(nuevo);
  eventos.push({ tipo: 'aparece', objetivo: nuevo });
}

/**
 * Si un jefe ha bajado de los umbrales de sus fases, entra en ellas: avisa, cambia de acciones o se
 * transforma (se retira y aparecen otros). Devuelve si se ha retirado.
 */
function comprobarFase(c: Combate, m: Luchador, eventos: Evento[]): boolean {
  const fases = m.monstruo?.fases ?? [];
  while (m.pv > 0 && m.fase < fases.length && m.pv < m.pvMax * fases[m.fase]!.pvMenorQue) {
    const fase = fases[m.fase++]!;
    const retira = (fase.transformarEn?.length ?? 0) > 0;
    eventos.push({ tipo: 'aviso', actor: m, texto: fase.aviso, retira });
    if (retira) {
      m.pv = 0;
      m.estados = [];
      for (const clave of fase.transformarEn!) sumarEnemigo(c, clave, eventos);
      return true;
    }
  }
  return false;
}

function sePuede(c: Combate, m: Luchador, accion: string): boolean {
  if (accion === 'invocar') {
    const inv = m.monstruo?.invocacion;
    return inv !== undefined && vivos(c.enemigos) < inv.maximo;
  }
  const hab = m.monstruo?.habilidades?.find((h) => h.nombre === accion);
  if (!hab) return true;
  return hab.pm <= m.pm && (hab.objetivo !== 'aliado' || elegirAliado(c, m, hab) !== undefined);
}

function aliados(c: Combate, actor: Luchador): Luchador[] {
  return actor.esHeroina ? [c.heroina] : c.enemigos;
}

/** El aliado vivo más herido si la habilidad cura; si aplica un estado, el primero que no lo tenga. */
function elegirAliado(c: Combate, actor: Luchador, hab: HabilidadJson): Luchador | undefined {
  const vivos = aliados(c, actor).filter((l) => l.pv > 0);
  if (hab.cura) {
    const heridos = vivos.filter((l) => l.pv < l.pvMax);
    return heridos.sort((a, b) => a.pv / a.pvMax - b.pv / b.pvMax)[0];
  }
  if (hab.estado) return vivos.find((l) => !l.estados.some((e) => e.id === hab.estado));
  return vivos[0];
}

function rivales(c: Combate, actor: Luchador): Luchador[] {
  return actor.esHeroina ? c.enemigos : [c.heroina];
}

function usarHabilidad(
  c: Combate,
  actor: Luchador,
  hab: HabilidadJson,
  elegido: Luchador | null,
  eventos: Evento[],
): void {
  actor.pm -= hab.pm;
  eventos.push({ tipo: 'habilidad', actor, nombre: hab.nombre });
  const vivos = rivales(c, actor).filter((l) => l.pv > 0);
  const objetivos = (
    hab.objetivo === 'propio'
      ? [actor]
      : hab.objetivo === 'todos'
        ? vivos
        : hab.objetivo === 'aliado'
          ? [elegirAliado(c, actor, hab)]
          : [elegido && elegido.pv > 0 ? elegido : vivos[0]]
  ).filter((l) => l !== undefined);
  for (const o of objetivos) {
    if (c.resultado) return;
    if (hab.danio) {
      const { tipo, poder, criticoSeguro = false } = hab.danio;
      golpear(c, actor, o, poder, false, tipo === 'magico', criticoSeguro, eventos);
    }
    if (hab.cura) {
      const cantidad = Math.min(o.pvMax - o.pv, Math.round(o.pvMax * hab.cura));
      o.pv += cantidad;
      eventos.push({ tipo: 'cura', objetivo: o, cantidad });
    }
    if (hab.estado && o.pv > 0) aplicarEstado(c, o, hab.estado, o === actor, eventos);
  }
}

function golpear(
  c: Combate,
  origen: Luchador,
  objetivo: Luchador,
  poder: number,
  cargado: boolean,
  magico: boolean,
  criticoSeguro: boolean,
  eventos: Evento[],
): void {
  const { reglas } = c;
  const golpe = calcularDanio(
    efectiva(origen, magico ? 'magia' : 'ataque'),
    poder,
    efectiva(objetivo, 'defensa'),
    magico ? reglas.defensaMagica : reglas.defensaFisica,
    reglas,
    c.azar,
    criticoSeguro,
  );
  const cantidad = objetivo.defendiendo
    ? Math.max(1, Math.floor(golpe.cantidad * reglas.defender.factorDanio))
    : golpe.cantidad;
  objetivo.pv = Math.max(0, objetivo.pv - cantidad);
  eventos.push({ tipo: 'danio', origen, objetivo, cantidad, critico: golpe.critico, cargado });
  if (!comprobarFase(c, objetivo, eventos)) comprobarMuerte(c, objetivo, eventos);
}

/** Final del turno de `actor`: daño de los estados (Veneno) y cuenta atrás de su duración. */
function finDeTurno(c: Combate, actor: Luchador, eventos: Evento[]): void {
  for (const e of [...actor.estados]) {
    if (c.resultado || actor.pv <= 0) return;
    if (e.def.danioPorTurno) {
      const cantidad = Math.max(1, Math.floor(actor.pvMax * e.def.danioPorTurno));
      actor.pv = Math.max(0, actor.pv - cantidad);
      eventos.push({ tipo: 'danioEstado', objetivo: actor, cantidad, estado: e.def.nombre });
      if (comprobarFase(c, actor, eventos) || comprobarMuerte(c, actor, eventos)) return;
    }
    if (e.nuevo) {
      e.nuevo = false;
      continue;
    }
    if (--e.turnos <= 0) quitarEstado(actor, e, eventos);
  }
}

function quitarEstado(l: Luchador, e: EstadoActivo, eventos: Evento[]): void {
  l.estados.splice(l.estados.indexOf(e), 1);
  eventos.push({ tipo: 'estado', objetivo: l, estado: e.def.nombre, activo: false });
}

/** Si el luchador ha caído, lo anuncia y cierra el combate cuando toca. Devuelve si cayó. */
function comprobarMuerte(c: Combate, objetivo: Luchador, eventos: Evento[]): boolean {
  if (objetivo.pv > 0) return false;
  objetivo.estados = [];
  eventos.push({ tipo: 'muerte', objetivo });
  if (objetivo.esHeroina) terminar(c, 'derrota', eventos);
  else if (c.enemigos.every((e) => e.pv <= 0)) terminar(c, 'victoria', eventos);
  return true;
}

function terminar(c: Combate, resultado: Resultado, eventos: Evento[]): void {
  c.resultado = resultado;
  c.esperando = false;
  if (resultado === 'victoria') {
    const h = c.heroina;
    const fraccion = c.reglas.recuperacionTrasVictoria;
    const pv = Math.min(h.pvMax - h.pv, Math.round(h.pvMax * fraccion));
    const pm = Math.min(h.pmMax - h.pm, Math.round(h.pmMax * fraccion));
    h.pv += pv;
    h.pm += pm;
    eventos.push({ tipo: 'recupera', pv, pm });
    const px = c.enemigos.reduce((suma, e) => suma + (e.monstruo?.experiencia ?? 0), 0);
    eventos.push({ tipo: 'experiencia', cantidad: px });
    for (const nivel of ganarExperiencia(c.heroina, px, c.reglas.experiencia)) {
      eventos.push({ tipo: 'nivel', nivel });
    }
  }
  eventos.push({ tipo: 'fin', resultado });
}
