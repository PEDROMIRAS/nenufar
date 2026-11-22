// El mapa del Bosque sin dibujo ni sonido, para probar EscenaMapa sin navegador. Cada test que lo use declara antes
// los `vi.mock` de dibujo y sonido (ver tests/mapa_recuperar.test.ts): solo surten efecto en el propio archivo de test.
import { luchadorDeHeroe } from '../src/core/combate';
import { inventarioInicial } from '../src/core/equipo';
import { crearHeroina } from '../src/core/heroina';
import { crearCatalogo } from '../src/core/sala';
import type { MonstruoJson, TilesetJson } from '../src/core/types';
import { generarZona, type AjustesZona, type SalaZona, type Zona } from '../src/core/zona';
import { EVENTOS, HD2D, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../src/data/datos';
import bosque from '../src/data/salas/plantillas_bosque.json';
import zonas from '../src/data/zonas.json';
import type { OpcionesMapa } from '../src/escenas/mapa';
import type { Mundo } from '../src/render/mundo/mundo';
import type { Sprite } from '../src/render/recursos';
import bosqueAuto from '../public/assets/tilesets/bosque_autotiles.json';
import bosqueTiles from '../public/assets/tilesets/bosque.json';
import comunes from '../public/assets/tilesets/comunes.json';

export const datos = zonas.zonas.bosque;
export const catalogo = crearCatalogo([
  bosqueTiles,
  comunes,
  bosqueAuto,
] as unknown as TilesetJson[]);
const monstruo = (clave: string): MonstruoJson => MONSTRUOS[clave]!;

/**
 * Un Bosque que tenga una sala que cumpla `cumple`, y el índice de esa sala. Por defecto todo evento es un desafío;
 * `ajustes` cambia las probabilidades (p. ej. `{ probabilidadDesafio: 0, probabilidadErmitano: 1 }`).
 */
export function zonaCon(
  cumple: (s: SalaZona) => boolean,
  ajustes: Partial<AjustesZona> = {},
): { zona: Zona; sala: number } {
  for (let semilla = 1; ; semilla++) {
    const zona = generarZona(
      {
        ...zonas.generacion,
        salas: datos.salas,
        probabilidadEvento: 1,
        probabilidadDesafio: 1,
        ...ajustes,
      },
      semilla,
    );
    const sala = zona.salas.findIndex(cumple);
    if (sala >= 0) return { zona, sala };
  }
}

/** Las opciones del mapa de `zona` con la ronin y nada conectado; `cambios` sustituye lo que haga falta. */
export function opcionesMapa(zona: Zona, cambios: Partial<OpcionesMapa> = {}): OpcionesMapa {
  const heroe = HEROES.ronin!;
  const luchadora = luchadorDeHeroe(heroe);
  return {
    zona,
    plantillas: bosque,
    catalogo,
    imagenes: [],
    tam: 32,
    heroina: crearHeroina(heroe, 0, 0),
    sprite: { datos: { animations: {} } } as unknown as Sprite,
    musica: 'bosque',
    spritesMonstruos: new Map(),
    duracionFundido: zonas.transicionSalas,
    rejilla: zonas.generacion.rejilla,
    alUsarPortal: null,
    entrarDesdeNegro: false,
    grupos: datos.grupos.map(({ monstruos, peso }) => ({
      peso,
      monstruos: monstruos.map(monstruo),
    })),
    gruposPorSala: zonas.monstruos.gruposPorSala,
    gruposExtra: 0,
    modoFuente: 'todo',
    presagio: null,
    jefe: monstruo(datos.jefe),
    jefeVioleta: null,
    cofreTrampa: monstruo(datos.cofreTrampa),
    distanciaMonstruos: zonas.monstruos.distanciaEntradas,
    invulnerabilidad: REGLAS.invulnerabilidadTrasCombate,
    iniciarCombate: () => {},
    luchadora,
    nombreZona: datos.nombre,
    lluviaTrasJefe: 0,
    pistas: [],
    segundosPista: 1,
    cofre: datos.cofre,
    inventario: inventarioInicial(luchadora, heroe, OBJETOS),
    objetos: OBJETOS,
    usarAltar: () => {},
    desafio: EVENTOS.desafio,
    usarDesafio: () => {},
    ermitano: EVENTOS.ermitano,
    usarErmitano: () => {},
    usarMercader: () => {},
    // La comparación de la pieza se cierra en el acto.
    ofrecerEquipo: (_clave, alFinal) => alFinal(),
    elegirHabilidades: () => {},
    abrirPausa: () => {},
    mundo: { refrescarLuces: () => {}, rehacerObjeto: () => {} } as unknown as Mundo,
    aspecto: HD2D.zonas.bosque!,
    fuente: HD2D.fuente,
    ...cambios,
  };
}
