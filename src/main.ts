import { crearAcciones } from './core/acciones';
import { crearAzar } from './core/azar';
import { luchadorDeHeroe, type Luchador } from './core/combate';
import { restaurarHeroina } from './core/guardado';
import { ajustarEquipadas } from './core/equipadas';
import { crearHeroina } from './core/heroina';
import { equipar, inventarioInicial } from './core/equipo';
import type { Inventario } from './core/inventario';
import { empezarEnNivel } from './core/progresion';
import { semillaDelDia, type Fecha } from './core/reto';
import RETO from './data/reto.json';
import { construirSala, crearCatalogo } from './core/sala';
import { bestiarioCon, reglasCon } from './core/dificultad';
import type { DificultadJson, HeroeJson } from './core/types';
import controles from './data/controles.json';
import { DIFICULTADES, EVENTOS, HD2D, HEROES, MONSTRUOS, OBJETOS, REGLAS } from './data/datos';
import historia from './data/historia.json';
import ritmo from './data/ritmo.json';
import { EscenaControles } from './escenas/controles';
import { EscenaDificultad } from './escenas/dificultad';
import { EscenaExtras } from './escenas/extras';
import { EscenaNombre } from './escenas/nombre';
import { PilaEscenas } from './escenas/pila';
import { EscenaPausa } from './escenas/pausa';
import type { Escena } from './escenas/escena';
import { EscenaPresentacion } from './escenas/presentacion';
import { EscenaSeleccion } from './escenas/seleccion';
import { EscenaTitulo } from './escenas/titulo';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { fijarDispositivo, usarDispositivo } from './input/dispositivo';
import { conexionesMando, crearMando } from './input/mando';
import { avisoNuevo, crearEstadoCartel, opacidadCartel, reiniciarCartel } from './core/cartel';
import { dibujarCartel } from './render/cartel';
import { anunciar, movimientoReducido } from './render/accesibilidad';
import { crearToque } from './input/toque';
import { iniciarBucle } from './render/bucle';
import { vigilarActualizaciones } from './render/actualizacion';
import { colocarContexto, esTactil, fijarModo, prepararPantalla } from './render/pantalla';
import { cargarFuente } from './render/texto';
import { crearCasilla, crearDeslizador } from './render/deslizador';
import { crearCampoNombre } from './render/campoNombre';
import { LARGO_NOMBRE, RECT_CAMPO } from './render/nombre';
import {
  RECT_CALIDAD,
  RECT_EFECTOS,
  RECT_MUSICA,
  RECT_RETO,
  RECT_SONIDO,
  RECT_TEMBLOR,
} from './render/pausa';
import { prepararSonido } from './render/sonido';
import { Mundo } from './render/mundo/mundo';
import { crearPortada, type Portada3d } from './render/mundo/portada';
import { cargarPartida, cargarRecords, guardarAjustes } from './render/almacen';
import {
  cargarImagen,
  cargarSprite,
  cargarSprites,
  cargarTilesets,
  type Sprite,
} from './render/recursos';
import {
  sesion,
  type NombreZona,
  ORDEN,
  PLANTILLAS_DEV,
  type Partida,
  CONOCIDO,
  aspecto,
  mostrarError,
} from './partida/partida';
import { LOGROS, hoy, terminarReto } from './partida/fin';
import { contar, paginas, paginaPresagio, cartel, tituloRival } from './partida/relato';
import { crearZona } from './partida/zona';
import { abrirAltar } from './partida/eventos';
import { vestir, luchar } from './partida/combates';

const esPausa = (e: Escena): boolean => e instanceof EscenaPausa;

// Con una partida en marcha, cerrar la pestaña pregunta antes (Ctrl+W sin querer).
addEventListener('beforeunload', (e) => {
  if (sesion.enCurso) e.preventDefault();
});

/** Lo que dice el cartel al detectar un mando. */
const CARTEL_MANDO = 'Mando conectado';

