import type { Acciones } from './core/acciones';
import { crearHeroina, type Heroina } from './core/heroina';
import { crearCatalogo } from './core/sala';
import type { HeroeJson, PlantillasJson } from './core/types';
import { generarZona } from './core/zona';
import controles from './data/controles.json';
import heroes from './data/heroes.json';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import plantillasCripta from './data/salas/plantillas_cripta.json';
import plantillasRuinas from './data/salas/plantillas_ruinas.json';
import zonas from './data/zonas.json';
import type { Escena } from './escenas/escena';
import { EscenaMapa } from './escenas/mapa';
import { PilaEscenas } from './escenas/pila';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';
import { cargarSprite, cargarTilesets, type Sprite } from './render/recursos';

type NombreZona = keyof typeof zonas.zonas;
/** Orden de las zonas: el de zonas.json. */
const ORDEN = Object.keys(zonas.zonas) as NombreZona[];
const PLANTILLAS: Record<NombreZona, PlantillasJson> = {
  bosque: plantillasBosque,
  ruinas: plantillasRuinas,
  cripta: plantillasCripta,
};

async function iniciar(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#juego');
  if (!canvas) throw new Error('Falta el canvas #juego');
  const ctx = prepararPantalla(canvas);

  // shortcut: heroína fija (ronin); la pantalla de selección llega en el hito 5.
  const heroe: HeroeJson = heroes.ronin;
  const sprite = await cargarSprite(heroe.sprite);
  // ?semilla=N repite una partida; sin ella, cada carga es distinta.
  const pedida = Number(new URLSearchParams(location.search).get('semilla'));
  const semilla =
    Number.isInteger(pedida) && pedida > 0 ? pedida : Math.floor(Math.random() * 2 ** 31);
  console.info('Semilla de la partida:', semilla);

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
  const acciones: Acciones = {
    moverX: 0,
    moverY: 0,
    confirmar: false,
    cancelar: false,
    menu: false,
  };
  const heroina = crearHeroina(heroe, 0, 0); // cada escena la coloca en su sala de inicio

  const pila = new PilaEscenas();
  pila.apilar(
    await crearZona(0, semilla, heroina, sprite, false, (siguiente) => pila.cambiar(siguiente)),
  );

  iniciarBucle(
    (dt) => {
      leerFuentes(fuentes, acciones);
      pila.update(dt, acciones);
    },
    (alpha) => pila.draw(ctx, alpha),
  );
}

/** Carga la zona `indice` y crea su escena; su portal carga la siguiente y la entrega a `cambiar`. */
async function crearZona(
  indice: number,
  semilla: number,
  heroina: Heroina,
  sprite: Sprite,
  entrarDesdeNegro: boolean,
  cambiar: (escena: Escena) => void,
): Promise<EscenaMapa> {
  const nombre = ORDEN[indice];
  if (!nombre) throw new Error(`No hay zona número ${indice}`);
  const { tilesets, imagenes } = await cargarTilesets(nombre);
  // Cada zona con su propia semilla, derivada de la de la partida.
  const zona = generarZona(
    { ...zonas.generacion, salas: zonas.zonas[nombre].salas },
    semilla + indice * 7919,
  );
  console.info(`Zona ${nombre}, semilla ${zona.semilla}`);
  const hayOtra = indice + 1 < ORDEN.length;
  return new EscenaMapa({
    zona,
    plantillas: PLANTILLAS[nombre],
    catalogo: crearCatalogo(tilesets),
    imagenes,
    tam: tilesets[0]?.tileSize ?? 32,
    heroina,
    sprite,
    duracionFundido: zonas.transicionSalas,
    rejilla: zonas.generacion.rejilla,
    // shortcut: el portal de la última zona no lleva a nada hasta que exista el jefe final.
    alUsarPortal: hayOtra
      ? () => {
          crearZona(indice + 1, semilla, heroina, sprite, true, cambiar)
            .then(cambiar)
            .catch(mostrarError);
        }
      : null,
    entrarDesdeNegro,
  });
}

function mostrarError(error: unknown): void {
  // Sin esto, en un móvil un fallo de carga es solo una pantalla negra.
  document.body.style.color = '#fff';
  document.body.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
}

iniciar().catch(mostrarError);
