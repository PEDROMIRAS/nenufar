// Los combates de la partida: normales, contra jefes y violetas, sus recompensas y el equipo encontrado.
import { despuesDelCombate } from '../core/trasCombate';
import { crearAzar } from '../core/azar';
import { crearCombate, luchadoresDeGrupo, type Resultado } from '../core/combate';
import { capasDeEquipo, coloresDeEquipo, guardarPieza } from '../core/equipo';
import { cambiosDeNivel, instantanea, repartirPuntos } from '../core/progresion';
import { anotarVencidos } from '../core/records';
import { monstruoCon } from '../core/dificultad';
import type { MonstruoJson, ReglasCombate } from '../core/types';
import { aplicarRecompensa, elegirRecompensa } from '../core/recompensas';
import { OBJETOS, REGLAS } from '../data/datos';
import historia from '../data/historia.json';
import ritmo from '../data/ritmo.json';
import zonas from '../data/zonas.json';
import { EscenaCombate } from '../escenas/combate';
import { EscenaEquipo, type DatosEquipo } from '../escenas/equipo';
import { EscenaMensaje } from '../escenas/mensaje';
import { EscenaPresentacion } from '../escenas/presentacion';
import { EscenaPuntos } from '../escenas/puntos';
import { PALETA } from '../render/marco';
import { vestirHoja } from '../render/tinte';
import { type FondoSala } from '../render/mundo/mundo';
import { cargarRecords, guardarRecords } from '../render/almacen';
import { type Partida } from './partida';
import { type Pagina, SEGUIR, contar } from './relato';
import { terminarReto, terminarPartida } from './fin';

/** Combate contra un jefe, con su frase antes de empezar y otra al caer. */
export function lucharJefe(
  partida: Partida,
  jefe: MonstruoJson,
  frases: { inicio: string; caida: string },
  fondo: FondoSala,
  alTerminar: (resultado: Resultado) => void,
): void {
  // Primero su entrada (la sala tiembla y sale su nombre), luego su frase y el combate.
  partida.pila.apilar(
    new EscenaPresentacion(fondo, jefe.nombre, ritmo.presentacionJefe, () => {
      partida.pila.desapilar();
      contar(partida.pila, [{ titulo: jefe.nombre, texto: frases.inicio }], () =>
        luchar(partida, [jefe], fondo, alTerminar, null, {
          titulo: jefe.nombre,
          texto: frases.caida,
        }),
      );
    }),
  );
}

/** Frases de los jefes violetas, por el nombre de su sprite (los tres dragones comparten la suya). */
export const FRASES_VIOLETAS: Record<string, { inicio: string; caida: string }> = historia.violetas;

/** Combate contra el jefe de una sala violeta: como un jefe de zona y, al vencerlo, su recompensa. */
export function lucharVioleta(
  partida: Partida,
  jefe: MonstruoJson,
  fondo: FondoSala,
  alTerminar: (resultado: Resultado) => void,
): void {
  const frases = FRASES_VIOLETAS[jefe.sprite.split('/').pop() ?? ''];
  if (!frases) throw new Error(`Sin frases en historia.json para ${jefe.sprite}`);
  lucharJefe(partida, jefe, frases, fondo, (resultado) =>
    resultado === 'victoria'
      ? premiar(partida, jefe, () => alTerminar(resultado))
      : alTerminar(resultado),
  );
}

/**
 * Recompensa de un jefe violeta: una al azar de las que faltan (el arma o la armadura van a la mochila y se ofrecen
 * en la pantalla de equipo). El dragón negro, además, da su Corazón. `alAplicar` se llama con la recompensa ya dada y
 * antes de contarla (`crearZona` guarda ahí: cerrar el navegador mientras se cuenta no la pierde ni repite el combate).
 */
export function premiar(partida: Partida, jefe: MonstruoJson, alAplicar: () => void): void {
  const { luchadora: l, inventario: inv } = partida;
  const heroe = l.heroe;
  if (!heroe) return alAplicar();
  const textos: Pagina[] = [];
  let pieza: string | null = null;
  const r = elegirRecompensa(inv.recompensas, crearAzar(partida.semilla * 17 + partida.combates));
  if (r) {
    const ganado = aplicarRecompensa(l, inv, heroe, r);
    if (r === 'habilidad') {
      const t = historia.recompensas.habilidad;
      textos.push({ titulo: t.titulo, texto: t.texto.replace('{habilidad}', ganado) });
    } else {
      pieza = ganado;
      const nombre = OBJETOS.equipo[ganado]?.nombre ?? ganado;
      const t = historia.recompensas.pieza;
      textos.push({
        titulo: t.titulo,
        texto: t.texto.replace('{jefe}', jefe.nombre).replace('{pieza}', nombre),
      });
    }
  }
  if (Object.values(zonas.violetas.dragon).includes(jefe.clave ?? '')) {
    inv.corazon = 'lleno';
    textos.push(historia.recompensas.corazon);
  }
  alAplicar();
  contar(partida.pila, textos, () => {
    if (pieza) ofrecerEquipo(partida, [pieza], () => {});
  });
}

