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
import { coloresDeEquipo } from './core/equipo';
import { crearInventario, type Inventario } from './core/inventario';
import { limpiarNombre } from './core/nombre';
import { cambiosDeNivel, instantanea } from './core/progresion';
import { actualizarRecords, esNuevoRecord, formatearTiempo, type Resumen } from './core/records';
import { crearCatalogo } from './core/sala';
import { bestiarioCon, monstruoCon, reglasCon } from './core/dificultad';
import type {
  DificultadJson,
  HeroeJson,
  MonstruoJson,
  PlantillasJson,
  ReglasCombate,
} from './core/types';
import { generarZona } from './core/zona';
import controles from './data/controles.json';
import { DIFICULTADES, HEROES, MONSTRUOS, OBJETOS, REGLAS } from './data/datos';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import plantillasCripta from './data/salas/plantillas_cripta.json';
import plantillasRuinas from './data/salas/plantillas_ruinas.json';
import historia from './data/historia.json';
import ritmo from './data/ritmo.json';
import zonas from './data/zonas.json';
import { EscenaCombate } from './escenas/combate';
import { EscenaDificultad } from './escenas/dificultad';
import { EscenaNombre } from './escenas/nombre';
import { EscenaEquipo, type DatosEquipo } from './escenas/equipo';
import { EscenaMensaje } from './escenas/mensaje';
import { EscenaMapa } from './escenas/mapa';
import { PilaEscenas } from './escenas/pila';
import { EscenaPausa } from './escenas/pausa';
import { EscenaPresentacion } from './escenas/presentacion';
import { EscenaPuntos } from './escenas/puntos';
import { EscenaSeleccion } from './escenas/seleccion';
import { EscenaTitulo } from './escenas/titulo';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { crearToque } from './input/toque';
import { iniciarBucle } from './render/bucle';
import { esTactil, prepararPantalla } from './render/pantalla';
import { crearCasilla, crearDeslizador, type Casilla, type Deslizador } from './render/deslizador';
import { crearCampoNombre } from './render/campoNombre';
import { LARGO_NOMBRE, RECT_CAMPO } from './render/nombre';
import { RECT_MUSICA, RECT_SONIDO } from './render/pausa';
import { prepararSonido } from './render/sonido';
import { recolorear } from './render/tinte';
import { cargarAjustes, cargarRecords, guardarAjustes, guardarRecords } from './render/almacen';
import {
  cargarImagen,
  cargarSprite,
  cargarSprites,
  cargarTilesets,
  type Sprite,
} from './render/recursos';

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
  /** La heroína: su hoja cambia de colores con el equipo (ver `vestir`); `imagenBase` es la original. */
  sprite: Sprite;
  imagenBase: HTMLImageElement;
  /** Hojas de monstruos, efectos y proyectiles, por nombre. */
  hojas: ReadonlyMap<string, Sprite>;
  combates: number;
  /** Para el resumen final: cuándo empezó (ms), monstruos vencidos y zona en la que está. */
  inicio: number;
  vencidos: number;
  zona: string;
  /** Dificultad elegida, y monstruos y reglas de combate con ella ya aplicada. */
  dificultad: DificultadJson;
  bestiario: Record<string, MonstruoJson>;
  reglas: ReglasCombate;
  /** Volumen de la música y sonido sí o no en el inventario (controles HTML, uno por partida). */
  controles: { musica: Deslizador; sonido: Casilla };
  /** Nombre del jefe final: lleva el de la última heroína que lo venció, si la hubo. */
  rival: string;
}

/** Una pantalla de la historia. */
interface Pagina {
  titulo: string;
  texto: string;
}

const COLOR_HISTORIA = '#c9b6ff';
const SEGUIR = 'Pulsa o toca para seguir';

/** Apila las páginas de la historia una tras otra encima de lo que haya; al pasar la última, sigue. */
function contar(pila: PilaEscenas, paginas: readonly Pagina[], alFinal: () => void): void {
  const [primera, ...resto] = paginas;
  if (!primera) {
    alFinal();
    return;
  }
  pila.apilar(
    new EscenaMensaje(primera.titulo, COLOR_HISTORIA, [primera.texto], SEGUIR, () => {
      pila.desapilar();
      contar(pila, resto, alFinal);
    }),
  );
}

