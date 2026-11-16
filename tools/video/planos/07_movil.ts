/** Plano 7: el juego en un móvil en vertical (390×844), la heroína andando por el Bosque. */
import { empezarPartida, grabarPlano, mantener } from '../grabar.ts';

console.log(
  await grabarPlano('07_movil', {
    url: 'semilla=7',
    ancho: 390,
    alto: 844,
    preparar: (p) => empezarPartida(p, 'ronin'),
    coreografia: async (p) => {
      await mantener(p, 'ArrowRight', 2);
      await mantener(p, 'ArrowDown', 1.2);
      await mantener(p, 'ArrowLeft', 3);
      await mantener(p, 'ArrowUp', 1.5);
    },
  }),
);
