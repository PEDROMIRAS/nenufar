// Los JSON de datos con sus tipos: TypeScript infiere "uno" como string y no como 'uno' | 'todos' | 'propio'.
import type { HeroeJson, MonstruoJson, ReglasCombate } from '../core/types';
import combateJson from './combate.json';
import heroesJson from './heroes.json';
import monstruosJson from './monstruos.json';

export const HEROES = heroesJson as Record<keyof typeof heroesJson, HeroeJson>;
export const MONSTRUOS = monstruosJson as Record<string, MonstruoJson>;
export const REGLAS = combateJson as ReglasCombate;
