import { luchadorDeHeroe, type Luchador } from '../core/combate';
import { bestiarioCon, reglasCon } from '../core/dificultad';
import { ajustarEquipadas } from '../core/equipadas';
import { equipar, inventarioInicial } from '../core/equipo';
import { eligeAlRecuperar, restaurarHeroina, type PartidaGuardada } from '../core/guardado';
import { brasasDe, copiaHoguera, textoBrasas } from '../core/hoguera';
import { crearHeroina } from '../core/heroina';
import type { Inventario } from '../core/inventario';
import { empezarEnNivel } from '../core/progresion';
import { semillaDelDia, type Fecha } from '../core/reto';
import type { DificultadJson, HeroeJson } from '../core/types';
import { DIFICULTADES, HEROES, MONSTRUOS, OBJETOS, REGLAS } from '../data/datos';
import historia from '../data/historia.json';
import RETO from '../data/reto.json';
import ritmo from '../data/ritmo.json';
import type { PilaEscenas } from '../escenas/pila';
import { EscenaPresentacion } from '../escenas/presentacion';
import { guardarAjustes, guardarPartida } from '../render/almacen';
import type { Mundo } from '../render/mundo/mundo';
import type { Sprite } from '../render/recursos';
import { ATAJOS } from './atajos';
import { luchar, vestir } from './combates';
import { abrirAltar } from './eventos';
import { terminarReto } from './fin';
import { guardado, mostrarError, ORDEN, sesion, type NombreZona, type Partida } from './partida';
import { cartel, contar, elegirHabilidades, paginaPresagio, paginas, tituloRival } from './relato';
import { crearZona } from './zona';

/** Lo que el arranque carga una vez y comparten todas las partidas. */
export interface Arranque {
  pila: PilaEscenas;
  mundo: Mundo;
  semilla: number;
  /** Cada rana con su hoja, en el orden de heroes.json. */
  ranas: readonly { heroe: HeroeJson; sprite: Sprite }[];
  capas: Partida['capas'];
  hojas: Partida['hojas'];
  controles: Partida['controles'];
}

/** Las tres formas de empezar a jugar: una partida nueva, el reto del día y una partida guardada. */
export interface Inicio {
  empezar(heroe: HeroeJson, dificultad: DificultadJson, nombre: string): void;
  /** «Otra vez» vuelve a llamarlo con la misma rana y la misma fecha (y sin la página de entrada). */
  empezarReto(heroe: HeroeJson, fecha: Fecha, otraVez?: boolean): void;
  /** `vuelta`: se sigue desde la hoguera tras caer (otra página de entrada). */
  recuperar(guardada: PartidaGuardada, vuelta?: boolean): void;
}

