import type { Luchador } from './combate';
import type { Mejora, ReglasProgresion } from './types';

/** PX que faltan en total para pasar del nivel `nivel` al siguiente. */
export const experienciaParaSubir = (nivel: number, r: ReglasProgresion): number =>
  r.porNivel * nivel;

/**
 * Suma experiencia a la heroína y sube los niveles que toquen: cada nivel suma su crecimiento de
 * heroes.json, da puntos de mejora y recupera una parte de PV y PM. Devuelve los niveles alcanzados, en orden.
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
    h.puntos += r.puntosPorNivel;
    h.pv = Math.min(h.pvMax, h.pv + Math.round(h.pvMax * r.restaurarAlSubir));
    h.pm = Math.min(h.pmMax, h.pm + Math.round(h.pmMax * r.restaurarAlSubir));
    subidos.push(h.nivel);
  }
  // En el nivel máximo ya no se acumula nada.
  if (h.nivel >= r.nivelMaximo) h.experiencia = 0;
  return subidos;
}

/** Estadísticas de la heroína en un momento dado, para comparar antes y después de subir de nivel. */
export interface Instantanea {
  nivel: number;
  pvMax: number;
  pmMax: number;
  ataque: number;
  magia: number;
  defensa: number;
  velocidad: number;
}

export const instantanea = (l: Luchador): Instantanea => ({
  nivel: l.nivel,
  pvMax: l.pvMax,
  pmMax: l.pmMax,
  ataque: l.ataque,
  magia: l.magia,
  defensa: l.defensa,
  velocidad: l.velocidad,
});

const NOMBRES: [keyof Omit<Instantanea, 'nivel'>, string][] = [
  ['pvMax', 'PV'],
  ['pmMax', 'PM'],
  ['ataque', 'Ataque'],
  ['magia', 'Magia'],
  ['defensa', 'Defensa'],
  ['velocidad', 'Velocidad'],
];

/** Líneas de la pantalla de subida de nivel: lo que ha cambiado y las habilidades nuevas. */
export function cambiosDeNivel(antes: Instantanea, ahora: Luchador): string[] {
  const lineas = NOMBRES.filter(([clave]) => ahora[clave] !== antes[clave]).map(
    ([clave, nombre]) => `${nombre} ${antes[clave]} → ${ahora[clave]}`,
  );
  for (const h of ahora.heroe?.habilidades ?? []) {
    if (h.nivel > antes.nivel && h.nivel <= ahora.nivel)
      lineas.push(`Nueva habilidad: ${h.nombre}`);
  }
  return lineas;
}

/** Gasta un punto de mejora en `mejora`; los PV y PM suben también los actuales. Devuelve si había punto. */
export function mejorar(h: Luchador, mejora: Mejora, r: ReglasProgresion): boolean {
  if (h.puntos <= 0) return false;
  h.puntos--;
  const n = r.mejoras[mejora];
  if (mejora === 'pv') {
    h.pvMax += n;
    h.pv += n;
  } else if (mejora === 'pm') {
    h.pmMax += n;
    h.pm += n;
  } else {
    h[mejora] += n;
  }
  return true;
}
