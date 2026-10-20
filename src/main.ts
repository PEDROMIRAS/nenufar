import { crearAcciones } from './core/acciones';
import { crearAzar } from './core/azar';
import {
  crearCombate,
  luchadorDeHeroe,
  luchadoresDeGrupo,
  type Luchador,
  type Resultado,
} from './core/combate';
import { crearHeroina, type Heroina } from './core/heroina';
import { crearInventario, type Inventario } from './core/inventario';
import { cambiosDeNivel, instantanea } from './core/progresion';
import { actualizarRecords, formatearTiempo, type Resumen } from './core/records';
import { crearCatalogo } from './core/sala';
import type { MonstruoJson, PlantillasJson } from './core/types';
import { generarZona } from './core/zona';
import controles from './data/controles.json';
import { HEROES, MONSTRUOS, OBJETOS, REGLAS } from './data/datos';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import plantillasCripta from './data/salas/plantillas_cripta.json';
import plantillasRuinas from './data/salas/plantillas_ruinas.json';
import zonas from './data/zonas.json';
import { EscenaCombate } from './escenas/combate';
import { EscenaEquipo } from './escenas/equipo';
import { EscenaMensaje } from './escenas/mensaje';
import { EscenaMapa } from './escenas/mapa';
import { PilaEscenas } from './escenas/pila';
import { EscenaPausa } from './escenas/pausa';
import { EscenaSeleccion } from './escenas/seleccion';
import { EscenaTitulo } from './escenas/titulo';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { crearToque } from './input/toque';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';
import { prepararSonido } from './render/sonido';
import { cargarRecords, guardarRecords } from './render/almacen';
import { cargarSprite, cargarSprites, cargarTilesets, type Sprite } from './render/recursos';

type NombreZona = keyof typeof zonas.zonas;
/** Orden de las zonas: el de zonas.json. */
const ORDEN = Object.keys(zonas.zonas) as NombreZona[];
const PLANTILLAS: Record<NombreZona, PlantillasJson> = {
  bosque: plantillasBosque,
  ruinas: plantillasRuinas,
  cripta: plantillasCripta,
};

/** Lo que comparten todas las zonas de una partida. */
interface Partida {
  semilla: number;
  pila: PilaEscenas;
  heroina: Heroina;
  luchadora: Luchador;
  inventario: Inventario;
  sprite: Sprite;
  /** Hojas de monstruos, efectos y proyectiles, por nombre. */
  hojas: ReadonlyMap<string, Sprite>;
  combates: number;
  /** Para el resumen final: cuándo empezó (ms), monstruos vencidos y zona en la que está. */
  inicio: number;
  vencidos: number;
  zona: string;
}

async function iniciar(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#juego');
  if (!canvas) throw new Error('Falta el canvas #juego');
  const ctx = prepararPantalla(canvas);
  prepararSonido();

  // ?semilla=N repite una partida; sin ella, cada carga es distinta.
  const pedida = Number(new URLSearchParams(location.search).get('semilla'));
  const semilla =
    Number.isInteger(pedida) && pedida > 0 ? pedida : Math.floor(Math.random() * 2 ** 31);
  console.info('Semilla de la partida:', semilla);

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  const fuentes = [
    crearTeclado(),
    crearJoystick(document.body, controles.joystick),
    crearToque(canvas),
  ];
  const acciones = crearAcciones();
  const pila = new PilaEscenas();
  const opciones = await Promise.all(
    Object.values(HEROES).map(async (heroe) => ({
      heroe,
      sprite: await cargarSprite(heroe.sprite),
    })),
  );
  const hojas = await cargarSprites([
    ...Object.values(MONSTRUOS).map((m) => m.sprite),
    ...Object.values(HEROES).flatMap((h) => (h.combate.proyectil ? [h.combate.proyectil] : [])),
    'efectos',
  ]);
  const seleccion = new EscenaSeleccion(opciones, ({ heroe, sprite }) => {
    const partida: Partida = {
      semilla,
      pila,
      heroina: crearHeroina(heroe, 0, 0), // cada escena la coloca en su sala de inicio
      // La misma luchadora en todos los combates: la vida perdida se arrastra.
      luchadora: luchadorDeHeroe(heroe),
      inventario: crearInventario(),
      sprite,
      hojas,
      combates: 0,
      inicio: performance.now(),
      vencidos: 0,
      zona: '',
    };
    crearZona(partida, 0, true)
      .then((zona) => pila.cambiar(zona))
      .catch(mostrarError);
  });
  pila.apilar(new EscenaTitulo(cargarRecords(), () => pila.cambiar(seleccion)));

  iniciarBucle(
    (dt) => {
      leerFuentes(fuentes, acciones);
      pila.update(dt, acciones);
    },
    (alpha) => pila.draw(ctx, alpha),
  );
}

