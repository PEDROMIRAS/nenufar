import { leerRecords, type Records } from '../core/records';

// localStorage solo para ajustes y récords (decisión fija del proyecto).
const CLAVE = 'nenufar.records';

/** Récords guardados; vacíos si el navegador no deja leer (modo privado, almacenamiento bloqueado…). */
export function cargarRecords(): Records {
  try {
    return leerRecords(localStorage.getItem(CLAVE));
  } catch {
    return leerRecords(null);
  }
}

export function guardarRecords(r: Records): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    // Sin almacenamiento disponible los récords se pierden, pero el juego sigue.
  }
}
