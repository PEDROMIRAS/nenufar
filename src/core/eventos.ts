import { elegirConPeso } from './azar';
import type { Luchador } from './combate';
import { crecerEquipo } from './equipo';
import { guardar, type Inventario } from './inventario';
import { experienciaParaSubir, ganarExperiencia } from './progresion';
import type { DatosEventos, ObjetosJson, ReglasCombate, ReglasProgresion } from './types';

type Altar = DatosEventos['altar'];
type Desafio = DatosEventos['desafio'];
type Ermitano = DatosEventos['ermitano'];
type Mercader = DatosEventos['mercader'];
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

/** Guarda cada consumible que cabe; devuelve el aviso de lo que no cupo (vacío si todo cupo), con sus nombres. */
function darConsumibles(inv: Inventario, claves: readonly string[], objetos: ObjetosJson): string {
  const sinSitio = claves.filter((c) => !guardar(inv, c, objetos.maximoPorTipo));
  const nombres = [...new Set(sinSitio)].map((c) => objetos.consumibles[c]?.nombre ?? c);
  return nombres.length > 0 ? `; no te caben más (${nombres.join(', ')})` : '';
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
    return `El altar acepta tu magia y te cura ${cura} PV${darConsumibles(inv, a.magia.consumibles, objetos)}`;
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
  return `${e.aviso}: ${nombrarLote(oferta.consumibles, objetos)}${darConsumibles(inv, oferta.consumibles, objetos)}`;
}

/** Lo que se lee al hablar con el ermitaño: quién es y, si la zona lo tiene, su saludo. */
export function textoErmitano(e: Ermitano, zona: string): string {
  const saludo = e.saludos[zona];
  return saludo ? `${e.descripcion} ${saludo}` : e.descripcion;
}

/** Su despedida al llevarse una oferta: una de la lista al azar (sin lista, nada). */
export function despedidaErmitano(e: Ermitano, azar: () => number): string {
  return e.despedidas[Math.floor(azar() * e.despedidas.length)] ?? '';
}

/** Lo que vale una pieza para el mercader: la suma de sus bonos. */
function valorPieza(clave: string, objetos: ObjetosJson): number {
  const bonos = objetos.equipo[clave]?.bonos ?? {};
  return Object.values(bonos).reduce((a: number, b) => a + (b ?? 0), 0);
}

/**
 * Lo que da el mercader por la pieza `clave`: `base` más uno por cada `porBono` de su valor, y cada unidad del
 * consumible de `paga` del que menos se lleva (contando lo que ya suma el lote; a igualdad, el primero de la lista).
 * Solo da lo que cabe: con todo al máximo, el lote sale más corto o vacío (y la oferta se apaga).
 */
export function loteMercader(
  inv: Inventario,
  clave: string,
  m: Mercader,
  objetos: ObjetosJson,
): string[] {
  const n = m.base + Math.floor(valorPieza(clave, objetos) / m.porBono);
  const cuenta = new Map(m.paga.map((c) => [c, inv.consumibles[c] ?? 0]));
  const lote: string[] = [];
  for (let i = 0; i < n; i++) {
    let elegido: string | null = null;
    for (const c of m.paga) {
      const n = cuenta.get(c)!;
      if (n < objetos.maximoPorTipo && (elegido === null || n < cuenta.get(elegido)!)) elegido = c;
    }
    if (elegido === null) break;
    cuenta.set(elegido, cuenta.get(elegido)! + 1);
    lote.push(elegido);
  }
  return lote;
}

/** «Poción ×2 y Éter»: cada consumible una vez, con su cantidad. */
function nombrarLote(lote: readonly string[], objetos: ObjetosJson): string {
  const cantidades = new Map<string, number>();
  for (const c of lote) cantidades.set(c, (cantidades.get(c) ?? 0) + 1);
  return [...cantidades]
    .map(([c, n]) => {
      const nombre = objetos.consumibles[c]?.nombre ?? c;
      return n > 1 ? `${nombre} ×${n}` : nombre;
    })
    .join(' y ');
}

const conPieza = (texto: string, pieza: string, lote: string): string =>
  texto.replace('{pieza}', pieza).replace('{lote}', lote);

/**
 * Las ofertas del mercader: una por pieza de la mochila (hasta `cuantas`, de más a menos valiosa; a igualdad, en el
 * orden de la mochila) y marcharse. Con la mochila vacía, una opción apagada que dice por qué.
 */
export function opcionesMercader(
  inv: Inventario,
  m: Mercader,
  objetos: ObjetosJson,
): OpcionEvento[] {
  const piezas = inv.mochila
    .filter((k) => objetos.equipo[k])
    .map((k, i) => ({ k, i, v: valorPieza(k, objetos) }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .slice(0, m.cuantas);
  const ofertas: OpcionEvento[] = piezas.map(({ k }) => {
    const nombre = objetos.equipo[k]!.nombre;
    const lote = loteMercader(inv, k, m, objetos);
    return {
      clave: k,
      texto: nombre,
      descripcion:
        lote.length > 0 ? conPieza(m.oferta, nombre, nombrarLote(lote, objetos)) : m.lleno,
      activa: lote.length > 0,
    };
  });
  if (ofertas.length === 0) ofertas.push({ clave: 'nada', ...m.sinNada, activa: false });
  ofertas.push({ clave: 'marcharse', ...m.marcharse, activa: true });
  return ofertas;
}

/**
 * Deja la pieza `clave` de la mochila en el puesto (apuntada en `vendidas`: los botines no la repiten), da su lote y
 * devuelve el aviso (con lo que no cupo, si algo). Una clave que no está en la mochila no hace nada.
 */
export function aplicarMercader(
  inv: Inventario,
  clave: string,
  m: Mercader,
  objetos: ObjetosJson,
): string {
  const pieza = objetos.equipo[clave];
  if (!pieza || !inv.mochila.includes(clave)) return '';
  const lote = loteMercader(inv, clave, m, objetos);
  // Sin nada que quepa no hay trueque: la pieza se queda en la mochila.
  if (lote.length === 0) return '';
  inv.mochila = inv.mochila.filter((k) => k !== clave);
  inv.vendidas = [...(inv.vendidas ?? []), clave];
  return (
    conPieza(m.aviso, pieza.nombre, nombrarLote(lote, objetos)) + darConsumibles(inv, lote, objetos)
  );
}
