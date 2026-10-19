import type { Acciones } from './core/acciones';
import { crearAzar } from './core/azar';
import { crearHeroina } from './core/heroina';
import { buscarInicio } from './core/movimiento';
import { construirSala, crearCatalogo } from './core/sala';
import type { HeroeJson, PlantillasJson } from './core/types';
import controles from './data/controles.json';
import heroes from './data/heroes.json';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import type { Escena } from './escenas/escena';
import { EscenaSala } from './escenas/sala';
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
  const mapa = plantillas.plantillas[0]?.mapa;
  if (!mapa) throw new Error('No hay plantillas del Bosque');
  // shortcut: sala y semilla fijas; el hito 2 genera la zona.
  const sala = construirSala(mapa, plantillas, crearCatalogo(tilesets), crearAzar(1));

  // El joystick escucha en todo el body: también responde en las franjas negras fuera del canvas.
  const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
  const acciones: Acciones = {
    moverX: 0,
    moverY: 0,
    confirmar: false,
    cancelar: false,
    menu: false,
  };
  const inicio = buscarInicio(sala, tam, heroe.caja.ancho, heroe.caja.alto);
  const heroina = crearHeroina(heroe, inicio.x, inicio.y);
  const escena: Escena = new EscenaSala(sala, imagenes, tam, heroina, sprite);
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
