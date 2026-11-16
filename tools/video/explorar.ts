/**
 * Para escribir coreografías: abre el juego, pulsa las teclas dadas («Enter», «ArrowRight:1.5» = mantener 1,5 s,
 * «w:2» = esperar) y guarda una captura tras cada una en SALIDA/paso_N.png.
 * Uso: npx tsx explorar.ts "semilla=7" Enter,Enter
 */
import { SALIDA } from './rutas.ts';
import { chromium } from 'playwright';
const [url, teclas] = [process.argv[2] ?? 'semilla=7', (process.argv[3] ?? '').split(',').filter(Boolean)];
const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('pageerror', (e) => console.log('error:', e.message));
const t0 = Date.now();
const listo = p.waitForEvent('console', { predicate: (m) => m.text().startsWith('Semilla'), timeout: 180000 });
await p.goto('http://localhost:5173/?' + url, { waitUntil: 'commit' });
await listo; console.log('semilla tras', Date.now() - t0, 'ms');
await p.waitForTimeout(2000);
let i = 0;
await p.screenshot({ path: `${SALIDA}/paso_${i++}.png` });
for (const t of teclas) {
  const [k, s] = t.split(':');
  if (k === 'w') await p.waitForTimeout(Number(s) * 1000);
  else if (s) { await p.keyboard.down(k!); await p.waitForTimeout(Number(s) * 1000); await p.keyboard.up(k!); }
  else { await p.keyboard.press(k!); await p.waitForTimeout(1200); }
  await p.screenshot({ path: `${SALIDA}/paso_${i++}.png` });
}
await b.close();
