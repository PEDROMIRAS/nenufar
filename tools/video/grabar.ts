/**
 * Graba un plano del juego: abre Chrome con ventana contra el servidor de desarrollo, captura los fotogramas
 * con el screencast de Chrome (CDP) y el audio del juego desde la propia página, y los une en un .mp4.
 *
 * La ventana es de ancho×alto CSS a densidad 2 (960×540 → 1920×1080 píxeles): una ventana de 1920×1080 no cabe
 * en la pantalla de un portátil.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import { SALIDA } from './rutas.ts';

export const SERVIDOR = 'http://localhost:5173/';
const PLANOS = join(SALIDA, 'planos');
const FPS = 60;

export interface OpcionesPlano {
  /** Parámetros de la URL (sin «?»), p. ej. «semilla=7&zona=1». */
  url: string;
  /** Tamaño CSS de la ventana; el vídeo sale al doble. Por defecto 960×540. */
  ancho?: number;
  alto?: number;
  /** Segundos de espera tras arrancar el juego y antes de grabar (por defecto 4). */
  espera?: number;
  /** Lo que se hace antes de empezar a grabar (p. ej. empezar la partida y dejar pasar las pistas). */
  preparar?: (pagina: Page) => Promise<void>;
  /** Lo que se hace mientras se graba. La grabación empieza cuando la página ha cargado. */
  coreografia: (pagina: Page) => Promise<void>;
}

/**
 * Antes de cargar la página: cada conexión a la salida de un AudioContext se duplica hacia un
 * MediaStreamAudioDestinationNode grabado con MediaRecorder. Vale para contextos creados después.
 */
const ENGANCHE_AUDIO = `(() => {
  const conectar = AudioNode.prototype.connect;
  const grabados = new WeakMap();
  window.__audio = { trozos: [], inicio: 0, grabadora: null };
  AudioNode.prototype.connect = function (destino, ...resto) {
    const r = conectar.call(this, destino, ...resto);
    if (destino instanceof AudioDestinationNode) {
      const ctx = this.context;
      let salida = grabados.get(ctx);
      if (!salida) {
        salida = ctx.createMediaStreamDestination();
        grabados.set(ctx, salida);
        const g = new MediaRecorder(salida.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
        g.ondataavailable = (e) => window.__audio.trozos.push(e.data);
        g.start(250);
        window.__audio.grabadora = g;
        window.__audio.inicio = Date.now();
      }
      conectar.call(this, salida);
    }
    return r;
  };
})();`;