/** Carga la zona `indice` y crea su escena; su portal carga la siguiente y la pone en su lugar. */
async function crearZona(
  partida: Partida,
  indice: number,
  entrarDesdeNegro: boolean,
): Promise<EscenaMapa> {
  const nombre = ORDEN[indice];
  if (!nombre) throw new Error(`No hay zona número ${indice}`);
  const { tilesets, imagenes } = await cargarTilesets(nombre);
  const datos = zonas.zonas[nombre];
  // Cada zona con su propia semilla, derivada de la de la partida.
  const zona = generarZona(
    { ...zonas.generacion, salas: datos.salas },
    partida.semilla + indice * 7919,
  );
  console.info(`Zona ${nombre}, semilla ${zona.semilla}`);
  partida.zona = datos.nombre;
  const hayOtra = indice + 1 < ORDEN.length;
  const escena: EscenaMapa = new EscenaMapa({
    zona,
    plantillas: PLANTILLAS[nombre],
    catalogo: crearCatalogo(tilesets),
    imagenes,
    tam: tilesets[0]?.tileSize ?? 32,
    heroina: partida.heroina,
    sprite: partida.sprite,
    musica: nombre,
    spritesMonstruos: partida.hojas,
    duracionFundido: zonas.transicionSalas,
    rejilla: zonas.generacion.rejilla,
    // El portal de la última zona lleva al jefe final; vencerlo es ganar la partida.
    alUsarPortal: hayOtra
      ? () => {
          crearZona(partida, indice + 1, true)
            .then((siguiente) => partida.pila.cambiar(siguiente))
            .catch(mostrarError);
        }
      : () =>
          luchar(partida, [monstruo(zonas.jefeFinal)], escena.fondoSala, () =>
            terminarPartida(partida, true),
          ),
    entrarDesdeNegro,
    grupos: datos.grupos.map(({ monstruos, peso }) => ({
      peso,
      monstruos: monstruos.map(monstruo),
    })),
    gruposPorSala: zonas.monstruos.gruposPorSala,
    jefe: monstruo(datos.jefe),
    cofre: datos.cofre,
    inventario: partida.inventario,
    objetos: OBJETOS,
    ofrecerEquipo: (clave, alFinal) => ofrecerEquipo(partida, [clave], alFinal),
    abrirPausa: () =>
      partida.pila.apilar(
        new EscenaPausa(
          partida.luchadora,
          partida.sprite,
          partida.inventario,
          OBJETOS,
          REGLAS.experiencia,
          REGLAS.estados,
          () => partida.pila.desapilar(),
          empezarOtra,
        ),
      ),
    distanciaMonstruos: zonas.monstruos.distanciaEntradas,
    invulnerabilidad: REGLAS.invulnerabilidadTrasCombate,
    luchadora: partida.luchadora,
    nombreZona: datos.nombre,
    iniciarCombate: (grupo, alTerminar, quien) =>
      luchar(partida, grupo, escena.fondoSala, alTerminar, quien),
  });
  return escena;
}

function monstruo(clave: string): MonstruoJson {
  const m = MONSTRUOS[clave];
  if (!m) throw new Error(`Monstruo desconocido en zonas.json: ${clave}`);
  return m;
}

