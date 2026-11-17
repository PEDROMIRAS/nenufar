/** Genera las siete frases del guion con la voz elegida en `salida/voces/<plano>.wav` y muestra sus duraciones. */
import { join } from 'node:path';
import { GUION } from './guion.ts';
import { SALIDA } from './rutas.ts';
import { VOZ, generarVoz } from './voz.ts';

for (const plano of GUION) {
  const s = await generarVoz(plano.voz, VOZ, join(SALIDA, 'voces', `${plano.id}.wav`));
  console.log(plano.id, `${s.toFixed(2)} s`);
}
