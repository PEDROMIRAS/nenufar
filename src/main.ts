import { crearAcciones } from './core/acciones';
import { crearAzar } from './core/azar';
import { avisoNuevo, crearEstadoCartel, opacidadCartel, reiniciarCartel } from './core/cartel';
import { construirSala, crearCatalogo } from './core/sala';
import controles from './data/controles.json';
import { DIFICULTADES, EVENTOS, HD2D, HEROES, MONSTRUOS, OBJETOS } from './data/datos';
import { EscenaControles } from './escenas/controles';
import { EscenaDificultad } from './escenas/dificultad';
import type { Escena } from './escenas/escena';
import { EscenaExtras } from './escenas/extras';
import { EscenaHabilidades } from './escenas/habilidades';
import { EscenaNombre } from './escenas/nombre';
import { EscenaPausa } from './escenas/pausa';
import { PilaEscenas } from './escenas/pila';
import { EscenaSeleccion } from './escenas/seleccion';
import { EscenaTitulo } from './escenas/titulo';
import { fijarDispositivo, usarDispositivo } from './input/dispositivo';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { conexionesMando, crearMando } from './input/mando';
import { crearTeclado } from './input/teclado';
import { crearToque } from './input/toque';
import { anunciar, movimientoReducido } from './render/accesibilidad';
import { vigilarActualizaciones } from './render/actualizacion';
import { cargarPartida, cargarRecords } from './render/almacen';
import { iniciarBucle } from './render/bucle';
import { crearCampoNombre } from './render/campoNombre';
import { dibujarCartel } from './render/cartel';
import { crearCasilla, crearDeslizador } from './render/deslizador';
import { Mundo } from './render/mundo/mundo';
import { crearPortada, type Portada3d } from './render/mundo/portada';
import { LARGO_NOMBRE, RECT_CAMPO } from './render/nombre';
import { colocarContexto, esTactil, fijarModo, prepararPantalla } from './render/pantalla';
import {
  RECT_CALIDAD,
  RECT_EFECTOS,
  RECT_MUSICA,
  RECT_RETO,
  RECT_SONIDO,
  RECT_TEMBLOR,
} from './render/pausa';
import { cargarImagen, cargarSprite, cargarSprites, cargarTilesets } from './render/recursos';
import { prepararSonido } from './render/sonido';
import { cargarFuente } from './render/texto';
import { ATAJOS } from './partida/atajos';
import { LOGROS, hoy } from './partida/fin';
import { crearInicio } from './partida/inicio';
import { aspecto, CONOCIDO, mostrarError, PLANTILLAS_DEV, sesion } from './partida/partida';

/** Escenas que paran el reloj del reto: la pausa (y lo que se abre desde ella) y elegir habilidades. */
const esPausa = (e: Escena): boolean => e instanceof EscenaPausa || e instanceof EscenaHabilidades;

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

  // ?semilla=N repite una partida; sin ella, cada carga es distinta.
  const semilla = ATAJOS.semilla ?? Math.floor(Math.random() * 2 ** 31);
  console.info('Semilla de la partida:', semilla);

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  if (esTactil()) usarDispositivo('tactil');
  // shortcut: solo en desarrollo, para ver los textos del mando sin tenerlo
  if (ATAJOS.mando) fijarDispositivo('mando');
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
  const inicio = crearInicio({
    pila,
    mundo,
    semilla,
    ranas: opciones,
    capas,
    hojas,
    controles: sonidoHtml,
  });
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
            (dificultad) => inicio.empezar(heroe, dificultad, nombre),
            () => pila.cambiar(pedirNombre),
          ),
        ),
      () => pila.cambiar(seleccion),
    );
    pila.cambiar(pedirNombre);
  });
  const seleccionReto = new EscenaSeleccion(opciones, ({ heroe }) =>
    inicio.empezarReto(heroe, hoy()),
  );

  // Una partida a medias (se cerró el navegador): se vuelve a la sala donde se guardó, sin portada.
  const guardada = cargarPartida(CONOCIDO);
  if (guardada) inicio.recuperar(guardada);
  else {
    await mostrarPortada();
    // shortcut: solo en desarrollo, ?reto=gana|pierde abre la tarjeta del reto nada más cargar.
    if (ATAJOS.reto) inicio.empezarReto(opciones[0]!.heroe, hoy());
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
  if (ATAJOS.mando) tiempoCartel = 0;
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
  const pedida = ATAJOS.portada;
  const datos = ATAJOS.vista ? { ...HD2D.portada, encuadre: ATAJOS.vista } : HD2D.portada;
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
