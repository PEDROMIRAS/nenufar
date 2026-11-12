import { elegirConPeso } from './azar';
import type { Luchador } from './combate';
import { crecerEquipo } from './equipo';
import { guardar, type Inventario } from './inventario';
import { experienciaParaSubir, ganarExperiencia } from './progresion';
import type { DatosEventos, ObjetosJson, ReglasCombate, ReglasProgresion } from './types';

type Altar = DatosEventos['altar'];
type Desafio = DatosEventos['desafio'];
type Ermitano = DatosEventos['ermitano'];
type Vida = Pick<Luchador, 'pv' | 'pvMax' | 'pm' | 'pmMax' | 'nivel'>;

export interface OpcionEvento {
  /** 'vida', 'magia', 'aceptar' o 'marcharse'; en el ermitaño, la clave de la oferta. */
  clave: string;
  texto: string;
  /** Qué hace (o por qué no se puede) con las cifras ya puestas. */
  descripcion: string;
  activa: boolean;
}

/** Lo que cuesta ofrecer vida: la parte de los PV máximos, sin dejar a la heroína por debajo de 1. */
function costeVida(l: Vida, a: Altar): number {
  return Math.min(Math.round(l.pvMax * a.vida.porcentaje), l.pv - 1);
}

/** La experiencia que da ofrecer vida: una parte de la que cuesta subir de nivel (nada en el máximo). */
function pxVida(l: Vida, a: Altar, r: ReglasProgresion): number {
  return l.nivel >= r.nivelMaximo
    ? 0
    : Math.round(experienciaParaSubir(l.nivel, r) * a.vida.experiencia);
}

/** Lo que cura ofrecer magia: la parte de los PV máximos, sin pasarse del máximo. */
function curaMagia(l: Vida, a: Altar): number {
  return Math.min(Math.round(l.pvMax * a.magia.porcentaje), l.pvMax - l.pv);
}

/** Las tres opciones del altar con su efecto explicado; las que no harían nada salen apagadas. */
export function opcionesAltar(l: Vida, a: Altar, r: ReglasProgresion): OpcionEvento[] {
  const coste = costeVida(l, a);
  const cura = curaMagia(l, a);
  const px = pxVida(l, a, r);
  const sirveVida = coste > 0 && (px > 0 || l.pm < l.pmMax);
  const sirveMagia = l.pm > 0 && cura > 0;
  return [
    {
      clave: 'vida',
      texto: a.vida.texto,
      descripcion: !sirveVida
        ? a.vida.sinEfecto
        : (px > 0 ? a.vida.descripcion : a.vida.descripcionNivelMaximo)
            .replace('{coste}', String(coste))
            .replace('{px}', String(px)),
      activa: sirveVida,
    },
    {
      clave: 'magia',
      texto: a.magia.texto,
      descripcion: sirveMagia
        ? a.magia.descripcion.replace('{coste}', String(l.pm)).replace('{cura}', String(cura))
        : a.magia.sinEfecto,
      activa: sirveMagia,
    },
    {
      clave: 'marcharse',
      texto: a.marcharse.texto,
      descripcion: a.marcharse.descripcion,
      activa: true,
    },
  ];
}

/** Guarda cada consumible que cabe; devuelve el aviso de lo que no cupo (vacío si todo cupo). */
function darConsumibles(inv: Inventario, claves: readonly string[], maximo: number): string {
  const sinSitio = claves.filter((c) => !guardar(inv, c, maximo));
  return sinSitio.length > 0 ? `; no te caben más (${sinSitio.join(', ')})` : '';
}

/**
 * Aplica la opción elegida y devuelve el aviso de lo ocurrido. `objetos` da lo que cabe de cada consumible y cómo crece el equipo.
 */
export function aplicarAltar(
  l: Luchador,
  inv: Inventario,
  clave: OpcionEvento['clave'],
  a: Altar,
  objetos: ObjetosJson,
  r: ReglasProgresion,
): string {
  if (clave === 'vida') {
    l.pv -= costeVida(l, a);
    l.pm = l.pmMax;
    const subidos = ganarExperiencia(l, pxVida(l, a, r), r);
    crecerEquipo(l, inv, objetos, subidos.length);
    const nivel = subidos.length > 0 ? `. ¡Subes a nivel ${l.nivel}!` : '';
    return `El altar acepta tu vida y te devuelve la magia${nivel}`;
  }
  if (clave === 'magia') {
    const cura = curaMagia(l, a);
    l.pm = 0;
    l.pv += cura;
    return `El altar acepta tu magia y te cura ${cura} PV${darConsumibles(inv, a.magia.consumibles, objetos.maximoPorTipo)}`;
  }
  return 'Te marchas del altar';
}

/** Las dos opciones del desafío, con el número de combates puesto. */
export function opcionesDesafio(d: Desafio): OpcionEvento[] {
  return [
    {
      clave: 'aceptar',
      texto: d.aceptar.texto,
      descripcion: d.aceptar.descripcion.replace('{combates}', String(d.combates)),
      activa: true,
    },
    {
      clave: 'marcharse',
      texto: d.marcharse.texto,
      descripcion: d.marcharse.descripcion,
      activa: true,
    },
  ];
}

/** Las reglas de los combates del desafío que no son el último: ganar no devuelve vida ni PM. */
export function reglasDesafio(r: ReglasCombate): ReglasCombate {
  return { ...r, recuperacionTrasVictoria: 0 };
}

/** Los `n` grupos del desafío, sorteados con el peso de cada uno (pueden repetirse). */
export function gruposDesafio<G>(
  grupos: readonly { monstruos: G; peso: number }[],
  n: number,
  azar: () => number,
): G[] {
  return Array.from({ length: n }, () => elegirConPeso(grupos, azar)).flatMap((g) =>
    g ? [g.monstruos] : [],
  );
}

/** Las ofertas del ermitaño de esta sala (`cuantas` distintas de la lista, sorteadas con `azar`) y marcharse. */
export function opcionesErmitano(e: Ermitano, azar: () => number): OpcionEvento[] {
  const lista = [...e.ofertas];
  const ofertas: OpcionEvento[] = [];
  while (ofertas.length < e.cuantas && lista.length > 0) {
    const o = lista.splice(Math.floor(azar() * lista.length), 1)[0]!;
    ofertas.push({ clave: o.clave, texto: o.texto, descripcion: o.descripcion, activa: true });
  }
  ofertas.push({ clave: 'marcharse', ...e.marcharse, activa: true });
  return ofertas;
}

/** Da lo que ofrece la oferta `clave` y devuelve el aviso (con lo que no cupo, si algo). */
export function aplicarErmitano(
  inv: Inventario,
  clave: string,
  e: Ermitano,
  objetos: ObjetosJson,
): string {
  const oferta = e.ofertas.find((o) => o.clave === clave);
  if (!oferta) return '';
  // «Poción ×2 y Antídoto»: cada consumible una vez, con su cantidad.
  const cantidades = new Map<string, number>();
  for (const c of oferta.consumibles) cantidades.set(c, (cantidades.get(c) ?? 0) + 1);
  const nombres = [...cantidades].map(([c, n]) => {
    const nombre = objetos.consumibles[c]?.nombre ?? c;
    return n > 1 ? `${nombre} ×${n}` : nombre;
  });
  return `${e.aviso}: ${nombres.join(' y ')}${darConsumibles(inv, oferta.consumibles, objetos.maximoPorTipo)}`;
}
