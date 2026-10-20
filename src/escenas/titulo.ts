import type { Acciones } from '../core/acciones';
import { formatearTiempo, type Records } from '../core/records';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { ALTO, ANCHO } from '../render/pantalla';
import { dibujarFotograma, type Sprite } from '../render/recursos';
import { ponerMusica } from '../render/sonido';
import { escribir, FUENTE, FUENTE_LOGO } from '../render/texto';
import type { Escena } from './escena';

/** Lo que se ve en la portada: la sala de fondo, las ranas y dos monstruos acechando. */
export interface ArtePortada {
  fondo: CanvasImageSource;
  ronin: Sprite;
  maga: Sprite;
  limo: Sprite | undefined;
  murcielago: Sprite | undefined;
}

const AVISO = 'Pulsa o toca para empezar';

/** Portada: la sala de descanso del Bosque con las ranas junto a la hoguera, el logo y los récords. */
export class EscenaTitulo implements Escena {
  private tiempo = 0;
  private readonly records: string;

  constructor(
    records: Records,
    private readonly arte: ArtePortada,
    private readonly alEmpezar: () => void,
  ) {
    const partes =
      records.partidas === 0
        ? []
        : [
            `Partidas ${records.partidas}`,
            `Victorias ${records.victorias}`,
            `Nivel máx. ${records.nivelMaximo}`,
            ...(records.mejorTiempo === null
              ? []
              : [`Mejor tiempo ${formatearTiempo(records.mejorTiempo)}`]),
          ];
    this.records = partes.join(' · ');
  }

  enter(): void {
    anunciar(['Nenúfar', this.records, AVISO].filter((t) => t).join('. '));
  }
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    if (acciones.confirmar || acciones.toqueX >= 0) this.alEmpezar();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { fondo, ronin, maga, limo, murcielago } = this.arte;
    const t = this.tiempo;
    ctx.drawImage(fondo, 0, 0);
    ctx.fillStyle = 'rgba(10, 12, 16, 0.35)';
    ctx.fillRect(0, 0, ANCHO, ALTO);
    // Bandas más oscuras arriba y abajo, para que el logo y los textos se lean sobre la sala.
    ctx.fillStyle = 'rgba(10, 12, 16, 0.55)';
    ctx.fillRect(0, 0, ANCHO, 104);
    ctx.fillRect(0, ALTO - 72, ANCHO, 72);

    // Las ranas junto a la hoguera de la sala, mirándose; los monstruos acechan a un lado.
    dibujarFotograma(ctx, ronin, 'idle', 'right', t, 196, 214, 2);
    dibujarFotograma(ctx, maga, 'idle', 'left', t + 0.4, 286, 212, 2);
    if (murcielago) dibujarFotograma(ctx, murcielago, 'walk', 'down', t, 400, 150);
    if (limo) dibujarFotograma(ctx, limo, 'idle', 'left', t, 404, 246);

    escribir(ctx, 'Nenúfar', ANCHO / 2, 18, '#c89bff', 'center', FUENTE_LOGO);
    escribir(ctx, 'Un dungeon crawler de ranas', ANCHO / 2, 74, '#e8efe4', 'center');

    // El aviso pulsa de opacidad en vez de desaparecer (y se queda fijo con menos movimiento).
    ctx.globalAlpha = movimientoReducido() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5));
    escribir(ctx, AVISO, ANCHO / 2, ALTO - 58, '#ffd27a', 'center');
    ctx.globalAlpha = 1;
    if (this.records)
      escribir(ctx, this.records, ANCHO / 2, ALTO - 30, '#aab8a6', 'center', FUENTE);
  }
}
