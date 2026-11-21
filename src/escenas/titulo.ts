import { dispositivo, type Dispositivo } from '../input/dispositivo';
import type { Acciones } from '../core/acciones';
import { letrasEnAncho } from '../core/disposicion';
import { focoPortada } from '../core/menu';
import { formatearTiempo, textoPorDificultad, type Records } from '../core/records';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { cargarAjustes } from '../render/almacen';
import { dibujarCaja, PALETA } from '../render/marco';
import { partirLista } from '../core/texto';
import { ALTO, ANCHO, area, dentro, interfaz } from '../render/pantalla';
import type { Portada3d } from '../render/mundo/portada';
import { ponerMusica, sonar } from '../render/sonido';
import { escribir, FUENTE, FUENTE_LOGO } from '../render/texto';
import controles from '../data/controles.json';
import type { Escena } from './escena';

const AVISO = 'Pulsa o toca para empezar';
/**
 * Botón del bestiario y los logros, arriba a la derecha (con teclado, la tecla I); en dos líneas y estrecho, para
 * que quepa a la derecha del logo sin pisarlo. En la interfaz alta (móvil de pie) los dos botones van abajo, al
 * alcance del pulgar (ver `disponer`).
 */
const BOTON_EXTRAS = { x: ANCHO - 112, y: 6, ancho: 106, alto: 40 };
/** Botón de los controles, arriba a la izquierda (simétrico al de extras). */
const BOTON_CONTROLES = { x: 6, y: 6, ancho: 106, alto: 40 };
/** Botón del reto del día: en horizontal, centrado sobre el aviso; en vertical, sobre los otros dos botones. */
const BOTON_RETO = { x: ANCHO / 2 - 80, y: ALTO - 98, ancho: 160, alto: 30 };
const TEXTO_RETO = 'Reto del día';
/** Medidas de la disposición vertical: margen, alto de los botones y alto de una línea de récords. */
const VERTICAL = { margen: 8, botones: 44, linea: 14 };

/**
 * Dónde están las flechas: de izquierda a derecha, controles, empezar y extras (← y → los recorren); el reto va
 * aparte, encima de empezar (↑ desde empezar).
 */
const FOCOS = ['controles', 'empezar', 'extras', 'reto'] as const;
const ANUNCIO = {
  controles: 'Controles',
  empezar: AVISO,
  extras: 'Bestiario y logros',
  reto: `${TEXTO_RETO}: una partida corta con el mapa de hoy`,
};

/** Segunda línea del botón de extras; con teclado o mando dice también su botón. */
const TEXTO_EXTRAS: Record<Dispositivo, string> = {
  teclado: 'logros (I)',
  tactil: 'logros',
  mando: 'logros (Y)',
};

/** Portada: la sala de descanso del Bosque con las ranas junto a la fuente, el logo y los récords. */
export class EscenaTitulo implements Escena {
  readonly conMundo = true;
  readonly alta = true;

  private tiempo = 0;
  /** Índice en FOCOS: con las flechas en un botón de arriba (Enter lo abre) o en empezar. */
  private foco = 1;
  /** El botón del reto está en la portada (se puede quitar con la casilla «Reto» de Ajustes). */
  private conReto = true;
  /** Se viene de los controles, donde se puede quitar o poner el botón del reto: hay que releerlo. */
  private releerReto = false;
  private ultimoX = 0;
  private ultimoY = 0;
  /** Récords generales y, debajo, los de cada dificultad (o el mejor tiempo, si aún no hay). */
  private readonly records: string;
  private readonly recordsDificultad: string;

  /** Récords partidos al ancho de la interfaz alta, y las letras por línea con las que se partieron. */
  private lineasRecords: string[] = [];
  private letrasRecords = 0;
  /** Dónde caen el aviso y la banda de abajo en este fotograma. */
  private avisoY = ALTO - 58;
  private bandaY = ALTO - 72;

