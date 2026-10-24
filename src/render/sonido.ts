import { crearAzar } from '../core/azar';
import { leerVoz, type Nota } from '../core/musica';
import datos from '../data/sonido.json';
import { cargarAjustes, guardarAjustes } from './almacen';

// Todo el sonido se sintetiza con Web Audio a partir de src/data/sonido.json: no hay archivos de audio.
// Cada nota o efecto crea sus nodos (Web Audio no deja reutilizarlos), pero solo al sonar, no en cada fotograma.

interface Capa {
  onda: string;
  /** Frecuencia al empezar y al acabar (barrido), en Hz; sin `hasta`, fija. */
  desde?: number;
  hasta?: number;
  duracion: number;
  volumen?: number;
  retardo?: number;
}

interface Pista {
  pasos: number;
  duracionPaso: number;
  voces: { onda: OscillatorType; volumen: number; notas: Nota[] }[];
}

const EFECTOS: Record<string, Capa[]> = datos.efectos;
/** Las pistas avanzan en corcheas: dos pasos por pulso. */
const PISTAS: Record<string, Pista> = Object.fromEntries(
  Object.entries(datos.musica).map(([nombre, p]) => {
    const voces = p.voces.map((v) => ({
      onda: v.onda as OscillatorType,
      volumen: v.volumen,
      ...leerVoz(v.notas),
    }));
    return [nombre, { pasos: voces[0]?.pasos ?? 0, duracionPaso: 30 / p.tempo, voces }];
  }),
);
/** Cuánto se programa por adelantado (s) y cada cuánto se revisa (ms). */
const ADELANTO = 0.2;
const REVISION = 50;

let audio: AudioContext | null = null;
let general: GainNode | null = null;
let efectos: GainNode | null = null;
let musica: GainNode | null = null;
let ruido: AudioBuffer | null = null;
let silenciado = cargarAjustes().silencio;
let volumenMusica = cargarAjustes().musica;
let volumenEfectos = cargarAjustes().efectos;
let pista: string | null = null;
let paso = 0;
let siguiente = 0;

/** El navegador solo deja sonar tras un gesto: el audio se crea (o se reanuda) con el primer toque o tecla. */
export function prepararSonido(): void {
  const abrir = (): void => {
    if (!audio) crearAudio();
    void audio?.resume();
  };
  window.addEventListener('pointerdown', abrir);
  window.addEventListener('keydown', abrir);
  setInterval(programarMusica, REVISION);
}

function crearAudio(): void {
  const a = new AudioContext();
  audio = a;
  general = a.createGain();
  general.gain.value = silenciado ? 0 : 1;
  general.connect(a.destination);
  efectos = a.createGain();
  efectos.gain.value = datos.volumen.efectos * volumenEfectos;
  efectos.connect(general);
  musica = a.createGain();
  musica.gain.value = datos.volumen.musica * volumenMusica;
  musica.connect(general);
  // Medio segundo de ruido blanco para golpes y cortes, con el PRNG del juego.
  const azar = crearAzar(1);
  ruido = a.createBuffer(1, Math.floor(a.sampleRate / 2), a.sampleRate);
  const muestras = ruido.getChannelData(0);
  for (let i = 0; i < muestras.length; i++) muestras[i] = azar() * 2 - 1;
}

export function estaSilenciado(): boolean {
  return silenciado;
}

/** Quita o devuelve el sonido y lo recuerda para la próxima vez. */
export function silenciar(si: boolean): void {
  silenciado = si;
  if (general) general.gain.value = si ? 0 : 1;
  guardarAjustes({ silencio: si });
}

export function leerVolumenMusica(): number {
  return volumenMusica;
}

/** Cambia el volumen de la música (de 0 a 1) y lo recuerda para la próxima vez. */
export function ponerVolumenMusica(v: number): void {
  volumenMusica = v;
  if (musica) musica.gain.value = datos.volumen.musica * v;
  guardarAjustes({ musica: v });
}

export function leerVolumenEfectos(): number {
  return volumenEfectos;
}

/** Cambia el volumen de los efectos (de 0 a 1) y lo recuerda para la próxima vez. */
export function ponerVolumenEfectos(v: number): void {
  volumenEfectos = v;
  if (efectos) efectos.gain.value = datos.volumen.efectos * v;
  guardarAjustes({ efectos: v });
}

export function sonar(nombre: string): void {
  if (!audio || !efectos || silenciado) return;
  const t0 = audio.currentTime;
  for (const c of EFECTOS[nombre] ?? []) {
    const t = t0 + (c.retardo ?? 0);
    const g = audio.createGain();
    g.gain.setValueAtTime(c.volumen ?? 1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + c.duracion);
    g.connect(efectos);
    let fuente: AudioScheduledSourceNode;
    if (c.onda === 'ruido') {
      const b = audio.createBufferSource();
      b.buffer = ruido;
      fuente = b;
    } else {
      const o = audio.createOscillator();
      o.type = c.onda as OscillatorType;
      o.frequency.setValueAtTime(c.desde ?? 440, t);
      if (c.hasta) o.frequency.exponentialRampToValueAtTime(c.hasta, t + c.duracion);
      fuente = o;
    }
    fuente.connect(g);
    fuente.start(t);
    fuente.stop(t + c.duracion + 0.02);
  }
}

/** Pone una pista en bucle (null = silencio). Pedir la que ya suena no hace nada: se puede llamar en cada update. */
export function ponerMusica(nombre: string | null): void {
  if (nombre === pista) return;
  pista = nombre;
  paso = 0;
  siguiente = 0;
}

function programarMusica(): void {
  const p = pista ? PISTAS[pista] : undefined;
  if (!audio || !musica || !p || silenciado) return;
  if (siguiente < audio.currentTime) siguiente = audio.currentTime + 0.05;
  while (siguiente < audio.currentTime + ADELANTO) {
    for (const v of p.voces) {
      for (const n of v.notas) {
        if (n.inicio === paso) tocar(n, v.onda, v.volumen, siguiente, p.duracionPaso);
      }
    }
    paso = (paso + 1) % p.pasos;
    siguiente += p.duracionPaso;
  }
}

function tocar(
  n: Nota,
  onda: OscillatorType,
  volumen: number,
  t: number,
  duracionPaso: number,
): void {
  if (!audio || !musica) return;
  const fin = t + n.pasos * duracionPaso * 0.92;
  const o = audio.createOscillator();
  o.type = onda;
  o.frequency.value = n.frecuencia;
  const g = audio.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volumen, t + 0.01);
  g.gain.setValueAtTime(volumen, fin - 0.03);
  g.gain.linearRampToValueAtTime(0, fin);
  o.connect(g);
  g.connect(musica);
  o.start(t);
  o.stop(fin + 0.01);
}
