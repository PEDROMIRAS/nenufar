/** Solo para el audio: la música del Bosque con la heroína quieta, para los planos 1 y 2 (la portada y la elección de rana no tienen música). */
import { empezarPartida, esperar, grabarPlano } from '../grabar.ts';

console.log(
  await grabarPlano('00_musica_bosque', {
    url: 'semilla=7',
    preparar: (p) => empezarPartida(p, 'ronin', { pistas: false }),
    coreografia: () => esperar(25),
  }),
);