  constructor(
    records: Records,
    /** Clave y nombre de cada dificultad, en orden. */
    dificultades: readonly [string, string][],
    totalLogros: number,
    /** La sala de fondo en 3D, con las ranas y dos monstruos acechando. */
    private readonly arte: Portada3d,
    private readonly alEmpezar: () => void,
    private readonly alExtras: () => void,
    private readonly alControles: () => void,
    private readonly alReto: () => void,
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
    this.arte.preparar();
    this.foco = 1;
    this.conReto = !cargarAjustes().retoOculto;
    anunciar(['Nenúfar', this.records, this.recordsDificultad, AVISO].filter((t) => t).join('. '));
  }
  exit(): void {
    this.arte.vaciar();
  }

  update(dt: number, acciones: Acciones): void {
    ponerMusica(null);
    if (this.releerReto) {
      this.releerReto = false;
      this.conReto = !cargarAjustes().retoOculto;
      if (!this.conReto && FOCOS[this.foco] === 'reto') this.foco = 1;
    }
    this.disponer();
    this.tiempo += dt;
    // Las flechas siguen el orden de los botones en la pantalla (ver `focoPortada`).
    const dx = Math.sign(acciones.moverX);
    const dy = Math.sign(acciones.moverY);
    let foco = this.foco;
    if (dx !== 0 && dx !== this.ultimoX) foco = focoPortada(foco, dx, 0, interfaz.alta);
    else if (dy !== 0 && dy !== this.ultimoY) foco = focoPortada(foco, 0, dy, interfaz.alta);
    // Sin el botón del reto, la flecha que llevaría a él no hace nada.
    if (!this.conReto && FOCOS[foco] === 'reto') foco = this.foco;
    this.ultimoX = dx;
    this.ultimoY = dy;
    if (foco !== this.foco) {
      this.foco = foco;
      sonar('cursor');
      anunciar(ANUNCIO[FOCOS[foco]!]);
    }
    const { toqueX: x, toqueY: y } = acciones;
    if (acciones.info || dentro(x, y, BOTON_EXTRAS)) this.alExtras();
    else if (dentro(x, y, BOTON_CONTROLES)) this.abrirControles();
    else if (this.conReto && dentro(x, y, BOTON_RETO)) this.alReto();
    else if (x >= 0) this.alEmpezar();
    else if (acciones.confirmar) {
      const elegido = FOCOS[this.foco];
      if (elegido === 'extras') this.alExtras();
      else if (elegido === 'controles') this.abrirControles();
      else if (elegido === 'reto') this.alReto();
      else this.alEmpezar();
    }
  }

  /** Abre los controles; al volver, se relee si el botón del reto sigue en la portada (allí se puede quitar). */
  private abrirControles(): void {
    this.releerReto = true;
    this.alControles();
  }