/** Viste la hoja de la heroína según el arma y la armadura que lleva: colores y piezas especiales. */
export function vestir(partida: Partida): void {
  const heroe = partida.luchadora.heroe;
  if (!heroe) return;
  partida.sprite.imagen = vestirHoja(
    partida.imagenBase,
    coloresDeEquipo(heroe, partida.inventario, OBJETOS),
    capasDeEquipo(partida.inventario, OBJETOS).flatMap((k) => partida.capas.get(k) ?? []),
  );
}

/** Lo que necesita la pantalla de Equipo de la partida. */
export function datosEquipo(partida: Partida): DatosEquipo {
  return {
    luchadora: partida.luchadora,
    inventario: partida.inventario,
    objetos: OBJETOS,
    estados: REGLAS.estados,
    sprite: partida.sprite,
    imagenBase: partida.imagenBase,
    capas: partida.capas,
  };
}

/**
 * Enseña, una tras otra, las piezas de equipo encontradas para decidir si se cambian; después sigue. Las piezas van
 * antes a la mochila: la pantalla solo decide si se las pone, y cerrar el navegador con ella abierta no las pierde.
 */
export function ofrecerEquipo(
  partida: Partida,
  piezas: readonly string[],
  alFinal: () => void,
): void {
  for (const pieza of piezas) guardarPieza(partida.inventario, pieza);
  const [primera, ...resto] = piezas;
  if (!primera) {
    vestir(partida);
    alFinal();
    return;
  }
  partida.pila.apilar(
    new EscenaEquipo(datosEquipo(partida), { tipo: 'hallazgo', clave: primera }, () => {
      partida.pila.desapilar();
      ofrecerEquipo(partida, resto, alFinal);
    }),
  );
}

/** Apila un combate contra `grupo`; al acabar lo quita y avisa, salvo derrota (fin de la partida). */
export function luchar(
  partida: Partida,
  grupo: MonstruoJson[],
  /** Sala en la que empieza el combate, que se ve de fondo. */
  fondo: FondoSala,
  alTerminar: (resultado: Resultado) => void,
  iniciativa: 'heroina' | 'monstruos' | null = null,
  /** Lo que dice el jefe al caer, antes de la subida de nivel y del equipo. */
  caida: Pagina | null = null,
  /** Las reglas del combate; las de la partida salvo en los primeros combates del desafío. */
  reglas: ReglasCombate = partida.reglas,
): void {
  const { pila, luchadora } = partida;
  const antes = instantanea(luchadora);
  const azar = crearAzar(partida.semilla * 31 + ++partida.combates);
  const combate = crearCombate(
    luchadora,
    luchadoresDeGrupo(grupo.map((m) => monstruoCon(m, partida.dificultadZona))),
    reglas,
    azar,
    partida.bestiario,
  );
  combate.iniciativa = iniciativa;
  combate.inventario = partida.inventario;
  combate.objetos = OBJETOS;
  pila.apilar(
    new EscenaCombate(combate, partida.sprite, partida.hojas, fondo, (resultado) => {
      pila.desapilar();
      if (resultado === 'victoria') {
        partida.vencidos += combate.enemigos.length;
        // Al bestiario en cuanto se vencen: no se pierden aunque se abandone la partida (el reto no lo toca).
        const claves = combate.enemigos.flatMap((e) =>
          e.monstruo?.clave ? [e.monstruo.clave] : [],
        );
        if (!partida.reto) guardarRecords(anotarVencidos(cargarRecords(), claves));
      }
      if (resultado !== 'derrota') {
        // El combate se da por acabado (y se guarda) antes de sus pantallas: ver `despuesDelCombate`. Lo que apile el
        // mapa al enterarse queda debajo de ellas y se ve después, como siempre.
        const sube = luchadora.nivel > antes.nivel;
        // En el reto los puntos se reparten solos y no se para en un menú.
        if (sube && partida.reto)
          repartirPuntos(luchadora, luchadora.heroe?.planPuntos ?? [], REGLAS.experiencia);
        despuesDelCombate(
          { caida: caida !== null && resultado === 'victoria', sube, reto: partida.reto !== null },
          {
            guardarEquipo: () => {
              for (const pieza of combate.equipoEncontrado) guardarPieza(partida.inventario, pieza);
            },
            avisarMapa: () => alTerminar(resultado),
            ensenar: (pantalla, seguir) => {
              if (pantalla === 'caida' && caida) return contar(pila, [caida], seguir);
              if (pantalla === 'equipo')
                return ofrecerEquipo(partida, combate.equipoEncontrado, seguir);
              const quitar = (): void => {
                pila.desapilar();
                seguir();
              };
              pila.apilar(
                pantalla === 'nivel'
                  ? new EscenaMensaje(
                      `¡Nivel ${luchadora.nivel}!`,
                      PALETA.elegida,
                      cambiosDeNivel(antes, luchadora),
                      SEGUIR,
                      quitar,
                    )
                  : new EscenaPuntos(luchadora, partida.reglas, 'Luego', quitar),
              );
            },
          },
        );
      } else if (partida.reto) {
        terminarReto(partida, false);
      } else {
        terminarPartida(partida, false);
      }
    }),
  );
}