/** Páginas sin título, una por texto. */
const paginas = (textos: readonly string[]): Pagina[] =>
  textos.map((texto) => ({ titulo: '', texto }));

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
  // Elegir rana → ponerle nombre → dificultad; Escape vuelve al paso anterior.
  const campoNombre = crearCampoNombre(canvas, RECT_CAMPO, LARGO_NOMBRE);
  const sonidoHtml = {
    musica: crearDeslizador(canvas, RECT_MUSICA, 'Volumen de la música'),
    sonido: crearCasilla(canvas, RECT_SONIDO, 'Sonido'),
  };
  const seleccion: EscenaSeleccion = new EscenaSeleccion(opciones, ({ heroe, sprite }) => {
    const pedirNombre: EscenaNombre = new EscenaNombre(
      heroe,
      sprite,
      campoNombre,
      (nombre) =>
        pila.cambiar(
          new EscenaDificultad(
            Object.values(DIFICULTADES),
            nombre === heroe.nombre
              ? `Con la ${heroe.nombre}`
              : `Con ${nombre}, la ${heroe.nombre.toLowerCase()}`,
            (dificultad) => empezar(heroe, sprite, dificultad, nombre),
            () => pila.cambiar(pedirNombre),
          ),
        ),
      () => pila.cambiar(seleccion),
    );
    pila.cambiar(pedirNombre);
  });
  /** Crea la partida con la heroína, su nombre y la dificultad elegidas y carga la primera zona. */
  const empezar = (
    heroe: HeroeJson,
    sprite: Sprite,
    dificultad: DificultadJson,
    nombre: string,
  ): void => {
    const luchadora = luchadorDeHeroe(heroe);
    luchadora.nombre = nombre;
    const partida: Partida = {
      semilla,
      pila,
      heroina: crearHeroina(heroe, 0, 0), // cada escena la coloca en su sala de inicio
      // La misma luchadora en todos los combates: la vida perdida se arrastra.
      luchadora,
      inventario: crearInventario(),
      sprite,
      imagenBase: sprite.imagen as HTMLImageElement, // recién cargada: aún es la original
      hojas,
      combates: 0,
      inicio: performance.now(),
      vencidos: 0,
      zona: '',
      dificultad,
      bestiario: bestiarioCon(MONSTRUOS, dificultad),
      reglas: reglasCon(REGLAS, dificultad),
      rival: tituloRival(),
      controles: sonidoHtml,
    };
    crearZona(partida, 0, true)
      .then((zona) => {
        pila.cambiar(zona);
        guardarAjustes({ pistasVistas: true }); // las pistas, si tocaban, ya van en esta zona
        // La historia se cuenta encima del mapa ya cargado: al pasarla, empieza el fundido de entrada.
        contar(
          pila,
          [...paginas([...historia.inicio, ...heroe.historia.inicio]), cartel(0)],
          () => {},
        );
      })
      .catch(mostrarError);
  };
  const [ronin, maga] = opciones.map((o) => o.sprite);
  pila.apilar(
    new EscenaTitulo(
      cargarRecords(),
      Object.entries(DIFICULTADES).map(([clave, d]) => [clave, d.nombre]),
      {
        fondo: await cargarImagen('assets/portada.png'),
        ronin: ronin!,
        maga: maga!,
        limo: hojas.get('monstruos/limo'),
        murcielago: hojas.get('monstruos/murcielago'),
      },
      () => pila.cambiar(seleccion),
    ),
  );

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
            .then((siguiente) => {
              partida.pila.cambiar(siguiente);
              contar(partida.pila, [cartel(indice + 1)], () => {});
            })
            .catch(mostrarError);
        }
      : () =>
          lucharJefe(
            partida,
            { ...monstruo(zonas.jefeFinal), nombre: partida.rival },
            historia.jefeFinal,
            escena.fondoSala,
            () => terminarPartida(partida, true),
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
    abrirPausa: () => {
      const pausa: EscenaPausa = new EscenaPausa(
        partida.luchadora,
        partida.sprite,
        partida.inventario,
        OBJETOS,
        REGLAS.experiencia,
        REGLAS.estados,
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
        empezarOtra,
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
      indice === 0 && !cargarAjustes().pistasVistas
        ? controles.pistas[esTactil() ? 'tactil' : 'teclado']
        : [],
    segundosPista: controles.pistas.segundos,
    iniciarCombate: (grupo, alTerminar, quien) =>
      grupo[0]?.jefe
        ? lucharJefe(partida, grupo[0], historia.zonas[nombre].jefe, escena.fondoSala, alTerminar)
        : luchar(partida, grupo, escena.fondoSala, alTerminar, quien),
  });
  return escena;
}

/** Cartel de la zona `indice` al entrar: su nombre largo y una o dos líneas. */
function cartel(indice: number): Pagina {
  const zona = historia.zonas[ORDEN[indice] ?? 'bosque'];
  return { titulo: zona.nombre, texto: zona.cartel };
}

