import type { Luchador } from './combate';
import type { ReglasProgresion } from './types';

/** PX que faltan en total para pasar del nivel `nivel` al siguiente. */
export const experienciaParaSubir = (nivel: number, r: ReglasProgresion): number =>
  r.porNivel * nivel;

/**
 * Suma experiencia a la heroína y sube los niveles que toquen: cada nivel suma su crecimiento de
 * heroes.json y recupera una parte de PV y PM. Devuelve los niveles alcanzados, en orden.
 */
export function ganarExperiencia(h: Luchador, px: number, r: ReglasProgresion): number[] {
  const subidos: number[] = [];
  if (h.nivel >= r.nivelMaximo) return subidos;
  h.experiencia += px;
  while (h.nivel < r.nivelMaximo && h.experiencia >= experienciaParaSubir(h.nivel, r)) {
    h.experiencia -= experienciaParaSubir(h.nivel, r);
    h.nivel++;
    const c = h.heroe?.porNivel;
    if (c) {
      h.pvMax += c.pv;
      h.pmMax += c.pm;
      h.ataque += c.ataque;
      h.magia += c.magia;
      h.defensa += c.defensa;
      h.velocidad += c.velocidad;
    }
    h.pv = Math.min(h.pvMax, h.pv + Math.round(h.pvMax * r.restaurarAlSubir));
    h.pm = Math.min(h.pmMax, h.pm + Math.round(h.pmMax * r.restaurarAlSubir));
    subidos.push(h.nivel);
  }
  // En el nivel máximo ya no se acumula nada.
  if (h.nivel >= r.nivelMaximo) h.experiencia = 0;
  return subidos;
}
