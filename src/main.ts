import type { Acciones } from './core/acciones';
import type { Escena } from './escenas/escena';
import { EscenaPrueba } from './escenas/prueba';
import { iniciarBucle } from './render/bucle';
import { prepararPantalla } from './render/pantalla';

const canvas = document.querySelector<HTMLCanvasElement>('#juego');
if (!canvas) throw new Error('Falta el canvas #juego');
const ctx = prepararPantalla(canvas);

// Sin fuentes de entrada todavía (paso 3): acciones en reposo.
const acciones: Acciones = { moverX: 0, moverY: 0, confirmar: false, cancelar: false, menu: false };
const escena: Escena = new EscenaPrueba();
escena.enter();

iniciarBucle(
  (dt) => escena.update(dt, acciones),
  (alpha) => escena.draw(ctx, alpha),
);
