/** Plano 3: la ronin cruza una sala del Bosque y después un momento de las Ruinas, la Cripta y el Cauce Seco. */
import { empezarPartida, grabarPlano, mantener } from '../grabar.ts';

console.log(
  await grabarPlano('03a_bosque', {
    url: 'semilla=7',
    preparar: (p) => empezarPartida(p, 'ronin'),
    coreografia: async (p) => {
      await mantener(p, 'ArrowRight', 1.6);
      await mantener(p, 'ArrowDown', 1.2);
      await mantener(p, 'ArrowLeft', 2.4);
      await mantener(p, 'ArrowUp', 1.6);
    },
  }),
);
for (const zona of [1, 2, 3]) {
  console.log(
    await grabarPlano(`03${'bcd'[zona - 1]}_zona${zona}`, {
      url: `semilla=7&zona=${zona}`,
      preparar: (p) => empezarPartida(p, 'ronin'),
      coreografia: async (p) => {
        await mantener(p, 'ArrowRight', 1.5);
        await mantener(p, 'ArrowDown', 1.2);
        await mantener(p, 'ArrowLeft', 1.3);
      },
    }),
  );
}