async function iniciar(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#juego');
  if (!canvas) throw new Error('Falta el canvas #juego');
  const ctx = prepararPantalla(canvas);
  vigilarActualizaciones();
  const mundo = new Mundo(canvas, HD2D);
  prepararSonido();

  // ?semilla=N repite una partida; sin ella, cada carga es distinta. Por debajo de 2³¹, como la del azar: el guardado no
  // acepta semillas de 2³² o más, y con una así la partida se jugaba pero se descartaba al recargar.
  const pedida = Number(new URLSearchParams(location.search).get('semilla'));
  const semilla =
    Number.isInteger(pedida) && pedida > 0 && pedida < 2 ** 31
      ? pedida
      : Math.floor(Math.random() * 2 ** 31);
  console.info('Semilla de la partida:', semilla);
  // ?zona=N empieza en la zona N (0 = Bosque), solo en desarrollo: para revisar el arte de cada zona.
  const zonaInicial = import.meta.env.DEV
    ? Math.max(
        0,
        Math.min(ORDEN.length - 1, Number(new URLSearchParams(location.search).get('zona')) || 0),
      )
    : 0;

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  if (esTactil()) usarDispositivo('tactil');
  // shortcut: solo en desarrollo, para ver los textos del mando sin tenerlo
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('mando'))
    fijarDispositivo('mando');
  const fuentes = [
    crearTeclado(),
    crearMando(controles.mando),
    crearJoystick(document.body, controles.joystick),
    crearToque(canvas),
  ];
  const acciones = crearAcciones();
  const pila = new PilaEscenas(fijarModo);
  await cargarFuente();
  const opciones = await Promise.all(
    Object.values(HEROES).map(async (heroe) => ({
      heroe,
      sprite: await cargarSprite(heroe.sprite),
    })),
  );
  const hojas = await cargarSprites([
    ...Object.values(MONSTRUOS).map((m) => m.sprite),
    EVENTOS.ermitano.sprite,
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
    calidad: crearCasilla(canvas, RECT_CALIDAD, 'Calidad alta: desenfoque y sombras'),
    reto: crearCasilla(canvas, RECT_RETO, 'Botón Reto del día en la portada'),
    musica: crearDeslizador(canvas, RECT_MUSICA, 'Volumen de la música'),
    efectos: crearDeslizador(canvas, RECT_EFECTOS, 'Volumen de los efectos'),
    temblor: crearDeslizador(canvas, RECT_TEMBLOR, 'Temblor de la pantalla'),
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
  /** La partida con su heroína, inventario y dificultad (nueva o recuperada), aún sin zona. */
  const crearPartida = (
    heroe: HeroeJson,
    sprite: Sprite,
    dificultad: DificultadJson,
    luchadora: Luchador,
    inventario: Inventario,
    semillaPartida: number,
  ): Partida => {
    const partida: Partida = {
      semilla: semillaPartida,
      pila,
      heroina: crearHeroina(heroe, 0, 0), // cada escena la coloca en su sala
      // La misma luchadora en todos los combates: la vida perdida se arrastra.
      luchadora,
      inventario,
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
      presagio: null,
      dificultadZona: dificultad,
      bestiario: bestiarioCon(MONSTRUOS, dificultad),
      reglas: reglasCon(REGLAS, dificultad),
      rival: tituloRival(),
      controles: sonidoHtml,
      violetas: 0,
      dragonUsado: false,
      violetasAntes: 0,
      dragonAntes: false,
      mundo,
      reto: null,
    };
    vestir(partida); // con el arma y la armadura que lleve
    sesion.enCurso = true;
    return partida;
  };
  /** Crea la partida con la heroína, su nombre y la dificultad elegidas y carga la primera zona. */
  const empezar = (
    heroe: HeroeJson,
    sprite: Sprite,
    dificultad: DificultadJson,
    nombre: string,
  ): void => {
    const luchadora = luchadorDeHeroe(heroe);
    luchadora.nombre = nombre;
    // ?puntos=N da N puntos de mejora al empezar (solo en desarrollo): para revisar la pantalla de puntos.
    if (import.meta.env.DEV)
      luchadora.puntos = Number(new URLSearchParams(location.search).get('puntos')) || 0;
    const inventario = inventarioInicial(luchadora, heroe, OBJETOS);
    // ?equipo=clave se pone esa pieza al empezar (solo en desarrollo): para ver cómo se viste la heroína.
    const pieza = import.meta.env.DEV ? new URLSearchParams(location.search).get('equipo') : null;
    if (pieza && OBJETOS.equipo[pieza]) equipar(luchadora, inventario, OBJETOS, pieza);
    const partida = crearPartida(heroe, sprite, dificultad, luchadora, inventario, semilla);
    crearZona(partida, zonaInicial, true)
      .then((zona) => {
        pila.cambiar(zona);
        // ?combate=clave1,clave2 abre un combate contra esos monstruos nada más empezar (solo en desarrollo):
        // para revisar la pantalla de combate sin recorrer las salas.
        const claves = import.meta.env.DEV
          ? new URLSearchParams(location.search).get('combate')
          : null;
        const grupo = claves?.split(',').flatMap((c) => (MONSTRUOS[c] ? [MONSTRUOS[c]] : [])) ?? [];
        if (grupo.length > 0) {
          // shortcut: solo en desarrollo; con ?presentar y un solo monstruo, antes sale su presentación de
          // jefe (para grabar el vídeo de demo).
          const jefe = grupo[0]!;
          if (grupo.length === 1 && new URLSearchParams(location.search).has('presentar')) {
            partida.pila.apilar(
              new EscenaPresentacion(zona.fondoSala, jefe.nombre, ritmo.presentacionJefe, () => {
                partida.pila.desapilar();
                luchar(partida, grupo, zona.fondoSala, () => {});
              }),
            );
            return;
          }
          luchar(partida, grupo, zona.fondoSala, () => {});
          return;
        }
        // ?altar abre la elección del altar nada más empezar (solo en desarrollo), para revisar su pantalla.
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('altar')) {
          abrirAltar(partida, () => {});
          return;
        }
        guardarAjustes({ pistasVistas: true }); // las pistas, si tocaban, ya van en esta zona
        // La historia se cuenta encima del mapa ya cargado: al pasarla, empieza el fundido de entrada.
        contar(
          pila,
          [
            ...paginas([...historia.inicio, ...heroe.historia.inicio]),
            cartel(zonaInicial),
            ...paginaPresagio(partida),
          ],
          () => {},
        );
      })
      .catch(mostrarError);
  };

  /**
   * Empieza el reto del día con la rana elegida: el Bosque corto de reto.json con la semilla de `fecha`, la rana ya en
   * el nivel del reto y sin guardar nada. «Otra vez» lo vuelve a llamar con la misma rana y la misma fecha.
   */
  const empezarReto = (heroe: HeroeJson, sprite: Sprite, fecha: Fecha, otraVez = false): void => {
    const luchadora = luchadorDeHeroe(heroe);
    const inventario = inventarioInicial(luchadora, heroe, OBJETOS);
    empezarEnNivel(luchadora, RETO.nivel, REGLAS.experiencia);
    const partida = crearPartida(
      heroe,
      sprite,
      RETO.dificultad,
      luchadora,
      inventario,
      semillaDelDia(fecha),
    );
    sesion.enCurso = false; // el reto dura minutos: cerrar la pestaña no pregunta
    partida.reto = { fecha, segundos: 0, progreso: () => ({ sala: 1, de: 1 }) };
    sesion.retoEnJuego = partida;
    crearZona(partida, ORDEN.indexOf(RETO.zona as NombreZona), true)
      .then((zona) => {
        pila.cambiar(zona);
        guardarAjustes({ pistasVistas: true }); // las pistas, si tocaban, ya van en esta zona
        // shortcut: solo en desarrollo, ?reto=gana|pierde enseña la tarjeta final nada más entrar (una vez).
        if (finForzado) {
          partida.reto!.segundos = 222;
          terminarReto(partida, finForzado === 'gana');
          finForzado = null;
          return;
        }
        if (!otraVez)
          contar(
            pila,
            [
              {
                titulo: 'Reto del día',
                texto: `${fecha.dia}/${fecha.mes}/${fecha.anio}. Llega al Guardián del Bosque.`,
              },
            ],
            () => {},
          );
      })
      .catch(mostrarError);
  };
  sesion.reiniciarReto = (heroe, fecha) =>
    empezarReto(heroe, opciones.find((o) => o.heroe === heroe)!.sprite, fecha, true);
  let finForzado = import.meta.env.DEV ? new URLSearchParams(location.search).get('reto') : null;
  const seleccionReto = new EscenaSeleccion(opciones, ({ heroe, sprite }) =>
    empezarReto(heroe, sprite, hoy()),
  );

  // Una partida a medias (se cerró el navegador): se vuelve a la sala donde se guardó, sin portada.
  const guardada = cargarPartida(CONOCIDO);
  if (guardada) {
    const heroe = HEROES[guardada.heroe as keyof typeof HEROES];
    const sprite = opciones.find((o) => o.heroe === heroe)!.sprite;
    const luchadora = luchadorDeHeroe(heroe);
    restaurarHeroina(luchadora, guardada.heroina);
    ajustarEquipadas(luchadora); // las de una partida de antes, o las que ya no conozca
    const partida = crearPartida(
      heroe,
      sprite,
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
    crearZona(partida, guardada.zona, false, guardada.mapa)
      .then((zona) => {
        pila.cambiar(zona);
        contar(
          pila,
          [
            guardada.combate
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
            if (guardada.combate) zona.reanudarCombate(guardada.combate);
          },
        );
      })
      .catch(mostrarError);
  } else {
    await mostrarPortada();
    if (finForzado) empezarReto(opciones[0]!.heroe, opciones[0]!.sprite, hoy());
  }

  async function mostrarPortada(): Promise<void> {
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
        () => pila.cambiar(seleccionReto),
      ),
    );
  }

  // Cartel «Mando conectado»: segundos desde la última conexión (Infinity = no se ve).
  const estadoCartel = crearEstadoCartel();
  let tiempoCartel = Infinity;
  // shortcut: solo en desarrollo, con ?mando el cartel sale al empezar para verlo sin mando
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('mando')) tiempoCartel = 0;
  iniciarBucle(
    (dt) => {
      leerFuentes(fuentes, acciones);
      pila.update(dt, acciones);
      // El tiempo del reto no cuenta la pausa (ni Equipo o Puntos abiertos desde ella).
      if (sesion.retoEnJuego?.reto && !pila.alguna(esPausa)) sesion.retoEnJuego.reto.segundos += dt;
      if (avisoNuevo(estadoCartel, conexionesMando())) {
        tiempoCartel = reiniciarCartel(tiempoCartel, controles.mando.aviso);
        anunciar(CARTEL_MANDO);
      } else tiempoCartel += dt;
    },
    (alpha) => {
      mundo.verLienzo(pila.conMundo);
      colocarContexto(ctx);
      pila.draw(ctx, alpha);
      const opacidad = opacidadCartel(tiempoCartel, controles.mando.aviso, movimientoReducido());
      if (opacidad > 0) dibujarCartel(ctx, CARTEL_MANDO, opacidad, pila.bajoCartel);
    },
  );
}

