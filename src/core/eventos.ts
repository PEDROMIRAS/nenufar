import type { Luchador } from './combate';
import { guardar, type Inventario } from './inventario';
import { experienciaParaSubir, ganarExperiencia } from './progresion';
import type { DatosEventos, ReglasProgresion } from './types';

type Altar = DatosEventos['altar'];
type Vida = Pick<Luchador, 'pv' | 'pvMax' | 'pm' | 'pmMax' | 'nivel'>;

export interface OpcionEvento {
  clave: 'vida' | 'magia' | 'marcharse';
  texto: string;
  /** Qué hace (o por qué no se puede) con las cifras ya puestas. */
  descripcion: string;
  activa: boolean;
}

/** Lo que cuesta ofrecer vida: la parte de los PV máximos, sin dejar a la heroína por debajo de 1. */
function costeVida(l: Vida, a: Altar): number {
  return Math.min(Math.round(l.pvMax * a.vida.porcentaje), l.pv - 1);
}

/** La experiencia que da ofrecer vida: una parte de la que falta para el siguiente nivel (nada en el máximo). */
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
  const sirveMagia = l.pm > 0 && cura > 0;
  return [
    {
      clave: 'vida',
      texto: a.vida.texto,
      descripcion:
        coste === 0
          ? a.vida.sinEfecto
          : (px > 0 ? a.vida.descripcion : a.vida.descripcionNivelMaximo)
              .replace('{coste}', String(coste))
              .replace('{px}', String(px)),
      activa: coste > 0,
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
 * Aplica la opción elegida y devuelve el aviso de lo ocurrido. `maximo` es lo que cabe de cada consumible.
 */
export function aplicarAltar(
  l: Luchador,
  inv: Inventario,
  clave: OpcionEvento['clave'],
  a: Altar,
  maximo: number,
  r: ReglasProgresion,
): string {
  if (clave === 'vida') {
    l.pv -= costeVida(l, a);
    l.pm = l.pmMax;
    const subidos = ganarExperiencia(l, pxVida(l, a, r), r);
    const nivel = subidos.length > 0 ? `. ¡Subes a nivel ${l.nivel}!` : '';
    return `El altar acepta tu vida y te devuelve la magia${nivel}`;
  }
  if (clave === 'magia') {
    const cura = curaMagia(l, a);
    l.pm = 0;
    l.pv += cura;
    return `El altar acepta tu magia y te cura ${cura} PV${darConsumibles(inv, a.magia.consumibles, maximo)}`;
  }
  return 'Te marchas del altar';
}
