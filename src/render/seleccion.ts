import { tarjetasAltas } from '../core/disposicion';
import type { Rect } from '../core/menu';
import type { HeroeJson } from '../core/types';
import { VERTICAL } from '../data/datos';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA, rombo } from './marco';
import { esTactil, interfaz } from './pantalla';
import type { Sprite } from './recursos';
import { escribir } from './texto';

/** Tarjetas de las heroínas, en píxeles lógicos (una por heroína, de izquierda a derecha). */
export const TARJETAS = [
  { x: 40, y: 56, ancho: 184, alto: 236 },
  { x: 256, y: 56, ancho: 184, alto: 236 },
] as const;

/** Las tarjetas de la interfaz alta, apiladas, recordadas mientras no cambian el tamaño ni el número. */
let altas: { n: number; ancho: number; alto: number; tarjetas: Rect[] } | null = null;

/** Dónde están las `n` tarjetas ahora: las de siempre en horizontal y, con la interfaz alta, una bajo otra. */
export function tarjetasVisibles(n: number): readonly Rect[] {
  if (!interfaz.alta) return TARJETAS;
  if (!altas || altas.n !== n || altas.ancho !== interfaz.ancho || altas.alto !== interfaz.alto)
    altas = {
      n,
      ancho: interfaz.ancho,
      alto: interfaz.alto,
      tarjetas: tarjetasAltas(n, interfaz.ancho, interfaz.alto, VERTICAL),
    };
  return altas.tarjetas;
}

const ESCALA = 3;
const ETIQUETAS: [keyof HeroeJson['estadisticas'], string][] = [
  ['pv', 'PV'],
  ['pm', 'PM'],
  ['ataque', 'Ataque'],
  ['magia', 'Magia'],
  ['defensa', 'Defensa'],
  ['velocidad', 'Velocidad'],
];

export function dibujarSeleccion(
  ctx: CanvasRenderingContext2D,
  opciones: readonly { heroe: HeroeJson; sprite: Sprite }[],
  seleccion: number,
  tiempo: number,
): void {
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 12, 'Elige heroína');

  const tarjetas = tarjetasVisibles(opciones.length);
  const alta = interfaz.alta;
  for (let i = 0; i < opciones.length; i++) {
    const { heroe, sprite } = opciones[i]!;
    const t = tarjetas[i];
    if (!t) continue;
    const elegida = i === seleccion;
    dibujarMarco(ctx, t.x, t.y, t.ancho, t.alto);
    if (elegida) {
      ctx.fillStyle = PALETA.seleccion;
      ctx.fillRect(t.x + 4, t.y + 4, t.ancho - 8, t.alto - 8);
      rombo(ctx, t.x + t.ancho / 2, t.y - 8, 8, PALETA.cursor);
    }
    // La elegida camina; la otra espera quieta.
    const { imagen, datos } = sprite;
    const anim = datos.animations[elegida ? 'walk' : 'idle'];
    if (anim) {
      const columna = anim.startColumn + (Math.floor(tiempo * anim.fps) % anim.frames);
      const w = datos.frameWidth;
      const a = datos.frameHeight;
      ctx.drawImage(
        imagen,
        columna * w,
        datos.directions.down * a,
        w,
        a,
        alta ? t.x + 8 : t.x + t.ancho / 2 - (w * ESCALA) / 2,
        alta ? t.y + (t.alto - a * ESCALA) / 2 : t.y + 8,
        w * ESCALA,
        a * ESCALA,
      );
    }
    // En la interfaz alta la rana va a la izquierda y el nombre y las estadísticas a su derecha.
    const izquierda = alta ? t.x + 112 : t.x + 24;
    const derecha = t.x + t.ancho - (alta ? 16 : 24);
    const arriba = alta ? t.y + (t.alto - (ETIQUETAS.length * 16 + 24)) / 2 : t.y + 132;
    escribir(
      ctx,
      heroe.nombre,
      alta ? (izquierda + derecha) / 2 : t.x + t.ancho / 2,
      alta ? arriba : t.y + 108,
      elegida ? PALETA.elegida : PALETA.texto,
      'center',
    );
    for (let fila = 0; fila < ETIQUETAS.length; fila++) {
      const e = ETIQUETAS[fila]!;
      const y = arriba + (alta ? 24 : 0) + fila * 16;
      escribir(ctx, e[1], izquierda, y, PALETA.claro);
      escribir(ctx, String(heroe.estadisticas[e[0]]), derecha, y, PALETA.texto, 'right');
    }
  }

  const pista = esTactil() ? 'Toca una rana para elegirla' : '← → elegir · Enter seguir';
  escribir(
    ctx,
    pista,
    interfaz.ancho / 2,
    alta ? interfaz.alto - VERTICAL.menu.pie + 4 : 316,
    PALETA.apagada,
    'center',
  );
}