/** La portada en 3D: la sala de hd2d.json con su zona cargada. */
async function portada(
  mundo: Mundo,
  sprites: Parameters<typeof crearPortada>[7],
): Promise<Portada3d> {
  // En desarrollo, `?portada=cauce_combate_01` enseña esa sala (la zona es lo que va antes del primer `_`) y
  // `&vista=x,z,ancho` acerca la cámara a esa casilla, con ese ancho en casillas.
  const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null;
  const pedida = params?.get('portada') ?? null;
  const [vx, vz, va] = (params?.get('vista') ?? '').split(',').map(Number);
  const datos = va ? { ...HD2D.portada, encuadre: { x: vx!, z: vz!, ancho: va } } : HD2D.portada;
  const zona = pedida ? pedida.split('_')[0]! : datos.zona;
  const idPlantilla = pedida ?? datos.plantilla;
  const conjunto = PLANTILLAS_DEV[zona];
  if (!conjunto) throw new Error(`No hay plantillas de la zona ${zona}`);
  const { tilesets, imagenes } = await cargarTilesets(zona);
  const catalogo = crearCatalogo(tilesets);
  const plantilla = conjunto.plantillas.find((p) => p.id === idPlantilla);
  if (!plantilla) throw new Error(`No existe la plantilla ${idPlantilla} de la portada`);
  const sala = construirSala(plantilla.mapa, conjunto, catalogo, crearAzar(datos.semilla));
  const tam = tilesets[0]?.tileSize ?? 32;
  return crearPortada(mundo, datos, aspecto(zona), sala, catalogo, imagenes, tam, sprites);
}

// Un fallo dentro del bucle corta el requestAnimationFrame: sin esto el juego se congela sin avisar.
addEventListener('error', (e) => mostrarError(e.error ?? e.message));
addEventListener('unhandledrejection', (e) => mostrarError(e.reason));
iniciar().catch(mostrarError);
