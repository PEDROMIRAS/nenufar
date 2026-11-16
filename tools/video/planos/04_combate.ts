/**
 * Plano 4: la ronin ataca a un limo, el limo «se hincha...» (semilla 3: lo hace tras el primer ataque), ella se
 * defiende y lo remata; después la maga lanza fuego morado. Menú: Atacar, Habilidad, Objeto, Defender, Huir.
 */
import { empezarPartida, esperar, grabarPlano, pulsar } from '../grabar.ts';

console.log(
  await grabarPlano('04a_ronin', {
    url: 'semilla=3&combate=limo',
    preparar: (p) => empezarPartida(p, 'ronin', false),
    coreografia: async (p) => {
      await esperar(2);
      await pulsar(p, 'Enter', 4.5);
      for (let i = 0; i < 3; i++) await pulsar(p, 'ArrowDown', 0.35);
      await pulsar(p, 'Enter', 4.5);
      await pulsar(p, 'Enter', 4.5);
    },
  }),
);
console.log(
  await grabarPlano('04b_maga', {
    url: 'semilla=3&combate=limo,limo',
    preparar: (p) => empezarPartida(p, 'maga', false),
    coreografia: async (p) => {
      await esperar(2);
      await pulsar(p, 'ArrowDown', 0.5);
      await pulsar(p, 'Enter', 0.8);
      await pulsar(p, 'Enter', 0.8);
      await pulsar(p, 'Enter', 5);
    },
  }),
);
