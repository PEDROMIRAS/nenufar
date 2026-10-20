import type { HeroeJson } from '../core/types';
import { ALTO, ANCHO } from './pantalla';
import type { Sprite } from './recursos';
import { escribir, FUENTE_GRANDE } from './texto';

/** Tarjetas de las heroínas, en píxeles lógicos (una por heroína, de izquierda a derecha). */
export const TARJETAS = [
  { x: 40, y: 56, ancho: 184, alto: 236 },
  { x: 256, y: 56, ancho: 184, alto: 236 },
] as const;

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
  ctx.fillStyle = '#141a1f';
  ctx.fillRect(0, 0, ANCHO, ALTO);
  escribir(ctx, 'Elige heroína', ANCHO / 2, 14, '#ffd27a', 'center', FUENTE_GRANDE);

  opciones.forEach(({ heroe, sprite }, i) => {
    const t = TARJETAS[i];
    if (!t) return;
    const elegida = i === seleccion;
    ctx.fillStyle = elegida ? '#2f4438' : '#1f2a24';
    ctx.fillRect(t.x, t.y, t.ancho, t.alto);
    if (elegida) {
      ctx.fillStyle = '#8fa88a';
      ctx.fillRect(t.x, t.y, t.ancho, 2);
      ctx.fillRect(t.x, t.y + t.alto - 2, t.ancho, 2);
      ctx.fillRect(t.x, t.y, 2, t.alto);
      ctx.fillRect(t.x + t.ancho - 2, t.y, 2, t.alto);
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
        t.x + t.ancho / 2 - (w * ESCALA) / 2,
        t.y + 8,
        w * ESCALA,
        a * ESCALA,
      );
    }
    escribir(ctx, heroe.nombre, t.x + t.ancho / 2, t.y + 108, '#e8efe4', 'center');
    ETIQUETAS.forEach(([clave, etiqueta], fila) => {
      const y = t.y + 132 + fila * 16;
      escribir(ctx, etiqueta, t.x + 24, y, '#aab8a6');
      escribir(ctx, String(heroe.estadisticas[clave]), t.x + t.ancho - 24, y, '#e8efe4', 'right');
    });
  });

  escribir(ctx, '← → para elegir · Enter o toca para empezar', ANCHO / 2, 316, '#aab8a6', 'center');
}
