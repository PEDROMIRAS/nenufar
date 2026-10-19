import { fijarDireccion } from '../core/direccion';
import type { FuenteEntrada } from './fuente';

// `event.code` es la tecla física: WASD funciona igual en QWERTY y AZERTY.
const IZQUIERDA = ['ArrowLeft', 'KeyA'];
const DERECHA = ['ArrowRight', 'KeyD'];
const ARRIBA = ['ArrowUp', 'KeyW'];
const ABAJO = ['ArrowDown', 'KeyS'];
const CONFIRMAR = ['Enter', 'Space', 'KeyZ'];
const CANCELAR = ['Escape', 'KeyX'];
// Escape es CANCELAR en los menús y MENU en el mapa (documento de diseño); cada escena lee la que le toca.
const MENU = ['Escape'];
const PROPIAS = new Set([
  ...IZQUIERDA,
  ...DERECHA,
  ...ARRIBA,
  ...ABAJO,
  ...CONFIRMAR,
  ...CANCELAR,
  ...MENU,
]);

export function crearTeclado(): FuenteEntrada {
  const sostenidas = new Set<string>();
  // Pulsadas desde el último paso: un toque corto entre dos pasos no se pierde.
  const nuevas = new Set<string>();

  addEventListener('keydown', (e) => {
    if (!PROPIAS.has(e.code)) return;
    e.preventDefault(); // que flechas y espacio no desplacen la página
    sostenidas.add(e.code);
    if (!e.repeat) nuevas.add(e.code);
  });
  addEventListener('keyup', (e) => sostenidas.delete(e.code));
  // Al perder el foco no llega el keyup: sin esto la heroína seguiría andando sola.
  addEventListener('blur', () => sostenidas.clear());

  const alguna = (codigos: string[], en: Set<string>): boolean => codigos.some((c) => en.has(c));
  const eje = (negativo: string[], positivo: string[]): number =>
    (alguna(positivo, sostenidas) ? 1 : 0) - (alguna(negativo, sostenidas) ? 1 : 0);

  return {
    leer(acciones) {
      fijarDireccion(acciones, eje(IZQUIERDA, DERECHA), eje(ARRIBA, ABAJO), 0);
      if (alguna(CONFIRMAR, nuevas)) acciones.confirmar = true;
      if (alguna(CANCELAR, nuevas)) acciones.cancelar = true;
      if (alguna(MENU, nuevas)) acciones.menu = true;
      nuevas.clear();
    },
  };
}
