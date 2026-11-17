/**
 * Plano 6: la presentación de los jefes de cada zona (la sala tiembla y sale su nombre) y, al final, el Rey
 * sin Charca. ?combate=<jefe>&presentar pasa por la presentación antes del combate, con la sala de la zona
 * ?zona=N de fondo. La dificultad se elige ya grabando: la presentación dura 1,6 s y empieza al elegirla.
 */
import { esperar, grabarPlano, pulsar } from '../grabar.ts';

const JEFES = [
  ['rey_limo', 0],
  ['golem', 1],
  ['reina_arana', 2],
  ['sacerdote', 3],
  ['rey_sin_charca', 3],
] as const;

for (const [i, [jefe, zona]] of JEFES.entries()) {
  console.log(
    await grabarPlano(`06${'abcde'[i]}_${jefe}`, {
      url: `semilla=7&zona=${zona}&combate=${jefe}&presentar`,
      // Portada, heroína y nombre; la dificultad, ya grabando.
      preparar: async (p) => {
        for (let k = 0; k < 3; k++) await pulsar(p, 'Enter', 0.8);
      },
      coreografia: async (p) => {
        await pulsar(p, 'Enter', 0);
        await esperar(5);
      },
    }),
  );
}
