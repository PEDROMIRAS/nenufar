import { leerAtajos } from '../core/atajos';
import zonas from '../data/zonas.json';

/**
 * shortcut: los atajos de desarrollo por URL, leídos una vez al cargar (ver `leerAtajos`). Fuera de desarrollo, solo la
 * semilla. Sin `location` (los tests), ninguno.
 */
export const ATAJOS = leerAtajos(
  typeof location === 'undefined' ? '' : location.search,
  import.meta.env.DEV,
  Object.keys(zonas.zonas).length,
);
