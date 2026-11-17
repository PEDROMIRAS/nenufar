/**
 * Plano 4: la ronin usa Corte rápido contra un limo, el limo «se hincha...», ella se defiende y lo remata;
 * después la maga lanza fuego morado. Menú: Atacar, Habilidad, Objeto, Defender, Huir. Con un solo enemigo
 * no se elige objetivo. ?combate abre el combate nada más elegir la dificultad (sin páginas de historia).
 */
import { empezarPartida, esperar, grabarPlano, pulsar } from '../grabar.ts';

/**
 * Lleva el cursor del menú principal de la fila `desde` a la fila `hasta` (0 = Atacar) bajando: el menú da la
 * vuelta y recuerda la última opción elegida.
 */
async function fila(p: import('playwright').Page, desde: number, hasta: number): Promise<void> {
  for (let i = 0; i < (hasta - desde + 5) % 5; i++) await pulsar(p, 'ArrowDown', 0.3);
}

console.log(
  await grabarPlano('04a_ronin', {
    url: 'semilla=3&combate=limo',
    preparar: (p) => empezarPartida(p, 'ronin', { pistas: false, paginas: 0 }),
    coreografia: async (p) => {
      await esperar(1.5);
      await fila(p, 0, 1);
      await pulsar(p, 'Enter', 0.6); // Habilidad
      await pulsar(p, 'Enter', 5); // Corte rápido
      await fila(p, 1, 3);
      await pulsar(p, 'Enter', 5.5); // Defender
      await fila(p, 3, 0);
      await pulsar(p, 'Enter', 5); // Atacar
    },
  }),
);
console.log(
  await grabarPlano('04b_maga', {
    url: 'semilla=3&combate=limo,limo',
    preparar: (p) => empezarPartida(p, 'maga', { pistas: false, paginas: 0 }),
    coreografia: async (p) => {
      await esperar(1.5);
      await fila(p, 0, 1);
      await pulsar(p, 'Enter', 0.6); // Habilidad
      await pulsar(p, 'Enter', 0.6); // Fuego morado
      await pulsar(p, 'Enter', 5); // Limo A
    },
  }),
);
