import type { Luchador } from './combate';
import { guardar, type Inventario } from './inventario';
import type { DatosEventos } from './types';

type Altar = DatosEventos['altar'];
type Vida = Pick<Luchador, 'pv' | 'pvMax' | 'pm' | 'pmMax'>;

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

/** Lo que cura ofrecer magia: la parte de los PV máximos, sin pasarse del máximo. */
function curaMagia(l: Vida, a: Altar): number {
  return Math.min(Math.round(l.pvMax * a.magia.porcentaje), l.pvMax - l.pv);
}

/** Las tres opciones del altar con su efecto explicado; las que no harían nada salen apagadas. */
export function opcionesAltar(l: Vida, a: Altar): OpcionEvento[] {
  const coste = costeVida(l, a);
  const cura = curaMagia(l, a);
  const sirveMagia = l.pm > 0 && cura > 0;
  return [
    {
      clave: 'vida',
      texto: a.vida.texto,
      descripcion:
        coste > 0 ? a.vida.descripcion.replace('{coste}', String(coste)) : a.vida.sinEfecto,
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

/** Aplica la opción elegida y devuelve el aviso de lo ocurrido. `maximo` es lo que cabe de cada consumible. */
export function aplicarAltar(
  l: Vida,
  inv: Inventario,
  clave: OpcionEvento['clave'],
  a: Altar,
  maximo: number,
): string {
  if (clave === 'vida') {
    l.pv -= costeVida(l, a);
    l.pm = l.pmMax;
    const cabe = guardar(inv, a.vida.consumible, maximo);
    return cabe
      ? 'El altar acepta tu vida y te devuelve la magia'
      : 'El altar acepta tu vida; no te caben más Éteres';
  }
  if (clave === 'magia') {
    const cura = curaMagia(l, a);
    l.pm = 0;
    l.pv += cura;
    return `El altar acepta tu magia y te cura ${cura} PV`;
  }
  return 'Te marchas del altar';
}
