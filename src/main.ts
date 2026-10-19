import type { Acciones } from './core/acciones';
import { crearAzar } from './core/azar';
import { construirSala, crearCatalogo, type PlantillasJson } from './core/sala';
import controles from './data/controles.json';
import plantillasBosque from './data/salas/plantillas_bosque.json';
import type { Escena } from './escenas/escena';
import { EscenaSala } from './escenas/sala';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';
import { cargarTilesets } from './render/recursos';

async function iniciar(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#juego');
  if (!canvas) throw new Error('Falta el canvas #juego');
  const ctx = prepararPantalla(canvas);

  const { tilesets, imagenes } = await cargarTilesets('bosque');
  const plantillas: PlantillasJson = plantillasBosque;
  const mapa = plantillas.plantillas[0]?.mapa;
  if (!mapa) throw new Error('No hay plantillas del Bosque');
  // shortcut: sala y semilla fijas; el hito 2 genera la zona.
  const sala = construirSala(mapa, plantillas, crearCatalogo(tilesets), crearAzar(1));

  // El joystick escucha en todo el body: se puede tocar también en las franjas negras fuera del canvas.
  const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
  const acciones: Acciones = {
    moverX: 0,
    moverY: 0,
    confirmar: false,
    cancelar: false,
    menu: false,
  };
  const escena: Escena = new EscenaSala(sala, imagenes, tilesets[0]?.tileSize ?? 32);
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
