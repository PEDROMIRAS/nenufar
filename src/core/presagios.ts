import { crearAzar } from './azar';
import { partirEnLineas } from './descripciones';
import type { BotinJson, DatosPresagios, DificultadJson, PresagioJson } from './types';

/**
 * Presagio de una zona (o null), sorteado con un azar propio de la semilla de la zona: así el trazado
 * de las salas no cambia y, al recuperar una partida, vuelve a salir el mismo. `permitido` deja fuera
 * los que no sirven en esa zona (ver `presagioUtil`); sin él, o si lo admite todo, el resultado es el mismo.
 */
export function elegirPresagio(
  datos: DatosPresagios,
  semillaZona: number,
  permitido: (p: PresagioJson) => boolean = () => true,
): string | null {
  const azar = crearAzar(semillaZona * 17 + 3);
  if (azar() >= datos.probabilidad) return null;
  const claves = Object.keys(datos.lista).filter((k) => permitido(datos.lista[k]!));
  return claves[Math.floor(azar() * claves.length)] ?? null;
}

/** ¿Tiene sentido el presagio en una zona con ese cofre? Uno que sube el nivel del equipo no sirve si todo está ya al tope. */
export function presagioUtil(
  p: PresagioJson,
  tabla: readonly BotinJson[],
  nivelMaximo: number,
): boolean {
  if (p.nivelCofre === 0) return true;
  const subida = cofreCon(tabla, p, nivelMaximo);
  return subida.some((e, i) => e.nivel !== tabla[i]!.nivel);
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

/** Para la pausa: el nombre del presagio y su descripción partida a `letras` por línea (nada si no hay). */
export function lineasPresagio(p: PresagioJson | null, letras: number): string[] {
  return p ? [p.nombre, ...partirEnLineas(p.descripcion, letras)] : [];
}

/** Lo que devuelve la fuente de descanso: todo, o solo los PM. */
export function restaurarFuente(
  l: { pv: number; pvMax: number; pm: number; pmMax: number },
  modo: PresagioJson['fuente'],
): void {
  if (modo === 'todo') l.pv = l.pvMax;
  l.pm = l.pmMax;
}