  /**
   * Coloca los botones, el aviso y la banda de abajo según la interfaz. En horizontal, los botones arriba a los
   * lados y los récords en dos líneas abajo; en vertical, los récords partidos al ancho, el aviso encima y los
   * botones lado a lado sobre el aviso. Sin asignar memoria: se mutan los mismos objetos.
   */
  private disponer(): void {
    if (!interfaz.alta) {
      BOTON_EXTRAS.x = ANCHO - 112;
      BOTON_EXTRAS.y = 6;
      BOTON_EXTRAS.ancho = 106;
      BOTON_EXTRAS.alto = 40;
      BOTON_CONTROLES.x = 6;
      BOTON_CONTROLES.y = 6;
      BOTON_CONTROLES.ancho = 106;
      BOTON_CONTROLES.alto = 40;
      this.avisoY = ALTO - 58;
      BOTON_RETO.x = ANCHO / 2 - 80;
      BOTON_RETO.y = ALTO - 98;
      BOTON_RETO.ancho = 160;
      BOTON_RETO.alto = 30;
      this.bandaY = this.conReto ? BOTON_RETO.y - VERTICAL.margen : this.avisoY - 12;
      return;
    }
    const letras = letrasEnAncho(interfaz.ancho - 2 * VERTICAL.margen);
    if (letras !== this.letrasRecords) {
      this.letrasRecords = letras;
      this.lineasRecords = [
        // Por elementos: «· Logros 6/6» empezaba la segunda línea.
        ...partirLista(this.records, letras),
        ...partirLista(this.recordsDificultad, letras),
      ];
    }
    const base = interfaz.alto - VERTICAL.margen - this.lineasRecords.length * VERTICAL.linea;
    this.avisoY = base - 22;
    const ancho = (interfaz.ancho - 3 * VERTICAL.margen) / 2;
    const y = this.avisoY - VERTICAL.margen - VERTICAL.botones;
    BOTON_CONTROLES.x = VERTICAL.margen;
    BOTON_EXTRAS.x = 2 * VERTICAL.margen + ancho;
    BOTON_CONTROLES.y = BOTON_EXTRAS.y = y;
    BOTON_CONTROLES.ancho = BOTON_EXTRAS.ancho = ancho;
    BOTON_CONTROLES.alto = BOTON_EXTRAS.alto = VERTICAL.botones;
    BOTON_RETO.x = VERTICAL.margen;
    BOTON_RETO.ancho = interfaz.ancho - 2 * VERTICAL.margen;
    BOTON_RETO.alto = VERTICAL.botones;
    BOTON_RETO.y = y - VERTICAL.margen - VERTICAL.botones;
    this.bandaY = (this.conReto ? BOTON_RETO.y : y) - VERTICAL.margen;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.disponer();
    const t = this.tiempo;
    this.arte.dibujar(t);
    // El canvas 2D queda transparente encima de la sala en 3D, solo con el logo y los textos.
    // Bandas más oscuras arriba y abajo, para que el logo y los textos se lean sobre la sala.
    ctx.fillStyle = 'rgba(10, 12, 16, 0.55)';
    ctx.fillRect(area.x, 0, area.ancho, 112);
    ctx.fillRect(area.x, this.bandaY, area.ancho, (interfaz.alta ? area.alto : ALTO) - this.bandaY);

    const centro = interfaz.ancho / 2;
    escribir(ctx, 'Nenúfar', centro, 18, '#c89bff', 'center', FUENTE_LOGO);
    escribir(ctx, 'Un dungeon crawler de ranas', centro, 74, PALETA.texto, 'center');
    // Para quien llega sin saberlo (desde el portafolio): también se juega con mando.
    escribir(ctx, controles.mando.texto, centro, 94, PALETA.claro, 'center', FUENTE);
    this.boton(
      ctx,
      BOTON_EXTRAS,
      'Bestiario y',
      TEXTO_EXTRAS[dispositivo()],
      FOCOS[this.foco] === 'extras',
    );
    this.boton(ctx, BOTON_CONTROLES, 'Controles', '', FOCOS[this.foco] === 'controles');
    if (this.conReto) this.boton(ctx, BOTON_RETO, TEXTO_RETO, '', FOCOS[this.foco] === 'reto');

    // El aviso pulsa de opacidad en vez de desaparecer (y se queda fijo con menos movimiento).
    ctx.globalAlpha = movimientoReducido() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t * 2.5));
    escribir(ctx, AVISO, centro, this.avisoY, PALETA.cursor, 'center');
    ctx.globalAlpha = 1;
    if (interfaz.alta) {
      const y0 = this.avisoY + 20;
      for (let i = 0; i < this.lineasRecords.length; i++)
        escribir(
          ctx,
          this.lineasRecords[i]!,
          centro,
          y0 + i * VERTICAL.linea,
          PALETA.claro,
          'center',
          FUENTE,
        );
      return;
    }
    if (this.records)
      escribir(ctx, this.records, centro, ALTO - 38, PALETA.claro, 'center', FUENTE);
    if (this.recordsDificultad)
      escribir(ctx, this.recordsDificultad, centro, ALTO - 22, PALETA.claro, 'center', FUENTE);
  }

  /** Botón de arriba con una o dos líneas; elegido con las flechas, marco dorado de 2 px. */
  private boton(
    ctx: CanvasRenderingContext2D,
    b: typeof BOTON_EXTRAS,
    linea1: string,
    linea2: string,
    elegido: boolean,
  ): void {
    dibujarCaja(ctx, b.x, b.y, b.ancho, b.alto, elegido ? 'elegida' : 'normal');
    const x = b.x + b.ancho / 2;
    const color = elegido ? PALETA.elegida : PALETA.claro;
    if (linea2) {
      escribir(ctx, linea1, x, b.y + 6, color, 'center', FUENTE);
      escribir(ctx, linea2, x, b.y + 21, color, 'center', FUENTE);
    } else escribir(ctx, linea1, x, b.y + 14, color, 'center', FUENTE);
  }
}