/** Nombre del jefe final de esta partida, con el de la última heroína que lo venció si la hubo. */
function tituloRival(): string {
  const senora = limpiarNombre(cargarAjustes().senora, '', LARGO_NOMBRE);
  return senora
    ? historia.jefeFinal.heredado.replace('{nombre}', senora)
    : monstruo(zonas.jefeFinal).nombre;
}

/** Combate contra un jefe, con su frase antes de empezar y otra al caer. */
function lucharJefe(
  partida: Partida,
  jefe: MonstruoJson,
  frases: { inicio: string; caida: string },
  fondo: HTMLCanvasElement,
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

function monstruo(clave: string): MonstruoJson {
  const m = MONSTRUOS[clave];
  if (!m) throw new Error(`Monstruo desconocido en zonas.json: ${clave}`);
  return m;
}

/** Recolorea la hoja de la heroína según el arma y la armadura que lleva. */
function vestir(partida: Partida): void {
  const heroe = partida.luchadora.heroe;
  if (!heroe) return;
  partida.sprite.imagen = recolorear(
    partida.imagenBase,
    coloresDeEquipo(heroe, partida.inventario, OBJETOS),
  );
}

/** Lo que necesita la pantalla de Equipo de la partida. */
function datosEquipo(partida: Partida): DatosEquipo {
  return {
    luchadora: partida.luchadora,
    inventario: partida.inventario,
    objetos: OBJETOS,
    estados: REGLAS.estados,
    sprite: partida.sprite,
    imagenBase: partida.imagenBase,
  };
}

/** Enseña, una tras otra, las piezas de equipo encontradas para decidir si se cambian; después sigue. */
function ofrecerEquipo(partida: Partida, piezas: readonly string[], alFinal: () => void): void {
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
    dificultad: Object.entries(DIFICULTADES).find(([, d]) => d === partida.dificultad)?.[0] ?? '',
  };
  const records = cargarRecords();
  const nuevoRecord = esNuevoRecord(records, resumen);
  guardarRecords(actualizarRecords(records, resumen));
  // Quien vence al jefe final ocupa su lugar: la próxima partida la espera a ella en la Cripta.
  if (victoria) guardarAjustes({ senora: l.nombre });
  const lineas = [
    `${resumen.heroina}, nivel ${resumen.nivel} (${partida.dificultad.nombre})`,
    victoria ? `Has derrotado a ${partida.rival}` : `Caíste en: ${resumen.zona}`,
    `Monstruos vencidos: ${resumen.vencidos}`,
    `Tiempo: ${formatearTiempo(resumen.segundos)}`,
    ...(nuevoRecord ? ['', `¡Nuevo récord en ${partida.dificultad.nombre}!`] : []),
  ];
  const textos = victoria ? (l.heroe?.historia.final ?? []) : [historia.derrota];
  contar(partida.pila, paginas(textos), () =>
    partida.pila.cambiar(
      victoria
        ? new EscenaMensaje('¡Victoria!', '#ffd27a', lineas, VOLVER_AL_TITULO, empezarOtra)
        : new EscenaMensaje('Fin de la partida', '#d8584a', lineas, VOLVER_AL_TITULO, empezarOtra),
    ),
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
  /** Lo que dice el jefe al caer, antes de la subida de nivel y del equipo. */
  caida: Pagina | null = null,
): void {
  const { pila, luchadora } = partida;
  const antes = instantanea(luchadora);
  const azar = crearAzar(partida.semilla * 31 + ++partida.combates);
  const combate = crearCombate(
    luchadora,
    luchadoresDeGrupo(grupo.map((m) => monstruoCon(m, partida.dificultad))),
    partida.reglas,
    azar,
    partida.bestiario,
  );
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
        const subir = (): void => {
          if (luchadora.nivel <= antes.nivel) {
            seguir();
            return;
          }
          pila.apilar(
            new EscenaMensaje(
              `¡Nivel ${luchadora.nivel}!`,
              '#ffd27a',
              cambiosDeNivel(antes, luchadora),
              SEGUIR,
              () => {
                pila.desapilar();
                // Después, repartir los puntos nuevos (o dejarlos para luego).
                pila.apilar(
                  new EscenaPuntos(luchadora, partida.reglas, 'Luego', () => {
                    pila.desapilar();
                    seguir();
                  }),
                );
              },
            ),
          );
        };
        // Primero lo que dice el jefe al caer, luego la subida de nivel, el equipo encontrado y de vuelta al mapa.
        if (caida && resultado === 'victoria') contar(pila, [caida], subir);
        else subir();
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