/** Enseña, una tras otra, las piezas de equipo encontradas para decidir si se cambian; después sigue. */
function ofrecerEquipo(partida: Partida, piezas: readonly string[], alFinal: () => void): void {
  const [primera, ...resto] = piezas;
  if (!primera) {
    alFinal();
    return;
  }
  partida.pila.apilar(
    new EscenaEquipo(
      partida.luchadora,
      partida.inventario,
      OBJETOS,
      REGLAS.estados,
      primera,
      () => {
        partida.pila.desapilar();
        ofrecerEquipo(partida, resto, alFinal);
      },
    ),
  );
}

const VOLVER_AL_TITULO = 'Pulsa o toca para volver al título';

/** Vuelve al título para empezar otra partida con un mapa nuevo (sin la semilla de la URL). */
const empezarOtra = (): void => location.assign(location.pathname);

/** Fin de la partida: guarda los récords y enseña el resumen. */
function terminarPartida(partida: Partida, victoria: boolean): void {
  const l = partida.luchadora;
  const resumen: Resumen = {
    victoria,
    heroina: l.nombre,
    nivel: l.nivel,
    zona: partida.zona,
    vencidos: partida.vencidos,
    segundos: (performance.now() - partida.inicio) / 1000,
  };
  guardarRecords(actualizarRecords(cargarRecords(), resumen));
  const lineas = [
    `${resumen.heroina}, nivel ${resumen.nivel}`,
    victoria ? 'Has derrotado al Señor de la Cripta' : `Caíste en: ${resumen.zona}`,
    `Monstruos vencidos: ${resumen.vencidos}`,
    `Tiempo: ${formatearTiempo(resumen.segundos)}`,
  ];
  partida.pila.cambiar(
    victoria
      ? new EscenaMensaje('¡Victoria!', '#ffd27a', lineas, VOLVER_AL_TITULO, empezarOtra)
      : new EscenaMensaje('Fin de la partida', '#d8584a', lineas, VOLVER_AL_TITULO, empezarOtra),
  );
}

/** Apila un combate contra `grupo`; al acabar lo quita y avisa, salvo derrota (fin de la partida). */
function luchar(
  partida: Partida,
  grupo: MonstruoJson[],
  /** Sala en la que empieza el combate, que se ve de fondo. */
  fondo: HTMLCanvasElement,
  alTerminar: (resultado: Resultado) => void,
  iniciativa: 'heroina' | 'monstruos' | null = null,
): void {
  const { pila, luchadora } = partida;
  const antes = instantanea(luchadora);
  const azar = crearAzar(partida.semilla * 31 + ++partida.combates);
  const combate = crearCombate(luchadora, luchadoresDeGrupo(grupo), REGLAS, azar, MONSTRUOS);
  combate.iniciativa = iniciativa;
  combate.inventario = partida.inventario;
  combate.objetos = OBJETOS;
  pila.apilar(
    new EscenaCombate(combate, partida.sprite, partida.hojas, fondo, (resultado) => {
      pila.desapilar();
      if (resultado === 'victoria') partida.vencidos += combate.enemigos.length;
      if (resultado !== 'derrota') {
        const seguir = (): void =>
          ofrecerEquipo(partida, combate.equipoEncontrado, () => alTerminar(resultado));
        if (luchadora.nivel > antes.nivel) {
          // Primero la subida de nivel, luego el equipo encontrado, y de vuelta al mapa.
          pila.apilar(
            new EscenaMensaje(
              `¡Nivel ${luchadora.nivel}!`,
              '#ffd27a',
              cambiosDeNivel(antes, luchadora),
              'Pulsa o toca para seguir',
              () => {
                pila.desapilar();
                seguir();
              },
            ),
          );
        } else {
          seguir();
        }
      } else {
        terminarPartida(partida, false);
      }
    }),
  );
}

function mostrarError(error: unknown): void {
  // Sin esto, en un móvil un fallo de carga es solo una pantalla negra.
  document.body.style.color = '#fff';
  document.body.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
}

iniciar().catch(mostrarError);
