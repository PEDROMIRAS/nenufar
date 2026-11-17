/**
 * La voz en off: cada frase se pide a la API local de VoiceStudio (compatible con OpenAI, puerto 3900) con el
 * motor mlx-audio y su modelo Qwen3-TTS VoiceDesign (licencia Apache), que construye la voz a partir de una
 * descripción escrita (sin clonar a nadie). La semilla fija hace que las siete frases salgan con la misma voz.
 * Después se rebajan las eses (de-esser) y se normaliza el volumen, sin eco (Pedro: «suena mucho eco, muchas ss»).
 * Devuelve la duración medida con ffprobe.
 *
 * VoiceStudio tiene que estar abierto con Qwen3-TTS como modelo de mlx-audio (POST /engines/select con
 * `{"family":"tts","backend_id":"mlx-audio","model_id":"qwen3-tts"}`). Ojo: desde el terminal de VS Code hay
 * que lanzarlo sin la variable ELECTRON_RUN_AS_NODE
 * (`env -u ELECTRON_RUN_AS_NODE /Applications/VoiceStudio.app/Contents/MacOS/VoiceStudio`), o arranca como
 * Node y se cierra.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const API = 'http://localhost:3900/v1/audio/speech';

/** La voz que eligió Pedro (la 3 de las muestras del 2026-11-17). */
export const VOZ =
  'Narrador de tráiler de videojuego, voz masculina muy grave y oscura, español de España, ritmo lento, tono íntimo y enigmático.';

/** Semilla del muestreo: misma semilla, misma voz en todas las frases. */
export const SEMILLA = 7;

/** Rebaja las eses y los agudos, da un poco de cuerpo y normaliza a −18 LUFS. */
const RETOQUE = 'aresample=48000,deesser=i=0.6:m=0.6:f=0.4,highshelf=g=-4:f=6000,bass=g=2:f=120,loudnorm=I=-18';

/** Genera `texto` con la voz descrita en `voz` en `salida` (.wav) y devuelve su duración en segundos. */
export async function generarVoz(texto: string, voz: string, salida: string): Promise<number> {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mlx-audio',
      voice: 'onyx',
      language: 'es',
      input: texto,
      instructions: voz,
      seed: SEMILLA,
      response_format: 'wav',
    }),
    signal: AbortSignal.timeout(10 * 60_000),
  });
  if (!r.ok) throw new Error(`VoiceStudio respondió ${r.status}: ${await r.text()}`);
  mkdirSync(dirname(salida), { recursive: true });
  const cruda = salida.replace(/\.wav$/, '_cruda.wav');
  writeFileSync(cruda, Buffer.from(await r.arrayBuffer()));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', cruda, '-af', RETOQUE, salida]);
  return duracion(salida);
}

/** Duración de un archivo de audio o vídeo, en segundos. */
export function duracion(archivo: string): number {
  const s = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', archivo]);
  return Number(s.toString().trim());
}
