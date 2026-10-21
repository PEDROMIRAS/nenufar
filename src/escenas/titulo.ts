import type { Acciones } from '../core/acciones';
import { formatearTiempo, textoPorDificultad, type Records } from '../core/records';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { ALTO, ANCHO, dentro, esTactil } from '../render/pantalla';
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
/** Botón del bestiario y los logros, arriba a la derecha (con teclado, la tecla I). */
const BOTON_EXTRAS = { x: ANCHO - 150, y: 6, ancho: 144, alto: 30 };

/** Portada: la sala de descanso del Bosque con las ranas junto a la fuente, el logo y los récords. */
export class EscenaTitulo implements Escena {
  private tiempo = 0;
  /** Récords generales y, debajo, los de cada dificultad (o el mejor tiempo, si aún no hay). */
  private readonly records: string;
  private readonly recordsDificultad: string;
  /** Con teclado, el botón dice también su tecla. */
  private readonly textoExtras = esTactil() ? 'Bestiario y logros' : 'Bestiario y logros (I)';

  constructor(
    records: Records,
    /** Clave y nombre de cada dificultad, en orden. */
    dificultades: readonly [string, string][],
    totalLogros: number,
    private readonly arte: ArtePortada,
    private readonly alEmpezar: () => void,
    private readonly alExtras: () => void,
  ) {
    const partes =
      records.partidas === 0
        ? []
        : [
            `Partidas ${records.partidas}`,
            `Victorias ${records.victorias}`,
            `Nivel máx. ${records.nivelMaximo}`,
            `Logros ${records.logros.length}/${totalLogros}`,
          ];
    this.records = partes.join(' · ');
    this.recordsDificultad =
      textoPorDificultad(records, dificultades) ||
      (records.mejorTiempo === null ? '' : `Mejor tiempo ${formatearTiempo(records.mejorTiempo)}`);
  }

  enter(): void {
    anunciar(['Nenúfar', this.records, this.recordsDificultad, AVISO].filter((t) => t).join('. '));
  }
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    if (acciones.info || dentro(acciones.toqueX, acciones.toqueY, BOTON_EXTRAS)) this.alExtras();
    else if (acciones.confirmar || acciones.toqueX >= 0) this.alEmpezar();
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

    // Las ranas junto a la fuente de la sala, mirándose; los monstruos acechan a un lado.
    dibujarFotograma(ctx, ronin, 'idle', 'right', t, 166, 214, 2);
    dibujarFotograma(ctx, maga, 'idle', 'left', t + 0.4, 314, 212, 2);
    if (murcielago) dibujarFotograma(ctx, murcielago, 'walk', 'down', t, 400, 150);
    if (limo) dibujarFotograma(ctx, limo, 'idle', 'left', t, 404, 246);

    escribir(ctx, 'Nenúfar', ANCHO / 2, 18, '#c89bff', 'center', FUENTE_LOGO);
    escribir(ctx, 'Un dungeon crawler de ranas', ANCHO / 2, 74, '#e8efe4', 'center');
    const b = BOTON_EXTRAS;
    ctx.fillStyle = 'rgba(8, 14, 10, 0.7)';
    ctx.fillRect(b.x, b.y, b.ancho, b.alto);
    escribir(ctx, this.textoExtras, b.x + b.ancho / 2, b.y + 9, '#ffd27a', 'center', FUENTE);

    // El aviso pulsa de opacidad en vez de desaparecer (y se queda fijo con menos movimiento).
    ctx.globalAlpha = movimientoReducido() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5));
    escribir(ctx, AVISO, ANCHO / 2, ALTO - 58, '#ffd27a', 'center');
    ctx.globalAlpha = 1;
    if (this.records)
      escribir(ctx, this.records, ANCHO / 2, ALTO - 38, '#aab8a6', 'center', FUENTE);
    if (this.recordsDificultad)
      escribir(ctx, this.recordsDificultad, ANCHO / 2, ALTO - 22, '#aab8a6', 'center', FUENTE);
  }
}
