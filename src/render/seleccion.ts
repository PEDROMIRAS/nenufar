import type { HeroeJson } from '../core/types';
import { dibujarCabecera, dibujarFondo, dibujarMarco, PALETA, rombo } from './marco';
import { ANCHO, esTactil } from './pantalla';
import type { Sprite } from './recursos';
import { escribir } from './texto';

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
  dibujarFondo(ctx);
  dibujarCabecera(ctx, 12, 'Elige heroína');

  for (let i = 0; i < opciones.length; i++) {
    const { heroe, sprite } = opciones[i]!;
    const t = TARJETAS[i];
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
        t.x + t.ancho / 2 - (w * ESCALA) / 2,
        t.y + 8,
        w * ESCALA,
        a * ESCALA,
      );
    }
    escribir(
      ctx,
      heroe.nombre,
      t.x + t.ancho / 2,
      t.y + 108,
      elegida ? PALETA.elegida : PALETA.texto,
      'center',
    );
    for (let fila = 0; fila < ETIQUETAS.length; fila++) {
      const e = ETIQUETAS[fila]!;
      const y = t.y + 132 + fila * 16;
      escribir(ctx, e[1], t.x + 24, y, PALETA.claro);
      escribir(ctx, String(heroe.estadisticas[e[0]]), t.x + t.ancho - 24, y, PALETA.texto, 'right');
    }
  }

  const pista = esTactil() ? 'Toca una rana para elegirla' : '← → elegir · Enter seguir';
  escribir(ctx, pista, ANCHO / 2, 316, PALETA.apagada, 'center');
}
