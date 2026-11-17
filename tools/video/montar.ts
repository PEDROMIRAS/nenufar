/**
 * Montaje (Task 5): cada plano dura lo que su voz más un respiro (`calcularTiempos`) y se compone con trozos de
 * sus tomas; entre planos, fundidos de 0,5 s; la voz entra un poco después de empezar su plano, el sonido del
 * juego baja mientras habla (sidechaincompress) y bajo los planos 1 y 2, que no tienen música en el juego, suena
 * la del Bosque. El plano 7 (móvil, en vertical) va sobre su propia toma ampliada y desenfocada.
 *
 * Uso: `npx tsx montar.ts` (las voces tienen que estar ya en salida/voces: `npx tsx voces.ts`).
 * Sale `salida/nenufar_demo_sin_rotulos.mp4`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { GUION } from './guion.ts';
import { SALIDA } from './rutas.ts';
import { calcularTiempos } from './tiempos.ts';
import { duracion } from './voz.ts';

const FUNDIDO = 0.5;
/** Cuánto después de empezar su plano entra la voz. */
const ENTRADA_VOZ = 0.4;
const PLANOS = join(SALIDA, 'planos');
const MONTAJE = join(SALIDA, 'montaje');

/** Un trozo de toma: archivo (sin .mp4), segundo de la toma donde empieza y su peso en el reparto del plano. */
type Trozo = [toma: string, desde: number, peso: number];

/**
 * Qué se ve en cada plano. El tiempo del plano se reparte entre sus trozos según su peso; si una toma se queda
 * corta, se congela su último fotograma.
 */
const TROZOS: Record<string, Trozo[]> = {
  '01_portada': [['01_portada', 0, 1]],
  '02_ranas': [['02_ranas', 0, 1]],
  '03_zonas': [
    ['03a_bosque', 0, 6.5],
    ['03b_zona1', 0.3, 3.2],
    ['03c_zona2', 0.3, 3.2],
    ['03d_zona3', 0.3, 3.2],
  ],
  // La ronin: Corte rápido, el limo se hincha, se defiende y aguanta el golpe. La maga: fuego morado.
  '04_combate': [
    ['04a_ronin', 1, 12],
    ['04b_maga', 1.5, 5.7],
  ],
  '05_variedad': [
    ['05a_presagio', 0.3, 1],
    ['05b_altar', 0.5, 1],
    ['05c_desafio', 0.3, 1],
    ['05d_ermitano', 0, 1],
  ],
  // Final del cartel con el nombre y el jefe ya en el combate; el Rey sin Charca, más tiempo.
  '06_jefes': [
    ['06a_rey_limo', 0.9, 1],
    ['06b_golem', 0.9, 1],
    ['06c_reina_arana', 0.9, 1],
    ['06d_sacerdote', 0.9, 1],
    ['06e_rey_sin_charca', 0.9, 1.6],
  ],
  '07_movil': [['07_movil', 0, 1]],
};

/** Los planos sin música en el juego, que llevan debajo la del Bosque. */
const CON_MUSICA = new Set(['01_portada', '02_ranas']);
const MUSICA = join(PLANOS, '00_musica_bosque.mp4');

function ffmpeg(args: string[]): void {
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
}

/** Compone el plano `id` de `largo` segundos en `salida` (1920×1080, 60 fps, audio del juego a 48 kHz). */
function componerPlano(id: string, largo: number, salida: string): void {
  const trozos = TROZOS[id];
  if (!trozos) throw new Error(`Sin trozos para el plano ${id}`);
  const pesos = trozos.reduce((s, [, , p]) => s + p, 0);
  const entradas: string[] = [];
  const filtros: string[] = [];
  trozos.forEach(([toma, desde, peso], i) => {
    const l = (largo * peso) / pesos;
    entradas.push('-ss', String(desde), '-i', join(PLANOS, `${toma}.mp4`));
    const vertical = id === '07_movil';
    filtros.push(
      vertical
        ? // Fondo: la misma toma ampliada hasta cubrir y desenfocada; encima, la toma entera a lo alto.
          `[${i}:v]fps=60,split[f${i}][d${i}];` +
            `[f${i}]scale=1920:-2,crop=1920:1080,boxblur=40:2,eq=brightness=-0.15[fb${i}];` +
            `[d${i}]scale=-2:1080[db${i}];[fb${i}][db${i}]overlay=(W-w)/2:0,setsar=1,` +
            `tpad=stop_mode=clone:stop_duration=10,trim=duration=${l},setpts=PTS-STARTPTS[v${i}]`
        : `[${i}:v]fps=60,scale=1920:1080,setsar=1,tpad=stop_mode=clone:stop_duration=10,` +
            `trim=duration=${l},setpts=PTS-STARTPTS[v${i}]`,
      `[${i}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${l},asetpts=PTS-STARTPTS[a${i}]`,
    );
  });
  const pares = trozos.map((_, i) => `[v${i}][a${i}]`).join('');
  filtros.push(`${pares}concat=n=${trozos.length}:v=1:a=1[v][a]`);
  ffmpeg([
    ...entradas,
    '-filter_complex',
    filtros.join(';'),
    '-map',
    '[v]',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-crf',
    '14',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'pcm_s16le',
    salida.replace(/\.mp4$/, '.mov'),
  ]);
}

