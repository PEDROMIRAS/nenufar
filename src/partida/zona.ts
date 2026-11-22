// Crear la escena del mapa de cada zona (o la del reto del día) con todo lo que necesita de la partida.
import { crearAzar } from '../core/azar';
import { type Resultado } from '../core/combate';
import { type EstadoMapa } from '../core/guardado';
import { progresoReto } from '../core/reto';
import RETO from '../data/reto.json';
import JUGADORA from '../data/jugadora.json';
import { elegirDia } from '../core/diaJusto';
import { gruposDeZona } from '../core/montaje';
import { crearCatalogo, type Tile } from '../core/sala';
import type { MonstruoJson } from '../core/types';
import { cofreCon, elegirPresagio, presagioUtil } from '../core/presagios';
import { jefeVioleta, modoVioleta } from '../core/violetas';
import { reglasDesafio } from '../core/eventos';
import { generarZona, type Zona } from '../core/zona';
import controles from '../data/controles.json';
import { EVENTOS, HD2D, HEROES, OBJETOS, PRESAGIOS, REGLAS } from '../data/datos';
import historia from '../data/historia.json';
import zonas from '../data/zonas.json';
import { EscenaEquipo } from '../escenas/equipo';
import { EscenaMapa } from '../escenas/mapa';
import { EscenaPausa } from '../escenas/pausa';
import { EscenaPuntos } from '../escenas/puntos';
import { dispositivo } from '../input/dispositivo';
import { cargarAjustes, guardarPartida } from '../render/almacen';
import { cargarTilesets } from '../render/recursos';
import {
  type NombreZona,
  ORDEN,
  PLANTILLAS,
  type Partida,
  guardado,
  aspecto,
  monstruo,
  mostrarError,
} from './partida';
import { contar, elegirHabilidades, paginaPresagio, cartel } from './relato';
import {
  fijarPresagio,
  abrirAltar,
  abrirErmitano,
  empezarEnEvento,
  abrirDesafio,
  probabilidadEvento,
  probabilidadDesafio,
  probabilidadErmitano,
  presagioForzado,
  abrirMercader,
  probabilidadMercader,
} from './eventos';
import { lucharJefe, lucharVioleta, vestir, datosEquipo, ofrecerEquipo, luchar } from './combates';
import { empezarOtra, volverAPortada, terminarReto, terminarPartida } from './fin';

