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
import { capasDeEquipo, coloresDeEquipo, inventarioInicial } from './core/equipo';
import type { Inventario } from './core/inventario';
import { limpiarNombre } from './core/nombre';
import { cambiosDeNivel, instantanea } from './core/progresion';
import {
  actualizarRecords,
  anotarLogros,
  anotarVencidos,
  esNuevoRecord,
  formatearTiempo,
  type Resumen,
} from './core/records';
import { logrosNuevos, monstruosDelMundo, type Logro } from './core/logros';
import logrosJson from './data/logros.json';
import { construirSala, crearCatalogo } from './core/sala';
import { bestiarioCon, monstruoCon, reglasCon } from './core/dificultad';
import type {
  DificultadJson,
  HeroeJson,
  MonstruoJson,
  PlantillasJson,
  ReglasCombate,
  ZonaHd2d,
} from './core/types';
import { aplicarRecompensa, elegirRecompensa } from './core/recompensas';
import { jefeVioleta, modoVioleta } from './core/violetas';
import { generarZona } from './core/zona';
import controles from './data/controles.json';
import { DIFICULTADES, HD2D, HEROES, MONSTRUOS, OBJETOS, REGLAS } from './data/datos';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import plantillasCripta from './data/salas/plantillas_cripta.json';
import plantillasRuinas from './data/salas/plantillas_ruinas.json';
import historia from './data/historia.json';
import ritmo from './data/ritmo.json';
import zonas from './data/zonas.json';
import { EscenaCombate } from './escenas/combate';
import { EscenaControles } from './escenas/controles';
import { EscenaDificultad } from './escenas/dificultad';
import { EscenaExtras } from './escenas/extras';
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
import { RECT_EFECTOS, RECT_MUSICA, RECT_SONIDO } from './render/pausa';
import { prepararSonido } from './render/sonido';
import { vestirHoja } from './render/tinte';
import { Mundo } from './render/mundo/mundo';
import { crearPortada, type Portada3d } from './render/mundo/portada';
import { cargarAjustes, cargarRecords, guardarAjustes, guardarRecords } from './render/almacen';
import {
  cargarImagen,
  cargarSprite,
  cargarSprites,
  cargarTilesets,
  type Sprite,
} from './render/recursos';

