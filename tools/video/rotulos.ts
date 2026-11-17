/**
 * Rótulos del tercio inferior (spec: discretos, abajo a la izquierda, blanco al 85 %, con sombra y fundido).
 * Este ffmpeg no tiene `drawtext`: cada rótulo se dibuja como PNG transparente de 1920×1080 con Chrome (la
 * misma monoespaciada en negrita que el juego) y se superpone al montaje sin rótulos, así que no hace falta
 * volver a montar. Uso: `npx tsx rotulos.ts` tras `npx tsx montar.ts`. Sale `salida/nenufar_demo.mp4`.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { GUION } from './guion.ts';
import { SALIDA } from './rutas.ts';
import { calcularTiempos } from './tiempos.ts';
import { duracion } from './voz.ts';

/** Cuánto después de empezar su plano aparece el rótulo y cuánto antes de acabar se va. */
const ENTRA = 1;
const SALE = 0.8;
const FUNDIDO = 0.4;

/**
 * Dónde va cada rótulo (CSS). Por defecto, abajo a la izquierda; en el combate el panel de acciones ocupa el
 * tercio inferior, así que va a la derecha, en la franja libre entre los monstruos y el panel.
 */
const POSICION: Record<string, string> = { '04_combate': 'right:72px;bottom:485px' };
const POR_DEFECTO = 'left:72px;bottom:72px';

const DIR = join(SALIDA, 'rotulos');
mkdirSync(DIR, { recursive: true });
const tiempos = calcularTiempos(GUION.map((p) => duracion(join(SALIDA, 'voces', `${p.id}.wav`))));

const navegador = await chromium.launch({ channel: 'chrome' });
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } });
const rotulos: { png: string; desde: number; hasta: number }[] = [];
for (const [i, plano] of GUION.entries()) {
  if (!plano.rotulo) continue;
  const texto = plano.rotulo.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await pagina.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="position:absolute;${POSICION[plano.id] ?? POR_DEFECTO};font:bold 28px Menlo,monospace;color:rgba(255,255,255,.85);
      letter-spacing:.02em;text-shadow:0 2px 6px rgba(0,0,0,.9),0 0 2px rgba(0,0,0,.9);
      padding:10px 18px;background:rgba(10,8,20,.35);border-left:3px solid rgba(190,170,255,.8)">${texto}</div>
    </body></html>`);
  const png = join(DIR, `${plano.id}.png`);
  await pagina.screenshot({ path: png, omitBackground: true });
  const { inicio, duracion: d } = tiempos[i]!;
  rotulos.push({ png, desde: inicio + ENTRA, hasta: inicio + d - SALE });
}
await navegador.close();

// Cada PNG entra con un fundido de opacidad y se superpone solo en su intervalo.
const base = join(SALIDA, 'nenufar_demo_sin_rotulos.mp4');
const f: string[] = [];
let v = '[0:v]';
rotulos.forEach(({ desde, hasta }, i) => {
  const largo = hasta - desde;
  f.push(
    `[${i + 1}:v]format=rgba,fade=t=in:st=0:d=${FUNDIDO}:alpha=1,fade=t=out:st=${largo - FUNDIDO}:d=${FUNDIDO}:alpha=1,` +
      `setpts=PTS-STARTPTS+${desde}/TB[r${i}]`,
  );
  f.push(`${v}[r${i}]overlay=0:0:enable='between(t,${desde},${hasta})'[o${i}]`);
  v = `[o${i}]`;
});
const salida = join(SALIDA, 'nenufar_demo.mp4');
execFileSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-y',
    '-i',
    base,
    ...rotulos.flatMap(({ png, desde, hasta }) => [
      '-loop',
      '1',
      '-framerate',
      '60',
      '-t',
      String(hasta - desde),
      '-i',
      png,
    ]),
    '-filter_complex',
    f.join(';'),
    '-map',
    v,
    '-map',
    '0:a',
    '-c:v',
    'libx264',
    '-crf',
    '18',
    '-preset',
    'medium',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'copy',
    '-movflags',
    '+faststart',
    salida,
  ],
  { stdio: 'inherit' },
);
console.log(salida);
