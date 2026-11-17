/** Muestras de las frases 1 y 6 con las dos voces masculinas españolas de Kokoro, para que Pedro elija (Task 2). */
import { join } from 'node:path';
import { GUION } from './guion.ts';
import { SALIDA } from './rutas.ts';
import { generarVoz } from './voz.ts';

for (const voz of ['em_alex', 'em_santa']) {
  for (const i of [0, 5]) {
    const s = await generarVoz(GUION[i]!.voz, voz, join(SALIDA, 'muestras', `${voz}_frase${i + 1}.wav`));
    console.log(voz, `frase ${i + 1}`, `${s.toFixed(1)} s`);
  }
}
