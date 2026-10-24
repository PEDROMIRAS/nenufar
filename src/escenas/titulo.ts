import type { Acciones } from '../core/acciones';
import { formatearTiempo, textoPorDificultad, type Records } from '../core/records';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { ALTO, ANCHO, dentro, esTactil } from '../render/pantalla';
import { dibujarFotograma, type Sprite } from '../render/recursos';
import { ponerMusica, sonar } from '../render/sonido';
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
// En dos líneas y estrecho, para que quepa a la derecha del logo sin pisarlo.
const BOTON_EXTRAS = { x: ANCHO - 112, y: 6, ancho: 106, alto: 40 };
/** Botón de los controles, arriba a la izquierda (simétrico al de extras). */
const BOTON_CONTROLES = { x: 6, y: 6, ancho: 106, alto: 40 };

/** Dónde están las flechas: de izquierda a derecha, controles, empezar y extras. */
const FOCOS = ['controles', 'empezar', 'extras'] as const;
const ANUNCIO = { controles: 'Controles', empezar: AVISO, extras: 'Bestiario y logros' };

/** Portada: la sala de descanso del Bosque con las ranas junto a la fuente, el logo y los récords. */
export class EscenaTitulo implements Escena {
  private tiempo = 0;
  /** Índice en FOCOS: con las flechas en un botón de arriba (Enter lo abre) o en empezar. */
  private foco = 1;
  private ultimoX = 0;
  private ultimoY = 0;
  /** Récords generales y, debajo, los de cada dificultad (o el mejor tiempo, si aún no hay). */
  private readonly records: string;
  private readonly recordsDificultad: string;
  /** Segunda línea del botón; con teclado dice también su tecla. */
  private readonly textoExtras = esTactil() ? 'logros' : 'logros (I)';

  constructor(
    records: Records,
    /** Clave y nombre de cada dificultad, en orden. */
    dificultades: readonly [string, string][],
    totalLogros: number,
    private readonly arte: ArtePortada,
    private readonly alEmpezar: () => void,
    private readonly alExtras: () => void,
    private readonly alControles: () => void,
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
    this.foco = 1;
    anunciar(['Nenúfar', this.records, this.recordsDificultad, AVISO].filter((t) => t).join('. '));
  }
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    ponerMusica(null);
    this.tiempo += dt;
    // ← y → recorren controles, empezar y extras; ↑ desde empezar lleva a extras y ↓ vuelve a empezar.
    const dx = Math.sign(acciones.moverX);
    const dy = Math.sign(acciones.moverY);
    let foco = this.foco;
    if (dx !== 0 && dx !== this.ultimoX) foco = Math.min(2, Math.max(0, foco + dx));
    else if (dy > 0 && dy !== this.ultimoY) foco = 1;
    else if (dy < 0 && dy !== this.ultimoY && foco === 1) foco = 2;
    this.ultimoX = dx;
    this.ultimoY = dy;
    if (foco !== this.foco) {
      this.foco = foco;
      sonar('cursor');
      anunciar(ANUNCIO[FOCOS[foco]!]);
    }
    const { toqueX: x, toqueY: y } = acciones;
    if (acciones.info || dentro(x, y, BOTON_EXTRAS)) this.alExtras();
    else if (dentro(x, y, BOTON_CONTROLES)) this.alControles();
    else if (x >= 0) this.alEmpezar();
    else if (acciones.confirmar) {
      const elegido = FOCOS[this.foco];
      if (elegido === 'extras') this.alExtras();
      else if (elegido === 'controles') this.alControles();
      else this.alEmpezar();
    }
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
    this.boton(ctx, BOTON_EXTRAS, 'Bestiario y', this.textoExtras, FOCOS[this.foco] === 'extras');
    this.boton(ctx, BOTON_CONTROLES, 'Controles', '', FOCOS[this.foco] === 'controles');

    // El aviso pulsa de opacidad en vez de desaparecer (y se queda fijo con menos movimiento).
    ctx.globalAlpha = movimientoReducido() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5));
    escribir(ctx, AVISO, ANCHO / 2, ALTO - 58, '#ffd27a', 'center');
    ctx.globalAlpha = 1;
    if (this.records)
      escribir(ctx, this.records, ANCHO / 2, ALTO - 38, '#aab8a6', 'center', FUENTE);
    if (this.recordsDificultad)
      escribir(ctx, this.recordsDificultad, ANCHO / 2, ALTO - 22, '#aab8a6', 'center', FUENTE);
  }

  /** Botón de arriba con una o dos líneas; elegido con las flechas, marco dorado de 2 px. */
  private boton(
    ctx: CanvasRenderingContext2D,
    b: typeof BOTON_EXTRAS,
    linea1: string,
    linea2: string,
    elegido: boolean,
  ): void {
    ctx.fillStyle = 'rgba(8, 14, 10, 0.7)';
    ctx.fillRect(b.x, b.y, b.ancho, b.alto);
    if (elegido) {
      ctx.strokeStyle = '#ffd27a';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.ancho - 2, b.alto - 2);
    }
    const x = b.x + b.ancho / 2;
    if (linea2) {
      escribir(ctx, linea1, x, b.y + 6, '#ffd27a', 'center', FUENTE);
      escribir(ctx, linea2, x, b.y + 21, '#ffd27a', 'center', FUENTE);
    } else escribir(ctx, linea1, x, b.y + 14, '#ffd27a', 'center', FUENTE);
  }
}
