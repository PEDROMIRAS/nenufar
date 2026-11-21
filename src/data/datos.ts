// Los JSON de datos con sus tipos: TypeScript infiere "uno" como string y no como 'uno' | 'todos' | 'propio'.
import type { DatosVertical } from '../core/encuadre';
import type { ImpactoJson } from '../core/impacto';
import type { MapaVivoJson } from '../core/senales';
import type {
  DatosMenuCombate,
  DatosEventos,
  DatosPresagios,
  DificultadJson,
  Hd2dJson,
  HeroeJson,
  MonstruoJson,
  ObjetosJson,
  ReglasCombate,
} from '../core/types';
import combateJson from './combate.json';
import dificultadesJson from './dificultades.json';
import eventosJson from './eventos.json';
import hd2dJson from './hd2d.json';
import impactoJson from './impacto.json';
import mapaVivoJson from './mapa_vivo.json';
import heroesJson from './heroes.json';
import monstruosJson from './monstruos.json';
import objetosJson from './objetos.json';
import presagiosJson from './presagios.json';
import verticalJson from './vertical.json';
import menuCombateJson from './menu_combate.json';

export const HEROES = heroesJson as Record<keyof typeof heroesJson, HeroeJson>;
export const MONSTRUOS = monstruosJson as Record<string, MonstruoJson>;
for (const [clave, m] of Object.entries(MONSTRUOS)) m.clave = clave;
export const REGLAS = combateJson as ReglasCombate;
export const OBJETOS = objetosJson as ObjetosJson;
export const DIFICULTADES = dificultadesJson as Record<keyof typeof dificultadesJson, DificultadJson>;
export const EVENTOS = eventosJson as DatosEventos;
export const PRESAGIOS = presagiosJson as DatosPresagios;
export const HD2D = hd2dJson as Hd2dJson;
export const VERTICAL: DatosVertical = verticalJson;
export const MENU_COMBATE = menuCombateJson as DatosMenuCombate;
export const IMPACTO = impactoJson as ImpactoJson;
export const MAPA_VIVO = mapaVivoJson as MapaVivoJson;
