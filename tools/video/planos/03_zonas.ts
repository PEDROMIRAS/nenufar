/**
 * Plano 3: la ronin baja por la sala de inicio del Bosque y sale por su arco (arriba en el centro, justo encima
 * de donde aparece; anda a 96 px/s); después un momento de las Ruinas, la Cripta y el Cauce Seco.
 */
import { empezarPartida, esperar, grabarPlano, mantener } from '../grabar.ts';

console.log(
  await grabarPlano('03a_bosque', {
    url: 'semilla=7',
    preparar: (p) => empezarPartida(p, 'ronin'),
    coreografia: async (p) => {
      await mantener(p, 'ArrowDown', 1.2);
      await mantener(p, 'ArrowUp', 3.2);
      await esperar(1.5);
      await mantener(p, 'ArrowUp', 1.2);
    },
  }),
);
// Con la semilla 7, las Ruinas salen con presagio: su página va tras el cartel.
for (const [zona, paginas] of [
  [1, 6],
  [2, 5],
  [3, 5],
] as const) {
  console.log(
    await grabarPlano(`03${'bcd'[zona - 1]}_zona${zona}`, {
      url: `semilla=7&zona=${zona}`,
      preparar: (p) => empezarPartida(p, 'ronin', { paginas }),
      coreografia: async (p) => {
        await mantener(p, 'ArrowRight', 1.5);
        await mantener(p, 'ArrowDown', 1.2);
        await mantener(p, 'ArrowLeft', 1.3);
      },
    }),
  );
}
