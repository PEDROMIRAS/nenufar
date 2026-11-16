/**
 * La voz en off: cada frase se pide a la API local de VoiceStudio (compatible con OpenAI, puerto 3900) con el
 * motor OmniVoice y una voz diseñada por atributos (sin clonar a nadie). Devuelve la duración medida con ffprobe.
 *
 * VoiceStudio tiene que estar abierto. Ojo: desde el terminal de VS Code hay que lanzarlo sin la variable
 * ELECTRON_RUN_AS_NODE (`env -u ELECTRON_RUN_AS_NODE /Applications/VoiceStudio.app/Contents/MacOS/VoiceStudio`),
 * o arranca como Node y se cierra.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const API = 'http://localhost:3900/v1/audio/speech';

export interface Voz {
  /** Atributos de diseño de OmniVoice (género, edad, tono), p. ej. «male, elderly, very low pitch». */
  atributos: string;
  /** Velocidad (1 = normal); por debajo de 1, más pausada. */
  velocidad: number;
}

/** Genera `texto` con la voz `voz` en `salida` (.wav) y devuelve su duración en segundos. */
export async function generarVoz(texto: string, voz: Voz, salida: string): Promise<number> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'omnivoice',
      voice: 'onyx',
      input: texto,
      instructions: voz.atributos,
      speed: voz.velocidad,
      response_format: 'wav',
    }),
    signal: AbortSignal.timeout(30 * 60_000),
  });
  if (!r.ok) throw new Error(`VoiceStudio respondió ${r.status}: ${await r.text()}`);
  mkdirSync(dirname(salida), { recursive: true });
  writeFileSync(salida, Buffer.from(await r.arrayBuffer()));
  return duracion(salida);
}

/** Duración de un archivo de audio o vídeo, en segundos. */
export function duracion(archivo: string): number {
  const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]);
  return Number(s.toString().trim());
}
