/** Plano 6: los jefes de cada zona y, al final, el Rey sin Charca. */
import { empezarPartida, esperar, grabarPlano } from '../grabar.ts';

for (const [i, jefe] of ['rey_limo', 'golem', 'reina_arana', 'sacerdote', 'rey_sin_charca'].entries()) {
  console.log(
    await grabarPlano(`06${'abcde'[i]}_${jefe}`, {
      url: `semilla=7&combate=${jefe}`,
      preparar: (p) => empezarPartida(p, 'ronin', false),
      coreografia: () => esperar(4.5),
    }),
  );
}