mkdirSync(MONTAJE, { recursive: true });
const voces = GUION.map((p) => join(SALIDA, 'voces', `${p.id}.wav`));
const tiempos = calcularTiempos(voces.map(duracion));
const total = tiempos.at(-1)!.inicio + tiempos.at(-1)!.duracion;
console.log(`Total: ${total.toFixed(2)} s`);

// 1. Cada plano por separado; todos menos el último, medio segundo más para el fundido con el siguiente.
const segmentos = GUION.map((p, i) => {
  const largo = tiempos[i]!.duracion + (i < GUION.length - 1 ? FUNDIDO : 0);
  const salida = join(MONTAJE, `${p.id}.mp4`);
  componerPlano(p.id, largo, salida);
  console.log(p.id, `${largo.toFixed(2)} s`);
  return salida.replace(/\.mp4$/, '.mov');
});

// 2. Unirlos con fundidos (cada plano empieza en su `inicio`), mezclar voces, música y juego.
const n = GUION.length;
const entradas = [...segmentos.flatMap((s) => ['-i', s]), ...voces.flatMap((v) => ['-i', v]), '-i', MUSICA];
const f: string[] = [];
let v = '[0:v]';
let a = '[0:a]';
for (let i = 1; i < n; i++) {
  const offset = tiempos[i]!.inicio;
  f.push(`${v}[${i}:v]xfade=transition=fade:duration=${FUNDIDO}:offset=${offset}[xv${i}]`);
  f.push(`${a}[${i}:a]acrossfade=d=${FUNDIDO}[xa${i}]`);
  v = `[xv${i}]`;
  a = `[xa${i}]`;
}
f.push(`${v}fade=t=in:d=0.6,fade=t=out:st=${total - 1.2}:d=1.2[vid]`);
// Voces, cada una en su sitio.
GUION.forEach((_, i) => {
  const ms = Math.round((tiempos[i]!.inicio + ENTRADA_VOZ) * 1000);
  f.push(`[${n + i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}:all=1[voz${i}]`);
});
f.push(`${GUION.map((_, i) => `[voz${i}]`).join('')}amix=inputs=${n}:normalize=0,apad,atrim=duration=${total}[voces]`);
f.push('[voces]asplit[vozmezcla][vozllave]');
// Música del Bosque bajo los planos sin música, que se apaga al entrar el primero que la tiene.
const sinMusica = GUION.findIndex((p) => !CON_MUSICA.has(p.id));
const finMusica = tiempos[sinMusica]!.inicio;
f.push(
  `[${2 * n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=duration=${finMusica + 1},` +
    `afade=t=out:st=${finMusica - 0.5}:d=1.5,apad,atrim=duration=${total}[musica]`,
);
f.push(`${a}[musica]amix=inputs=2:normalize=0,volume=1.6[juego]`);
f.push('[juego][vozllave]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=500[juegobajo]');
f.push(
  `[juegobajo][vozmezcla]amix=inputs=2:normalize=0,afade=t=in:d=0.6,afade=t=out:st=${total - 1.5}:d=1.5,` +
    'loudnorm=I=-16:TP=-1.5,aresample=48000[aud]',
);

const salida = join(SALIDA, 'nenufar_demo_sin_rotulos.mp4');
ffmpeg([
  ...entradas,
  '-filter_complex',
  f.join(';'),
  '-map',
  '[vid]',
  '-map',
  '[aud]',
  '-t',
  String(total),
  '-c:v',
  'libx264',
  '-crf',
  '18',
  '-preset',
  'slow',
  '-pix_fmt',
  'yuv420p',
  '-r',
  '60',
  '-c:a',
  'aac',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  salida,
]);
console.log(salida);
