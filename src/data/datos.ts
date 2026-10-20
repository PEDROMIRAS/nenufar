// Los JSON de datos con sus tipos: TypeScript infiere "uno" como string y no como 'uno' | 'todos' | 'propio'.
import type {
  DificultadJson,
  HeroeJson,
  MonstruoJson,
  ObjetosJson,
  ReglasCombate,
} from '../core/types';
import combateJson from './combate.json';
import dificultadesJson from './dificultades.json';
import heroesJson from './heroes.json';
import monstruosJson from './monstruos.json';
import objetosJson from './objetos.json';

export const HEROES = heroesJson as Record<keyof typeof heroesJson, HeroeJson>;
export const MONSTRUOS = monstruosJson as Record<string, MonstruoJson>;
export const REGLAS = combateJson as ReglasCombate;
export const OBJETOS = objetosJson as ObjetosJson;
export const DIFICULTADES = dificultadesJson as Record<keyof typeof dificultadesJson, DificultadJson>;