/** Graba el plano `nombre` y devuelve la ruta del .mp4 (imagen a 60 fps con el audio del juego alineado). */
export async function grabarPlano(nombre: string, o: OpcionesPlano): Promise<string> {
  const ancho = o.ancho ?? 960;
  const alto = o.alto ?? 540;
  const fotos = join(PLANOS, `${nombre}_fotos`);
  rmSync(fotos, { recursive: true, force: true });
  mkdirSync(fotos, { recursive: true });

  const navegador = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--hide-scrollbars',
      // Que siga pintando aunque otra ventana la tape (si no, macOS la congela y no llegan fotogramas).
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
    ],
  });
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: alto },
    deviceScaleFactor: 2,
  });
  await contexto.addInitScript(ENGANCHE_AUDIO);
  const pagina = await contexto.newPage();
  // El juego escribe su semilla en la consola al arrancar; después se dejan unos segundos para las texturas.
  const arrancado = pagina.waitForEvent('console', {
    predicate: (m) => m.text().startsWith('Semilla de la partida'),
    timeout: 180_000,
  });
  await pagina.goto(`${SERVIDOR}?${o.url}`, { waitUntil: 'commit', timeout: 180_000 });
  await arrancado;
  await esperar(o.espera ?? 4);
  // Una tecla que el juego no usa: crea el AudioContext (el navegador lo exige tras un gesto).
  await pagina.keyboard.press('Alt');
  if (o.preparar) await o.preparar(pagina);

  const cdp = await contexto.newCDPSession(pagina);
  const marcas: { archivo: string; t: number }[] = [];
  cdp.on('Page.screencastFrame', (f) => {
    const archivo = `f${String(marcas.length).padStart(6, '0')}.jpg`;
    writeFileSync(join(fotos, archivo), Buffer.from(f.data, 'base64'));
    marcas.push({ archivo, t: f.metadata.timestamp ?? Date.now() / 1000 });
    void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 92,
    maxWidth: ancho * 2,
    maxHeight: alto * 2,
  });

  await o.coreografia(pagina);

  await cdp.send('Page.stopScreencast');
  const audio = await pagina.evaluate(async () => {
    const a = (window as unknown as { __audio: { trozos: Blob[]; inicio: number; grabadora: MediaRecorder | null } })
      .__audio;
    if (!a.grabadora) return null;
    await new Promise<void>((listo) => {
      a.grabadora!.onstop = () => listo();
      a.grabadora!.stop();
    });
    const datos = new Uint8Array(await new Blob(a.trozos).arrayBuffer());
    let binario = '';
    for (let i = 0; i < datos.length; i += 0x8000) binario += String.fromCharCode(...datos.subarray(i, i + 0x8000));
    return { base64: btoa(binario), inicio: a.inicio };
  });
  await navegador.close();

  if (marcas.length < 2) throw new Error(`${nombre}: no llegaron fotogramas`);
  // Cada fotograma dura hasta el siguiente (el screencast no tiene ritmo fijo); ffmpeg lo pasa a 60 fps.
  // A veces llegan desordenados: se ordenan por su marca de tiempo.
  marcas.sort((a, b) => a.t - b.t);
  const lista = marcas.map((m, i) => {
    const dur = i + 1 < marcas.length ? marcas[i + 1]!.t - m.t : 1 / FPS;
    return `file '${m.archivo}'\nduration ${dur.toFixed(4)}`;
  });
  lista.push(`file '${marcas[marcas.length - 1]!.archivo}'`);
  writeFileSync(join(fotos, 'lista.txt'), `ffconcat version 1.0\n${lista.join('\n')}\n`);

  const mp4 = join(PLANOS, `${nombre}.mp4`);
  const entrada = ['-f', 'concat', '-safe', '0', '-i', join(fotos, 'lista.txt')];
  const video = ['-vf', `fps=${FPS},scale=${ancho * 2}:${alto * 2}:flags=lanczos,format=yuv420p`];
  const codec = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16'];
  if (audio) {
    const webm = join(PLANOS, `${nombre}.webm`);
    writeFileSync(webm, Buffer.from(audio.base64, 'base64'));
    // El audio empezó cuando el juego conectó su salida; el vídeo, con el primer fotograma.
    const desfase = audio.inicio / 1000 - marcas[0]!.t;
    const ajuste =
      desfase >= 0
        ? ['-af', `adelay=${Math.round(desfase * 1000)}:all=1`]
        : ['-af', `atrim=start=${(-desfase).toFixed(3)},asetpts=PTS-STARTPTS`];
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entrada, '-i', webm, ...video, ...codec, ...ajuste,
      '-c:a', 'aac', '-b:a', '192k', '-shortest', mp4]);
  } else {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entrada, ...video, ...codec, mp4]);
  }
  rmSync(fotos, { recursive: true, force: true });
  return mp4;
}

/** Espera `s` segundos. */
export const esperar = (s: number): Promise<void> => new Promise((r) => setTimeout(r, s * 1000));

/** Mantiene pulsada una tecla `s` segundos. */
export async function mantener(pagina: Page, tecla: string, s: number): Promise<void> {
  await pagina.keyboard.down(tecla);
  await esperar(s);
  await pagina.keyboard.up(tecla);
}

/**
 * Pulsa una tecla y deja `s` segundos de respiro. La mantiene 80 ms: el juego lee las flechas como teclas
 * sostenidas en cada paso de lógica, y una pulsación instantánea se soltaba antes del siguiente paso.
 */
export async function pulsar(pagina: Page, tecla: string, s = 0.4): Promise<void> {
  await pagina.keyboard.press(tecla, { delay: 80 });
  await esperar(s);
}

/**
 * De la portada al mapa de la primera zona: portada, heroína, nombre, dificultad (Normal) y `paginas` páginas
 * de texto (por defecto 5: los cuatro textos de la historia y el cartel de la zona; una más si sale un presagio;
 * 0 con ?combate o ?altar, que se abren nada más elegir la dificultad y no cuentan la historia: una pulsación
 * de más jugaría el combate). Con `pistas`, espera a que pasen las tres pistas de controles (4 s cada una).
 */
export async function empezarPartida(
  pagina: Page,
  rana: 'ronin' | 'maga',
  { pistas = true, paginas = 5 }: { pistas?: boolean; paginas?: number } = {},
): Promise<void> {
  await pulsar(pagina, 'Enter', 0.8);
  if (rana === 'maga') await pulsar(pagina, 'ArrowRight', 0.5);
  for (let i = 0; i < 3; i++) await pulsar(pagina, 'Enter', 0.8);
  for (let i = 0; i < paginas; i++) {
    // La última página (el cartel de la zona, o el presagio) tarda algo más en aparecer.
    if (i === paginas - 1) await esperar(1);
    await pulsar(pagina, 'Enter', i === paginas - 1 ? 1.5 : 0.8);
  }
  if (paginas === 0) await esperar(1.5);
  if (pistas) await esperar(12.5);
}
