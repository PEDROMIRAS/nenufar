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
  /**
   * Último nombre que se puso a cada heroína (por su nombre de heroes.json). Se guarda pero aún no se usa:
   * queda para una mejora futura (Pedro prefiere pedir el nombre siempre).
   */
  nombres: Record<string, string>;
  /** En el móvil en vertical, se eligió jugar así (sin girarlo): no se vuelve a pedir. */
  jugarEnVertical: boolean;
}

/** Ajustes guardados; si faltan o están dañados, los de por defecto (nada de lo leído se da por bueno sin comprobarlo). */
export function cargarAjustes(): Ajustes {
  try {
    const a = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) ?? '{}') as Partial<Ajustes> | null;
    const nombres = Object.entries(a?.nombres ?? {}).filter(
      (par): par is [string, string] => typeof par[1] === 'string',
    );
    return {
      silencio: a?.silencio === true,
      nombres: Object.fromEntries(nombres),
      jugarEnVertical: a?.jugarEnVertical === true,
    };
  } catch {
    return { silencio: false, nombres: {}, jugarEnVertical: false };
  }
}

/** Guarda solo lo que cambia, sin perder el resto de ajustes. */
export function guardarAjustes(cambios: Partial<Ajustes>): void {
  try {
    localStorage.setItem(CLAVE_AJUSTES, JSON.stringify({ ...cargarAjustes(), ...cambios }));
  } catch {
    // Sin almacenamiento, el ajuste dura lo que dure la partida.
  }
}

/** Recuerda el nombre que se ha puesto a una heroína. */
export function guardarNombre(heroina: string, nombre: string): void {
  guardarAjustes({ nombres: { ...cargarAjustes().nombres, [heroina]: nombre } });
}

export function guardarRecords(r: Records): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    // Sin almacenamiento disponible los récords se pierden, pero el juego sigue.
  }
}
