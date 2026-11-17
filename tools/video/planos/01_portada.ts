/** Plano 1: la portada 3D con la música del título. */
import { esperar, grabarPlano } from '../grabar.ts';

console.log(
  await grabarPlano('01_portada', {
    url: 'semilla=7',
    coreografia: async () => {
      await esperar(13);
    },
  }),
);