/** Carga la zona `indice` y crea su escena; su portal carga la siguiente y la pone en su lugar. */
export async function crearZona(
  partida: Partida,
  indice: number,
  entrarDesdeNegro: boolean,
  /** Estado de la zona en una partida recuperada. */
  recuperado: EstadoMapa | null = null,
): Promise<EscenaMapa> {
  const nombre = ORDEN[indice];
  if (!nombre) throw new Error(`No hay zona número ${indice}`);
  const { tilesets, imagenes } = await cargarTilesets(nombre);
  const datos = zonas.zonas[nombre];
  const reto = partida.reto;
  // Cada zona con su propia semilla, derivada de la de la partida. El reto: la zona corta, con la semilla del día
  // tal cual y sin sala violeta, trampa, eventos ni presagio (como la juega el simulador).
  const catalogo = crearCatalogo(tilesets);
  const zona = reto
    ? diaDelReto(partida, datos, catalogo)
    : generarZona(
        {
          ...zonas.generacion,
          salas: datos.salas,
          violeta: modoVioleta(indice, ORDEN.length, partida.violetas),
          probabilidadVioleta: zonas.violetas.probabilidad,
          probabilidadTrampa: zonas.violetas.probabilidadTrampa,
          probabilidadEvento: probabilidadEvento(),
          probabilidadDesafio: probabilidadDesafio(),
          probabilidadErmitano: probabilidadErmitano(),
          probabilidadMercader: probabilidadMercader(),
        },
        partida.semilla + indice * 7919,
      );
  console.info(`Zona ${nombre}, semilla ${zona.semilla}`);
  const clavePresagio = reto
    ? null
    : (presagioForzado() ??
      elegirPresagio(PRESAGIOS, zona.semilla, (p) =>
        presagioUtil(p, datos.cofre, OBJETOS.armaduras.length),
      ));
  fijarPresagio(partida, clavePresagio ? PRESAGIOS.lista[clavePresagio]! : null);
  const presagio = partida.presagio;
  // Lo que se guarda es lo de antes de crear la zona: al recuperarla se vuelve a crear igual.
  partida.violetasAntes = partida.violetas;
  partida.dragonAntes = partida.dragonUsado;
  // El jefe de la sala violeta, si la hay: a veces el dragón negro, como mucho uno por partida.
  let violeta: MonstruoJson | null = null;
  if (zona.salas.some((s) => s.tipo === 'violeta')) {
    const clave = jefeVioleta(
      nombre,
      datos,
      zonas.violetas,
      partida.dragonUsado,
      crearAzar(zona.semilla * 13 + 5),
    );
    partida.violetas++;
    if (clave === zonas.violetas.dragon[nombre]) partida.dragonUsado = true;
    violeta = monstruo(clave);
  }
  partida.zona = datos.nombre;
  // El relieve de los monstruos de la zona, ya: si no, se calculaba al entrar en la sala donde sale cada uno y la
  // imagen se paraba (en un móvil medio, ~235 ms).
  const deLaZona = new Set<string>([
    ...datos.grupos.flatMap((g) => g.monstruos.map((c) => monstruo(c).sprite)),
    monstruo(datos.jefe).sprite,
    monstruo(datos.cofreTrampa).sprite,
    EVENTOS.ermitano.sprite,
    ...(violeta ? [violeta.sprite] : []),
  ]);
  partida.mundo.prepararRelieve(
    [...deLaZona].flatMap((clave) => {
      const hoja = partida.hojas.get(clave);
      return hoja ? [hoja] : [];
    }),
  );
  const hayOtra = indice + 1 < ORDEN.length;
  const escena: EscenaMapa = new EscenaMapa({
    zona,
    mundo: partida.mundo,
    aspecto: aspecto(nombre),
    fuente: HD2D.fuente,
    plantillas: PLANTILLAS[nombre],
    catalogo,
    imagenes,
    tam: tilesets[0]?.tileSize ?? 32,
    heroina: partida.heroina,
    sprite: partida.sprite,
    musica: nombre,
    spritesMonstruos: partida.hojas,
    duracionFundido: zonas.transicionSalas,
    rejilla: zonas.generacion.rejilla,
    // El portal de la última zona lleva al jefe final; vencerlo es ganar la partida. En el reto no hay portal que
    // usar: vencer al Guardián lo acaba.
    alUsarPortal: reto
      ? () => {}
      : hayOtra
        ? () => {
            crearZona(partida, indice + 1, true)
              .then((siguiente) => {
                partida.pila.cambiar(siguiente);
                // Tras el cartel (y el presagio), las habilidades con que se entra en la zona.
                contar(partida.pila, [cartel(indice + 1), ...paginaPresagio(partida)], () =>
                  elegirHabilidades(partida, () => {}),
                );
              })
              .catch(mostrarError);
          }
        : () => {
            guardarPartida(guardado(partida, indice, escena.estado(), { tipo: 'final' }));
            fijarPresagio(partida, null); // el jefe final se lucha sin presagio
            // Antes del Rey, la última ocasión de cambiar las habilidades (también al recuperar con el combate final).
            elegirHabilidades(partida, () =>
              lucharJefe(
                partida,
                { ...monstruo(zonas.jefeFinal), nombre: partida.rival },
                historia.jefeFinal,
                escena.fondoSala,
                () => terminarPartida(partida, true),
              ),
            );
          },
    entrarDesdeNegro,
    recuperado: recuperado ?? (reto ? null : empezarEnEvento(zona)),
    // El reto no se guarda: si se cierra, se pierde (y la portada vuelve a salir al abrir).
    alEntrarEnSala: (estado) => {
      if (!reto) guardarPartida(guardado(partida, indice, estado));
    },
    grupos: datos.grupos.map(({ monstruos, peso }) => ({
      peso,
      monstruos: monstruos.map(monstruo),
    })),
    gruposPorSala: reto ? RETO.gruposPorSala : zonas.monstruos.gruposPorSala,
    gruposExtra: presagio?.gruposExtra ?? 0,
    modoFuente: presagio?.fuente ?? 'todo',
    presagio: presagio?.nombre ?? null,
    jefe: monstruo(datos.jefe),
    jefeVioleta: violeta,
    cofreTrampa: monstruo(datos.cofreTrampa),
    cofre: cofreCon(datos.cofre, presagio, OBJETOS.armaduras.length),
    inventario: partida.inventario,
    objetos: OBJETOS,
    usarAltar: (alTerminar) => abrirAltar(partida, alTerminar),
    desafio: EVENTOS.desafio,
    usarDesafio: (alTerminar) => abrirDesafio(partida, alTerminar),
    ermitano: EVENTOS.ermitano,
    usarErmitano: (azar, alTerminar) => abrirErmitano(partida, nombre, azar, alTerminar),
    usarMercader: (alTerminar) => abrirMercader(partida, alTerminar),
    ofrecerEquipo: (clave, alFinal) => ofrecerEquipo(partida, [clave], alFinal),
    elegirHabilidades: (alCerrar) => elegirHabilidades(partida, alCerrar),
    abrirPausa: () => {
      const pausa: EscenaPausa = new EscenaPausa(
        partida.luchadora,
        partida.sprite,
        partida.inventario,
        OBJETOS,
        REGLAS.experiencia,
        REGLAS.estados,
        partida.presagio,
        partida.controles,
        () =>
          partida.pila.apilar(
            new EscenaEquipo(datosEquipo(partida), { tipo: 'cambiar' }, () => {
              partida.pila.desapilar();
              vestir(partida);
              pausa.refrescar();
            }),
          ),
        () =>
          partida.pila.apilar(
            new EscenaPuntos(partida.luchadora, partida.reglas, 'Volver', () => {
              partida.pila.desapilar();
              pausa.refrescar();
            }),
          ),
        () => partida.pila.desapilar(),
        reto ? volverAPortada : empezarOtra,
      );
      partida.pila.apilar(pausa);
    },
    distanciaMonstruos: zonas.monstruos.distanciaEntradas,
    invulnerabilidad: REGLAS.invulnerabilidadTrasCombate,
    luchadora: partida.luchadora,
    nombreZona: datos.nombre,
    lluviaTrasJefe: historia.zonas[nombre].jefe.lluvia,
    // Las pistas de controles, solo en la primera zona de la primera partida.
    pistas:
      indice === 0 && !recuperado && !cargarAjustes().pistasVistas
        ? controles.pistas[dispositivo()]
        : [],
    segundosPista: controles.pistas.segundos,
    iniciarCombate: (grupo, alTerminarMapa, quien, combate) => {
      // Se guarda al empezar, con el combate: si se cierra a mitad, al volver se repite desde el
      // principio (cerrar no salva de un combate). Al acabarlo (ganado o huyendo) se guarda tal cual,
      // para que tampoco se pueda repetir uno ya ganado.
      if (reto) {
        // En el reto, vencer al Guardián lo acaba (tras su frase y la subida de nivel, si la hay).
        const jefe = grupo[0];
        if (jefe?.jefe)
          lucharJefe(partida, jefe, historia.zonas[nombre].jefe, escena.fondoSala, (resultado) =>
            resultado === 'victoria' ? terminarReto(partida, true) : alTerminarMapa(resultado),
          );
        else luchar(partida, grupo, escena.fondoSala, alTerminarMapa, quien);
        return;
      }
      guardarPartida(guardado(partida, indice, escena.estado(), combate));
      const alTerminar = (resultado: Resultado): void => {
        alTerminarMapa(resultado);
        // En una cadena del desafío, lo pendiente (el siguiente combate o el premio) va en el guardado.
        guardarPartida(guardado(partida, indice, escena.estado(), escena.combatePendiente()));
      };
      const jefe = grupo[0];
      if (jefe?.jefe && jefe.oculto) lucharVioleta(partida, jefe, escena.fondoSala, alTerminar);
      else if (jefe?.jefe)
        lucharJefe(partida, jefe, historia.zonas[nombre].jefe, escena.fondoSala, alTerminar);
      else {
        // En el desafío solo el último combate devuelve vida: los anteriores se luchan sin recuperación.
        const sinRecuperar =
          combate.tipo === 'desafio' && combate.paso + 1 < EVENTOS.desafio.combates;
        const reglas = sinRecuperar ? reglasDesafio(partida.reglas) : partida.reglas;
        luchar(partida, grupo, escena.fondoSala, alTerminar, quien, null, reglas);
      }
    },
  });
  if (reto) {
    // Las salas de combate donde no cupo ningún grupo no cuentan en «sala N de M» (se montan igual que en el mapa).
    const grupos = gruposDeZona(
      zona,
      PLANTILLAS[nombre],
      catalogo,
      RETO.gruposPorSala,
      zonas.monstruos.distanciaEntradas,
      datos.grupos,
    );
    const vacias = new Set([...grupos].filter(([, g]) => g.length === 0).map(([s]) => s));
    reto.progreso = () => progresoReto(zona.salas, escena.estado().visitadas, vacias);
  }
  return escena;
}

