import { leerRecords, type Records } from '../core/records';
import { leerGuardado, type Conocido, type PartidaGuardada } from '../core/guardado';
import { leerReto, type EstadoReto } from '../core/reto';

// localStorage solo para ajustes, récords, la partida en curso y el récord del reto del día (decisión fija del proyecto).
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
  /** Volumen de la música elegido en el inventario, de 0 a 1 (multiplica el de sonido.json). */
  musica: number;
  /** Lo mismo para los efectos de sonido. */
  efectos: number;
  /** Nombre de la última heroína que venció al jefe final: en la partida siguiente es ella quien espera en la Cripta. */
  senora: string;
  /** Ya se enseñaron las pistas de controles de la primera partida. */
  pistasVistas: boolean;
  /** Calidad baja del mapa en 3D: sin desenfoque ni sombras, para móviles que no llegan a 60 fps. */
  calidadBaja: boolean;
  /** Cuánto tiembla la pantalla con los golpes, de 0 a 1 (con «menos movimiento» del sistema, nada). */
  temblor: number;
}

/** Ajustes guardados; si faltan o están dañados, los de por defecto (nada de lo leído se da por bueno sin comprobarlo). */
export function cargarAjustes(): Ajustes {
  try {
    const a = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) ?? '{}') as Partial<Ajustes> | null;
    return {
      silencio: a?.silencio === true,
      musica: typeof a?.musica === 'number' && a.musica >= 0 && a.musica <= 1 ? a.musica : 1,
      efectos: typeof a?.efectos === 'number' && a.efectos >= 0 && a.efectos <= 1 ? a.efectos : 1,
      senora: typeof a?.senora === 'string' ? a.senora : '',
      pistasVistas: a?.pistasVistas === true,
      calidadBaja: a?.calidadBaja === true,
      temblor: typeof a?.temblor === 'number' && a.temblor >= 0 && a.temblor <= 1 ? a.temblor : 1,
    };
  } catch {
    return {
      silencio: false,
      musica: 1,
      efectos: 1,
      senora: '',
      pistasVistas: false,
      calidadBaja: false,
      temblor: 1,
    };
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

export function guardarRecords(r: Records): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    // Sin almacenamiento disponible los récords se pierden, pero el juego sigue.
  }
}

const CLAVE_PARTIDA = 'nenufar.partida';

/** La partida guardada al entrar en la última sala; null si no hay, no se puede leer o no vale. */
export function cargarPartida(conocido: Conocido): PartidaGuardada | null {
  try {
    return leerGuardado(localStorage.getItem(CLAVE_PARTIDA), conocido);
  } catch {
    return null;
  }
}

export function guardarPartida(p: PartidaGuardada): void {
  try {
    localStorage.setItem(CLAVE_PARTIDA, JSON.stringify(p));
  } catch {
    // Sin almacenamiento no hay red de seguridad, pero el juego sigue.
  }
}

export function borrarPartida(): void {
  try {
    localStorage.removeItem(CLAVE_PARTIDA);
  } catch {
    // Nada que borrar si no hay almacenamiento.
  }
}

const CLAVE_RETO = 'nenufar.reto';

/** El reto del día guardado (fecha, mejores de cada rana y días jugados); vacío si no se puede leer. */
export function cargarReto(): EstadoReto {
  try {
    return leerReto(localStorage.getItem(CLAVE_RETO));
  } catch {
    return leerReto(null);
  }
}

export function guardarReto(e: EstadoReto): void {
  try {
    localStorage.setItem(CLAVE_RETO, JSON.stringify(e));
  } catch {
    // Sin almacenamiento el reto se juega igual, sin récord.
  }
}
