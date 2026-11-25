import type { Fecha } from './reto';

/** La sala de evento en la que se quiere empezar o que se fuerza en las zonas (`?desafio`, `?ermitano`, `?mercader`). */
export type EventoForzado = 'desafio' | 'ermitano' | 'mercader';

/**
 * Los parámetros de la URL que cambian el juego. Solo `semilla` vale fuera de desarrollo; los demás son atajos para
 * revisar algo sin recorrer la partida y, fuera de desarrollo, salen vacíos.
 */
export interface Atajos {
  /** ?semilla=N repite una partida (entera, entre 1 y 2³¹: el guardado no acepta más). */
  semilla: number | null;
  /** ?zona=N empieza en la zona N (0 = Bosque), dentro de 0..zonas−1. */
  zona: number;
  /** ?mando: textos del mando y su cartel al empezar, sin tenerlo. */
  mando: boolean;
  /** ?puntos=N: puntos de mejora al empezar. */
  puntos: number;
  /** ?nivel=N: empieza en ese nivel (0 = sin atajo). */
  nivel: number;
  /** ?equipo=clave: esa pieza puesta al empezar. */
  equipo: string | null;
  /** ?combate=clave1,clave2: un combate contra esos monstruos nada más empezar. */
  combate: string[];
  /** ?presentar: con ?combate de un solo monstruo, antes su presentación de jefe (vídeo de demo). */
  presentar: boolean;
  /** ?altar: abre la elección del altar nada más empezar. */
  altar: boolean;
  /** ?reto=gana|pierde: la tarjeta final del reto nada más entrar. */
  reto: 'gana' | 'pierde' | null;
  /** ?portada=sala: esa plantilla en la portada; &vista=x,z,ancho acerca la cámara. */
  portada: string | null;
  vista: { x: number; z: number; ancho: number } | null;
  /** ?fecha=AAAA-MM-DD: la fecha de hoy para el reto. */
  fecha: Fecha | null;
  /** ?evento: toda zona con callejón libre tiene un evento. Con ?desafio, ?ermitano o ?mercader, de ese tipo. */
  eventos: boolean;
  /** ?desafio, ?ermitano o ?mercader: todos los eventos de ese tipo, y la partida empieza dentro de su sala. */
  evento: EventoForzado | null;
  /** ?presagio=clave: ese presagio en todas las zonas (la clave sin comprobar). */
  presagio: string | null;
  /** ?descanso: la partida empieza dentro de la sala de descanso. ?hoguera, además, con su hoguera ya encendida. */
  descanso: boolean;
  hoguera: boolean;
}

/** Lee los atajos de `search` (`location.search`); con `dev` falso, solo la semilla. `zonas` es cuántas hay. */
export function leerAtajos(search: string, dev: boolean, zonas: number): Atajos {
  const p = new URLSearchParams(search);
  const pedida = Number(p.get('semilla'));
  const semilla = Number.isInteger(pedida) && pedida > 0 && pedida < 2 ** 31 ? pedida : null;
  const si = (k: string): boolean => dev && p.has(k);
  const texto = (k: string): string | null => (dev ? p.get(k) || null : null);
  const numero = (k: string): number => (dev ? Number(p.get(k)) || 0 : 0);
  const [vx, vz, va] = (texto('vista') ?? '').split(',').map(Number);
  const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto('fecha') ?? '');
  const reto = texto('reto');
  const evento: EventoForzado | null = si('desafio')
    ? 'desafio'
    : si('ermitano')
      ? 'ermitano'
      : si('mercader')
        ? 'mercader'
        : null;
  return {
    semilla,
    zona: Math.max(0, Math.min(zonas - 1, Math.floor(numero('zona')))),
    mando: si('mando'),
    puntos: numero('puntos'),
    nivel: numero('nivel'),
    equipo: texto('equipo'),
    combate: (texto('combate') ?? '').split(',').filter((c) => c !== ''),
    presentar: si('presentar'),
    altar: si('altar'),
    reto: reto === 'gana' || reto === 'pierde' ? reto : null,
    portada: texto('portada'),
    vista: va ? { x: vx!, z: vz!, ancho: va } : null,
    fecha: f ? { anio: Number(f[1]), mes: Number(f[2]), dia: Number(f[3]) } : null,
    eventos: si('evento') || evento !== null,
    evento,
    presagio: texto('presagio'),
    descanso: si('descanso') || si('hoguera'),
    hoguera: si('hoguera'),
  };
}
