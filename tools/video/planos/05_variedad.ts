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
    // ?altar abre su elección nada más elegir la dificultad: sin páginas de historia.
    preparar: (p) => empezarPartida(p, 'ronin', { pistas: false, paginas: 0 }),
    coreografia: async (p) => {
      await esperar(1.5);
      await pulsar(p, 'ArrowDown', 1.5);
      await pulsar(p, 'ArrowUp', 1.5);
    },
  }),
);
console.log(
  await grabarPlano('05c_desafio', {
    url: 'semilla=7&desafio',
    preparar: (p) => empezarPartida(p, 'ronin'),
    coreografia: async (p) => {
      // Empieza justo encima del círculo: lo rodea por la derecha sin tocarlo (tocarlo abriría su elección).
      await mantener(p, 'ArrowRight', 1);
      await mantener(p, 'ArrowDown', 1.3);
      await mantener(p, 'ArrowLeft', 1);
      await esperar(0.5);
    },
  }),
);
// La partida empieza junto al ermitaño y su elección se abre sola: se cierra (Escape = marcharse) para verlo
// en su sala, la heroína se aparta y vuelve a él.
console.log(
  await grabarPlano('05d_ermitano', {
    url: 'semilla=7&ermitano',
    preparar: async (p) => {
      await empezarPartida(p, 'ronin');
      await pulsar(p, 'Escape', 0.5);
      await mantener(p, 'ArrowDown', 1);
    },
    coreografia: async (p) => {
      await esperar(1.5);
      await mantener(p, 'ArrowUp', 1.2);
      await esperar(2);
    },
  }),
);
