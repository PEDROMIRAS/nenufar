/** Muestras de la frase 1 con varias voces graves, para que Pedro elija (Task 2 del plan). */
import { join } from 'node:path';
import { GUION } from './guion.ts';
import { SALIDA } from './rutas.ts';
import { generarVoz, type Voz } from './voz.ts';

const VOCES: Record<string, Voz> = {
  a_madura_grave: { atributos: 'male, middle-aged, low pitch', velocidad: 0.92 },
  b_anciano_muy_grave: { atributos: 'male, elderly, very low pitch', velocidad: 0.9 },
  c_madura_muy_grave: { atributos: 'male, middle-aged, very low pitch', velocidad: 0.95 },
};

for (const [nombre, voz] of Object.entries(VOCES)) {
  const t0 = Date.now();
  const s = await generarVoz(GUION[0]!.voz, voz, join(SALIDA, 'muestras', `${nombre}.wav`));
  console.log(nombre, `${s.toFixed(1)} s de voz`, `${((Date.now() - t0) / 1000).toFixed(0)} s en generar`);
}
