import { crearAzar } from './azar';
import type { BotinJson, DatosPresagios, DificultadJson, PresagioJson } from './types';

/**
 * Presagio de una zona (o null), sorteado con un azar propio de la semilla de la zona: así el trazado
 * de las salas no cambia y, al recuperar una partida, vuelve a salir el mismo.
 */
export function elegirPresagio(datos: DatosPresagios, semillaZona: number): string | null {
  const azar = crearAzar(semillaZona * 17 + 3);
  if (azar() >= datos.probabilidad) return null;
  const claves = Object.keys(datos.lista);
  return claves[Math.floor(azar() * claves.length)] ?? null;
}

/**
 * La dificultad con el presagio puesto. Los jefes violetas reciben `violetas` de la dificultad y,
 * además, el presagio.
 */
export function dificultadCon(d: DificultadJson, p: PresagioJson | null): DificultadJson {
  if (!p) return d;
  return {
    ...d,
    ataque: d.ataque * p.ataque,
    vida: d.vida * p.vida,
    recuperacion: d.recuperacion * p.recuperacion,
    experiencia: p.experiencia,
  };
}

/** Tabla del cofre con el equipo `nivelCofre` niveles por encima, sin pasar de `nivelMaximo`. */
export function cofreCon(
  tabla: readonly BotinJson[],
  p: PresagioJson | null,
  nivelMaximo: number,
): BotinJson[] {
  return tabla.map((e) =>
    e.nivel === undefined || !p
      ? { ...e }
      : { ...e, nivel: Math.min(e.nivel + p.nivelCofre, Math.max(e.nivel, nivelMaximo)) },
  );
}

/** Lo que devuelve la fuente de descanso: todo, o solo los PM. */
export function restaurarFuente(
  l: { pv: number; pvMax: number; pm: number; pmMax: number },
  modo: PresagioJson['fuente'],
): void {
  if (modo === 'todo') l.pv = l.pvMax;
  l.pm = l.pmMax;
}
