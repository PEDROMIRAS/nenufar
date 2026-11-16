/** Plano 5: un presagio, el altar, el círculo del desafío y el ermitaño. */
import { empezarPartida, esperar, grabarPlano, mantener, pulsar } from '../grabar.ts';

console.log(
  await grabarPlano('05a_presagio', {
    url: 'semilla=7&presagio=luna_roja',
    preparar: async (p) => {
      await pulsar(p, 'Enter', 0.8);
      for (let i = 0; i < 7; i++) await pulsar(p, 'Enter', 0.8);
      await esperar(1);
    },
    coreografia: async (p) => {
      await pulsar(p, 'Enter', 4);
    },
  }),
);
console.log(
  await grabarPlano('05b_altar', {
    url: 'semilla=7&altar',
    preparar: (p) => empezarPartida(p, 'ronin', false),
    coreografia: async (p) => {
      await esperar(1.5);
      await pulsar(p, 'ArrowDown', 1.5);
      await pulsar(p, 'ArrowUp', 1.5);
    },
  }),
);
for (const evento of ['desafio', 'ermitano']) {
  console.log(
    await grabarPlano(`05${evento === 'desafio' ? 'c' : 'd'}_${evento}`, {
      url: `semilla=7&${evento}`,
      preparar: (p) => empezarPartida(p, 'ronin'),
      coreografia: async (p) => {
        await mantener(p, 'ArrowUp', 1.2);
        await mantener(p, 'ArrowRight', 1.2);
        await esperar(1.5);
      },
    }),
  );
}
