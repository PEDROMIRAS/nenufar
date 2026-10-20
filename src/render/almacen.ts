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

const CLAVE_AJUSTES = 'nenufar.ajustes';

export interface Ajustes {
  silencio: boolean;
}

export function cargarAjustes(): Ajustes {
  try {
    const a = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) ?? '{}') as Partial<Ajustes>;
    return { silencio: a.silencio === true };
  } catch {
    return { silencio: false };
  }
}

export function guardarAjustes(a: Ajustes): void {
  try {
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(a));
  } catch {
    // Sin almacenamiento, el ajuste dura lo que dure la partida.
  }
}

export function guardarRecords(r: Records): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    // Sin almacenamiento disponible los récords se pierden, pero el juego sigue.
  }
}