export function crearInicio(a: Arranque): Inicio {
  const { pila } = a;
  const spriteDe = (heroe: HeroeJson): Sprite => a.ranas.find((o) => o.heroe === heroe)!.sprite;
  // shortcut: solo en desarrollo, ?reto=gana|pierde enseña la tarjeta final nada más entrar (una vez).
  let finForzado = ATAJOS.reto;

  /** La partida con su heroína, inventario y dificultad (nueva o recuperada), aún sin zona. */
  const crearPartida = (
    heroe: HeroeJson,
    dificultad: DificultadJson,
    luchadora: Luchador,
    inventario: Inventario,
    semilla: number,
  ): Partida => {
    const sprite = spriteDe(heroe);
    const partida: Partida = {
      semilla,
      pila,
      heroina: crearHeroina(heroe, 0, 0), // cada escena la coloca en su sala
      // La misma luchadora en todos los combates: la vida perdida se arrastra.
      luchadora,
      inventario,
      // Copia propia: `vestir` la recolorea y la de la selección se queda con los colores originales.
      sprite: { ...sprite },
      imagenBase: sprite.imagen as HTMLImageElement,
      capas: a.capas,
      hojas: a.hojas,
      combates: 0,
      inicio: performance.now(),
      vencidos: 0,
      zona: '',
      dificultad,
      presagio: null,
      dificultadZona: dificultad,
      bestiario: bestiarioCon(MONSTRUOS, dificultad),
      reglas: reglasCon(REGLAS, dificultad),
      rival: tituloRival(),
      controles: a.controles,
      violetas: 0,
      dragonUsado: false,
      violetasAntes: 0,
      dragonAntes: false,
      mundo: a.mundo,
      reto: null,
      brasas: brasasDe(dificultad),
      vueltas: 0,
      hoguera: null,
    };
    vestir(partida); // con el arma y la armadura que lleve
    sesion.enCurso = true;
    return partida;
  };

  /** Atajos de desarrollo al empezar con la zona ya puesta: un combate o el altar. Dice si ha abierto algo. */
  const abrirAtajo = (partida: Partida, fondo: Parameters<typeof luchar>[2]): boolean => {
    const grupo = ATAJOS.combate.flatMap((c) => (MONSTRUOS[c] ? [MONSTRUOS[c]] : []));
    if (grupo.length > 0) {
      // Con ?presentar y un solo monstruo, antes sale su presentación de jefe (para grabar el vídeo de demo).
      if (grupo.length === 1 && ATAJOS.presentar)
        pila.apilar(
          new EscenaPresentacion(fondo, grupo[0]!.nombre, ritmo.presentacionJefe, () => {
            pila.desapilar();
            luchar(partida, grupo, fondo, () => {});
          }),
        );
      else luchar(partida, grupo, fondo, () => {});
      return true;
    }
    if (ATAJOS.altar) {
      abrirAltar(partida, () => {});
      return true;
    }
    return false;
  };

  const empezar: Inicio['empezar'] = (heroe, dificultad, nombre) => {
    const luchadora = luchadorDeHeroe(heroe);
    luchadora.nombre = nombre;
    luchadora.puntos = ATAJOS.puntos;
    const inventario = inventarioInicial(luchadora, heroe, OBJETOS);
    // ?nivel=N, con la quinta habilidad ganada si N es el máximo: para revisar Habilidades y la pausa.
    if (ATAJOS.nivel > 1) {
      empezarEnNivel(luchadora, ATAJOS.nivel, REGLAS.experiencia);
      if (ATAJOS.nivel >= REGLAS.experiencia.nivelMaximo)
        luchadora.habilidadesGanadas.push(heroe.especiales.habilidad);
    }
    if (ATAJOS.equipo && OBJETOS.equipo[ATAJOS.equipo])
      equipar(luchadora, inventario, OBJETOS, ATAJOS.equipo);
    const partida = crearPartida(heroe, dificultad, luchadora, inventario, a.semilla);
    const zonaInicial = ATAJOS.zona;
    crearZona(partida, zonaInicial, true)
      .then((zona) => {
        pila.cambiar(zona);
        // shortcut: solo en desarrollo, ?hoguera empieza con la de la sala de descanso encendida (la copia de
        // ahora; se ve apagada hasta volver a ella). Con ?combate de algo que gane, sirve para ver la vuelta.
        if (ATAJOS.hoguera)
          partida.hoguera = copiaHoguera(guardado(partida, zonaInicial, zona.estado()));
        if (abrirAtajo(partida, zona.fondoSala)) return;
        guardarAjustes({ pistasVistas: true }); // las pistas, si tocaban, ya van en esta zona
        // La historia se cuenta encima del mapa ya cargado: al pasarla, empieza el fundido de entrada.
        contar(
          pila,
          [
            ...paginas([...historia.inicio, ...heroe.historia.inicio]),
            cartel(zonaInicial),
            ...paginaPresagio(partida),
          ],
          // Después, las 3 habilidades con que se entra en la zona.
          // Lo elegido se guarda ya: si no, se perdía al cerrar en la primera sala.
          () =>
            elegirHabilidades(partida, () =>
              guardarPartida(guardado(partida, zonaInicial, zona.estado())),
            ),
        );
      })
      .catch(mostrarError);
  };

  /** El Bosque corto de reto.json con la semilla de `fecha`, la rana ya en el nivel del reto y sin guardar nada. */
  const empezarReto: Inicio['empezarReto'] = (heroe, fecha, otraVez = false) => {
    const luchadora = luchadorDeHeroe(heroe);
    const inventario = inventarioInicial(luchadora, heroe, OBJETOS);
    empezarEnNivel(luchadora, RETO.nivel, REGLAS.experiencia);
    ajustarEquipadas(luchadora);
    const partida = crearPartida(
      heroe,
      RETO.dificultad,
      luchadora,
      inventario,
      semillaDelDia(fecha),
    );
    sesion.enCurso = false; // el reto dura minutos: cerrar la pestaña no pregunta
    partida.brasas = 0; // ni hoguera
    partida.reto = { fecha, segundos: 0, progreso: () => ({ sala: 1, de: 1 }) };
    sesion.retoEnJuego = partida;
    crearZona(partida, ORDEN.indexOf(RETO.zona as NombreZona), true)
      .then((zona) => {
        pila.cambiar(zona);
        guardarAjustes({ pistasVistas: true }); // las pistas, si tocaban, ya van en esta zona
        if (finForzado) {
          partida.reto!.segundos = 222;
          terminarReto(partida, finForzado === 'gana');
          finForzado = null;
          return;
        }
        const elegir = (): void => elegirHabilidades(partida, () => {});
        if (otraVez) elegir();
        else
          contar(
            pila,
            [
              {
                titulo: 'Reto del día',
                texto: `${fecha.dia}/${fecha.mes}/${fecha.anio}. Llega al Guardián del Bosque.`,
              },
            ],
            elegir,
          );
      })
      .catch(mostrarError);
  };

  /** Una partida a medias (se cerró el navegador): se vuelve a la sala donde se guardó, sin portada. */
  const recuperar: Inicio['recuperar'] = (guardada, vuelta = false) => {
    const heroe = HEROES[guardada.heroe as keyof typeof HEROES];
    const luchadora = luchadorDeHeroe(heroe);
    restaurarHeroina(luchadora, guardada.heroina);
    ajustarEquipadas(luchadora); // las de una partida de antes, o las que ya no conozca
    const partida = crearPartida(
      heroe,
      DIFICULTADES[guardada.dificultad as keyof typeof DIFICULTADES],
      luchadora,
      guardada.inventario,
      guardada.semilla,
    );
    partida.combates = guardada.combates;
    partida.vencidos = guardada.vencidos;
    partida.rival = guardada.rival;
    partida.inicio = performance.now() - guardada.segundos * 1000;
    partida.violetas = guardada.violetasAntes;
    partida.dragonUsado = guardada.dragonAntes;
    // Una partida de antes de la hoguera: las brasas de su dificultad, sin ninguna encendida.
    partida.brasas = guardada.brasas ?? partida.brasas;
    partida.vueltas = guardada.vueltas ?? 0;
    partida.hoguera = guardada.hoguera ?? null;
    crearZona(partida, guardada.zona, vuelta, guardada.mapa)
      .then((zona) => {
        pila.cambiar(zona);
        contar(
          pila,
          [
            vuelta
              ? {
                  titulo: 'Vuelves a la hoguera',
                  texto: `Caíste, pero la hoguera te devuelve a su lado. ${textoBrasas(partida.brasas)}`,
                }
              : guardada.combate
                ? {
                    titulo: 'Combate interrumpido',
                    texto:
                      'El juego se cerró en mitad de un combate: vuelves a empezarlo con la vida que tenías.',
                  }
                : {
                    titulo: 'Partida recuperada',
                    texto: `${luchadora.nombre}, nivel ${luchadora.nivel}, en ${partida.zona}. Sigues donde lo dejaste.`,
                  },
            // El combate final se lucha sin presagio: no tiene sentido recordárselo.
            ...(guardada.combate?.tipo === 'final' ? [] : paginaPresagio(partida)),
          ],
          () => {
            const reanudar = (): void => {
              if (guardada.combate) zona.reanudarCombate(guardada.combate);
            };
            // Una partida de antes de las habilidades equipadas: que las elija antes de seguir.
            if (eligeAlRecuperar(guardada.heroina))
              elegirHabilidades(partida, () => {
                // Con lo elegido y el mismo combate pendiente: recuperar otra vez no vuelve a preguntar.
                guardarPartida(guardado(partida, guardada.zona, zona.estado(), guardada.combate));
                reanudar();
              });
            else reanudar();
          },
        );
      })
      .catch(mostrarError);
  };

  sesion.reiniciarReto = (heroe, fecha) => empezarReto(heroe, fecha, true);
  sesion.volverAHoguera = (guardada) => recuperar(guardada, true);
  return { empezar, empezarReto, recuperar };
}
