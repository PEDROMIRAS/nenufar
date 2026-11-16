/** Plano 2: elegir heroína; el cursor pasa de la ronin a la maga y vuelve. */
import { esperar, grabarPlano, pulsar } from '../grabar.ts';

console.log(
  await grabarPlano('02_ranas', {
    url: 'semilla=7',
    preparar: (p) => pulsar(p, 'Enter', 1.2),
    coreografia: async (p) => {
      await esperar(2.5);
      await pulsar(p, 'ArrowRight', 3.5);
      await pulsar(p, 'ArrowLeft', 3);
    },
  }),
);