/**
 * La zona del reto del día: la de la semilla de la fecha si es justa para todas las ranas (la jugadora simulada la
 * juega antes); si no, la siguiente. Es determinista: el mismo día para todo el mundo. Fija la semilla de la partida
 * a la de la zona elegida (los combates sacan su azar de ella).
 */
export function diaDelReto(
  partida: Partida,
  datos: (typeof zonas.zonas)[NombreZona],
  catalogo: ReadonlyMap<string, Tile>,
): Zona {
  const nombre = RETO.zona as NombreZona;
  const inicio = performance.now();
  const zona = elegirDia(
    partida.semilla,
    (s) => generarZona({ ...zonas.generacion, salas: RETO.salas, tesoros: RETO.tesoros }, s),
    (z) =>
      new Map(
        [
          ...gruposDeZona(
            z,
            PLANTILLAS[nombre],
            catalogo,
            RETO.gruposPorSala,
            zonas.monstruos.distanciaEntradas,
            datos.grupos,
          ),
        ].map(([sala, grupos]) => [sala, grupos.map((g) => g.monstruos)]),
      ),
    {
      heroes: Object.values(HEROES),
      nivel: RETO.nivel,
      cofre: datos.cofre,
      jefe: datos.jefe,
      mundo: {
        bestiario: partida.bestiario,
        reglas: partida.reglas,
        objetos: OBJETOS,
        experiencia: REGLAS.experiencia,
        politica: JUGADORA,
      },
      comprobacion: RETO.comprobacion,
    },
  );
  partida.semilla = zona.semilla;
  console.info(
    `Reto del día: semilla ${zona.semilla}, comprobada en ${Math.round(performance.now() - inicio)} ms`,
  );
  return zona;
}
