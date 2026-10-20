import type { Acciones } from './core/acciones';
import { crearHeroina } from './core/heroina';
import { crearCatalogo } from './core/sala';
import type { HeroeJson, PlantillasJson } from './core/types';
import { generarZona } from './core/zona';
import controles from './data/controles.json';
import heroes from './data/heroes.json';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import zonas from './data/zonas.json';
import type { Escena } from './escenas/escena';
import { EscenaMapa } from './escenas/mapa';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';
import { cargarSprite, cargarTilesets } from './render/recursos';

async function iniciar(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#juego');
  if (!canvas) throw new Error('Falta el canvas #juego');
  const ctx = prepararPantalla(canvas);

  // shortcut: heroína fija (ronin); la pantalla de selección llega en el hito 5.
  const heroe: HeroeJson = heroes.ronin;
  const [{ tilesets, imagenes }, sprite] = await Promise.all([
    cargarTilesets('bosque'),
    cargarSprite(heroe.sprite),
  ]);
  const tam = tilesets[0]?.tileSize ?? 32;
  const plantillas: PlantillasJson = plantillasBosque;
  // ?semilla=N repite una partida; sin ella, cada carga es distinta.
  const pedida = Number(new URLSearchParams(location.search).get('semilla'));
  const semilla =
    Number.isInteger(pedida) && pedida > 0 ? pedida : Math.floor(Math.random() * 2 ** 31);
  // shortcut: solo el Bosque; el paso a la siguiente zona llega al final del hito 2.
  const zona = generarZona({ ...zonas.generacion, salas: zonas.zonas.bosque.salas }, semilla);
  console.info('Semilla de la zona:', zona.semilla);

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
  const acciones: Acciones = {
    moverX: 0,
    moverY: 0,
    confirmar: false,
    cancelar: false,
    menu: false,
  };
  const heroina = crearHeroina(heroe, 0, 0); // la escena la coloca en la sala de inicio
  const escena: Escena = new EscenaMapa(
    zona,
    plantillas,
    crearCatalogo(tilesets),
    imagenes,
    tam,
    heroina,
    sprite,
  );
  escena.enter();

  iniciarBucle(
    (dt) => {
      leerFuentes(fuentes, acciones);
      escena.update(dt, acciones);
    },
    (alpha) => escena.draw(ctx, alpha),
  );
}

iniciar().catch((error: unknown) => {
  // Sin esto, en un móvil un fallo de carga es solo una pantalla negra.
  document.body.style.color = '#fff';
  document.body.textContent = `Error al iniciar: ${error instanceof Error ? error.message : String(error)}`;
  throw error;
});