const LOGROS: readonly Logro[] = logrosJson.logros;
/** Lo que miran los logros que no está en la partida: qué ranas y qué monstruos existen. */
const MUNDO = { heroes: Object.keys(HEROES), monstruos: monstruosDelMundo(MONSTRUOS) };

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
  /** Capas de las piezas especiales que cambian la silueta de la heroína, por su ruta. */
  capas: ReadonlyMap<string, HTMLImageElement>;
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
  /** Volumen de música y efectos y sonido sí o no en el inventario (controles HTML, uno por partida). */
  controles: { musica: Deslizador; efectos: Deslizador; sonido: Casilla };
  /** Nombre del jefe final: lleva el de la última heroína que lo venció, si la hubo. */
  rival: string;
  /** Salas violetas que han salido en las zonas ya creadas, y si una de ellas era del dragón negro. */
  violetas: number;
  dragonUsado: boolean;
  /** El mapa en 3D (uno para todas las partidas: cada WebGLRenderer es un contexto del navegador). */
  mundo: Mundo;
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
  const mundo = new Mundo(canvas, HD2D);
  prepararSonido();

  // ?semilla=N repite una partida; sin ella, cada carga es distinta.
  const pedida = Number(new URLSearchParams(location.search).get('semilla'));
  const semilla =
    Number.isInteger(pedida) && pedida > 0 ? pedida : Math.floor(Math.random() * 2 ** 31);
  console.info('Semilla de la partida:', semilla);
  // ?zona=N empieza en la zona N (0 = Bosque), solo en desarrollo: para revisar el arte de cada zona.
  const zonaInicial = import.meta.env.DEV
    ? Math.max(
        0,
        Math.min(ORDEN.length - 1, Number(new URLSearchParams(location.search).get('zona')) || 0),
      )
    : 0;

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
  const capas = new Map(
    await Promise.all(
      Object.values(OBJETOS.equipo)
        .flatMap((e) => (e.capa ? [e.capa] : []))
        .map(async (c) => [c, await cargarImagen(`assets/sprites/${c}.png`)] as const),
    ),
  );
  // Elegir rana → ponerle nombre → dificultad; Escape vuelve al paso anterior.
  const campoNombre = crearCampoNombre(canvas, RECT_CAMPO, LARGO_NOMBRE);
  const sonidoHtml = {
    sonido: crearCasilla(canvas, RECT_SONIDO, 'Sonido'),
    musica: crearDeslizador(canvas, RECT_MUSICA, 'Volumen de la música'),
    efectos: crearDeslizador(canvas, RECT_EFECTOS, 'Volumen de los efectos'),
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
      inventario: inventarioInicial(luchadora, heroe, OBJETOS),
      // Copia propia: `vestir` la recolorea y la de la selección se queda con los colores originales.
      sprite: { ...sprite },
      imagenBase: sprite.imagen as HTMLImageElement,
      capas,
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
      violetas: 0,
      dragonUsado: false,
      mundo,
    };
    vestir(partida); // ya lleva puestas el arma y la armadura iniciales
    crearZona(partida, zonaInicial, true)
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
      LOGROS.length,
      await portada(mundo, {
        ronin: ronin!,
        maga: maga!,
        limo: hojas.get('monstruos/limo'),
        murcielago: hojas.get('monstruos/murcielago'),
      }),
      () => pila.cambiar(seleccion),
      () =>
        pila.apilar(
          new EscenaExtras(cargarRecords(), MONSTRUOS, hojas, LOGROS, () => pila.desapilar()),
        ),
      () => pila.apilar(new EscenaControles(() => pila.desapilar())),
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
    {
      ...zonas.generacion,
      salas: datos.salas,
      violeta: modoVioleta(indice, ORDEN.length, partida.violetas),
      probabilidadVioleta: zonas.violetas.probabilidad,
      probabilidadTrampa: zonas.violetas.probabilidadTrampa,
    },
    partida.semilla + indice * 7919,
  );
  console.info(`Zona ${nombre}, semilla ${zona.semilla}`);
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
  const hayOtra = indice + 1 < ORDEN.length;
  const escena: EscenaMapa = new EscenaMapa({
    zona,
    mundo: partida.mundo,
    aspecto: aspecto(nombre),
    fuente: HD2D.fuente,
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
    jefeVioleta: violeta,
    cofreTrampa: monstruo(datos.cofreTrampa),
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
    iniciarCombate: (grupo, alTerminar, quien) => {
      const jefe = grupo[0];
      if (jefe?.jefe && jefe.oculto) lucharVioleta(partida, jefe, escena.fondoSala, alTerminar);
      else if (jefe?.jefe)
        lucharJefe(partida, jefe, historia.zonas[nombre].jefe, escena.fondoSala, alTerminar);
      else luchar(partida, grupo, escena.fondoSala, alTerminar, quien);
    },
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

/** Frases de los jefes violetas, por el nombre de su sprite (los tres dragones comparten la suya). */
const FRASES_VIOLETAS: Record<string, { inicio: string; caida: string }> = historia.violetas;

/** Combate contra el jefe de una sala violeta: como un jefe de zona y, al vencerlo, su recompensa. */
function lucharVioleta(
  partida: Partida,
  jefe: MonstruoJson,
  fondo: HTMLCanvasElement,
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
 * Recompensa de un jefe violeta: una al azar de las que faltan (el arma o la armadura se ofrecen en la
 * pantalla de equipo). El dragón negro, además, da su Corazón.
 */
function premiar(partida: Partida, jefe: MonstruoJson, alFinal: () => void): void {
  const { luchadora: l, inventario: inv } = partida;
  const heroe = l.heroe;
  if (!heroe) return alFinal();
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
  contar(partida.pila, textos, () =>
    pieza ? ofrecerEquipo(partida, [pieza], alFinal) : alFinal(),
  );
}

/** La portada en 3D: la sala de hd2d.json con su zona cargada. */
async function portada(
  mundo: Mundo,
  sprites: Parameters<typeof crearPortada>[7],
): Promise<Portada3d> {
  const datos = HD2D.portada;
  const zona = datos.zona as NombreZona;
  const { tilesets, imagenes } = await cargarTilesets(zona);
  const catalogo = crearCatalogo(tilesets);
  const plantilla = PLANTILLAS[zona].plantillas.find((p) => p.id === datos.plantilla);
  if (!plantilla) throw new Error(`No existe la plantilla ${datos.plantilla} de la portada`);
  const sala = construirSala(plantilla.mapa, PLANTILLAS[zona], catalogo, crearAzar(datos.semilla));
  const tam = tilesets[0]?.tileSize ?? 32;
  return crearPortada(mundo, datos, aspecto(zona), sala, catalogo, imagenes, tam, sprites);
}

/** Aspecto 3D de la zona, de hd2d.json. */
function aspecto(zona: string): ZonaHd2d {
  const a = HD2D.zonas[zona];
  if (!a) throw new Error(`Falta la zona ${zona} en hd2d.json`);
  return a;
}

function monstruo(clave: string): MonstruoJson {
  const m = MONSTRUOS[clave];
  if (!m) throw new Error(`Monstruo desconocido en zonas.json: ${clave}`);
  return m;
}

/** Viste la hoja de la heroína según el arma y la armadura que lleva: colores y piezas especiales. */
function vestir(partida: Partida): void {
  const heroe = partida.luchadora.heroe;
  if (!heroe) return;
  partida.sprite.imagen = vestirHoja(
    partida.imagenBase,
    coloresDeEquipo(heroe, partida.inventario, OBJETOS),
    capasDeEquipo(partida.inventario, OBJETOS).flatMap((k) => partida.capas.get(k) ?? []),
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
    capas: partida.capas,
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
    heroe: Object.entries(HEROES).find(([, h]) => h === l.heroe)?.[0] ?? '',
    objetosUsados: partida.inventario.usados,
    contraHeredada: partida.rival !== monstruo(zonas.jefeFinal).nombre,
  };
  const records = cargarRecords();
  const nuevoRecord = esNuevoRecord(records, resumen);
  const actualizados = actualizarRecords(records, resumen);
  const nuevos = logrosNuevos(actualizados, resumen, MUNDO, LOGROS);
  guardarRecords(anotarLogros(actualizados, nuevos));
  // Quien vence al jefe final ocupa su lugar: la próxima partida la espera a ella en la Cripta.
  if (victoria) guardarAjustes({ senora: l.nombre });
  const lineas = [
    `${resumen.heroina}, nivel ${resumen.nivel} (${partida.dificultad.nombre})`,
    victoria ? `Has derrotado a ${partida.rival}` : `Caíste en: ${resumen.zona}`,
    `Monstruos vencidos: ${resumen.vencidos}`,
    `Tiempo: ${formatearTiempo(resumen.segundos)}`,
    ...(nuevoRecord ? ['', `¡Nuevo récord en ${partida.dificultad.nombre}!`] : []),
    ...nuevos.map((clave) => `Logro: ${LOGROS.find((l) => l.clave === clave)?.nombre ?? clave}`),
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
      if (resultado === 'victoria') {
        partida.vencidos += combate.enemigos.length;
        // Al bestiario en cuanto se vencen: no se pierden aunque se abandone la partida.
        const claves = combate.enemigos.flatMap((e) =>
          e.monstruo?.clave ? [e.monstruo.clave] : [],
        );
        guardarRecords(anotarVencidos(cargarRecords(), claves));
      }
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
