import type { Acciones } from './core/acciones';
import controles from './data/controles.json';
import type { Escena } from './escenas/escena';
import { EscenaPrueba } from './escenas/prueba';
import { leerFuentes } from './input/fuente';
import { crearJoystick } from './input/joystick';
import { crearTeclado } from './input/teclado';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';

const canvas = document.querySelector<HTMLCanvasElement>('#juego');
if (!canvas) throw new Error('Falta el canvas #juego');
const ctx = prepararPantalla(canvas);

// El joystick escucha en todo el body: se puede tocar también en las franjas negras fuera del canvas.
const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
const acciones: Acciones = { moverX: 0, moverY: 0, confirmar: false, cancelar: false, menu: false };
const escena: Escena = new EscenaPrueba();
escena.enter();

iniciarBucle(
  (dt) => {
    leerFuentes(fuentes, acciones);
    escena.update(dt, acciones);
  },
  (alpha) => escena.draw(ctx, alpha),
);
