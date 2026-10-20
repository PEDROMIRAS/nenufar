import type { Acciones } from '../core/acciones';
import type { Luchador, Resultado } from '../core/combate';
import { crearAzar } from '../core/azar';
import { actualizarHeroina, type Heroina } from '../core/heroina';
import { opuesto, portalPisado, posicionEntrada, salaVecina, salidaPisada } from '../core/mapa';
import { colocarMonstruos, seTocan, type Caja } from '../core/monstruos';
import { buscarInicio } from '../core/movimiento';
import {
  aplicarPuertas,
  construirSala,
  salidas,
  type Sala,
  type Salida,
  type Tile,
} from '../core/sala';
import type { MonstruoJson, PlantillasJson } from '../core/types';
import type { SalaZona, Zona } from '../core/zona';
import { dibujarHeroina } from '../render/heroina';
import { dibujarHud, type TextosHud } from '../render/hud';
import { pintarMinimapa } from '../render/minimapa';
import { dibujarMonstruoMapa } from '../render/monstruo';
import type { Sprite } from '../render/recursos';
import { dibujarObjetos, pintarFondo, pintarVineta } from '../render/sala';
import type { Escena } from './escena';

/** Separación del minimapa respecto al borde de la pantalla, en píxeles lógicos. */
const MARGEN_HUD = 6;

interface MonstruoMapa extends Caja {
  datos: MonstruoJson;
  vivo: boolean;
}

interface SalaMontada {
  sala: Sala;
  fondo: HTMLCanvasElement;
  monstruos: MonstruoMapa[];
}

export interface OpcionesMapa {
  zona: Zona;
  plantillas: PlantillasJson;
  catalogo: ReadonlyMap<string, Tile>;
  imagenes: readonly HTMLImageElement[];
  tam: number;
  heroina: Heroina;
  sprite: Sprite;
  /** Duración total del fundido a negro y vuelta al cambiar de sala, en segundos. */
  duracionFundido: number;
  /** Lado de la rejilla de la zona, en salas (para el minimapa). */
  rejilla: number;
  /** Se llama una vez, con la pantalla ya en negro, al pisar el portal; null = el portal aún no lleva a ningún sitio. */
  alUsarPortal: (() => void) | null;
  /** Empieza saliendo de negro, como segunda mitad de un fundido (al llegar desde otra zona). */
  entrarDesdeNegro: boolean;
  /** Tipos de monstruo de la zona; cuántos hay por sala de combate y a cuántas casillas de las entradas. */
  monstruos: readonly MonstruoJson[];
  monstruosPorSala: number;
  distanciaMonstruos: number;
  /** Segundos sin poder empezar otro combate tras huir o vencer. */
  invulnerabilidad: number;
  /** Abre el combate contra `monstruo` y avisa de su resultado al terminar (salvo derrota). */
  iniciarCombate: (monstruo: MonstruoJson, alTerminar: (r: Resultado) => void) => void;
  /** Estadísticas de combate de la heroína y nombre de la zona, para el HUD. */
  luchadora: Luchador;
  nombreZona: string;
}

/** Exploración de una zona: la sala actual, la heroína y el paso de una sala a otra o a la zona siguiente. */
export class EscenaMapa implements Escena {
  private readonly montadas = new Map<SalaZona, SalaMontada>();
  private readonly salidas: Salida[];
  private readonly vineta: HTMLCanvasElement;
  private readonly visitadas = new Set<SalaZona>();
  private actual: SalaZona;
  private montada: SalaMontada;
  private minimapa: HTMLCanvasElement;
  private tiempo = 0;
  /** Segundos que lleva el fundido (0 = sin fundido) y qué pasa a mitad: cruzar un lado o usar el portal. */
  private fundido = 0;
  private pendiente: number | 'portal' | null = null;
  private portalUsado = false;
  /** Segundos que quedan sin poder empezar otro combate. */
  private invulnerable = 0;
  private readonly hud: TextosHud = { cabecera: '', pv: '', pm: '' };
  /** Valores con los que se escribieron los textos del HUD, para rehacerlos solo si cambian. */
  private hudFirma = -1;

  constructor(private readonly o: OpcionesMapa) {
    const inicio = o.zona.salas.find((s) => s.tipo === 'inicio');
    if (!inicio) throw new Error('La zona no tiene sala de inicio');
    const referencia = o.plantillas.plantillas[0]?.mapa ?? [];
    this.salidas = salidas(referencia[0]?.length ?? 0, referencia.length);
    this.actual = inicio;
    this.montada = this.montar(inicio);
    this.minimapa = this.visitar(inicio);
    const { sala } = this.montada;
    this.vineta = pintarVineta(this.montada.fondo.width, this.montada.fondo.height);
    const c = o.heroina.cuerpo;
    this.colocar(buscarInicio(sala, o.tam, c.ancho, c.alto));
    if (o.entrarDesdeNegro) this.fundido = o.duracionFundido / 2;
  }

  enter(): void {}
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    const { heroina: h, tam, duracionFundido } = this.o;
    this.tiempo += dt;
    if (this.fundido > 0) {
      // Durante el fundido la heroína espera; a mitad, con la pantalla en negro, pasa lo pendiente.
      h.xAnterior = h.cuerpo.x;
      h.yAnterior = h.cuerpo.y;
      if (this.pendiente === 'portal' && this.fundido >= duracionFundido / 2) {
        // Se queda en negro: main.ts cambia de escena cuando ha cargado la zona siguiente.
        if (!this.portalUsado) this.o.alUsarPortal?.();
        this.portalUsado = true;
        return;
      }
      this.fundido += dt;
      if (typeof this.pendiente === 'number' && this.fundido >= duracionFundido / 2) {
        this.cruzar(this.pendiente);
        this.pendiente = null;
      }
      if (this.fundido >= duracionFundido) this.fundido = 0;
      return;
    }
    actualizarHeroina(h, acciones, dt, this.montada.sala, tam);
    if (this.invulnerable > 0) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
    } else {
      for (const m of this.montada.monstruos) {
        if (m.vivo && seTocan(h.cuerpo, m)) {
          this.luchar(m);
          return;
        }
      }
    }
    const salida = salidaPisada(this.salidas, this.actual.puertas, tam, h.cuerpo.x, h.cuerpo.y);
    if (salida) {
      this.pendiente = salida.lado;
      this.fundido = Number.EPSILON;
    } else if (
      this.o.alUsarPortal &&
      portalPisado(this.montada.sala, tam, h.cuerpo.x, h.cuerpo.y)
    ) {
      this.pendiente = 'portal';
      this.fundido = Number.EPSILON;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    const { heroina: h, imagenes, tam, sprite, duracionFundido } = this.o;
    const { sala, fondo } = this.montada;
    // Los objetos con la base por encima de los pies quedan detrás de la heroína; el resto, delante.
    const pies = Math.round(h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha);
    ctx.drawImage(fondo, 0, 0);
    const { monstruos } = this.montada;
    dibujarObjetos(ctx, sala, imagenes, tam, this.tiempo, -Infinity, pies);
    for (const m of monstruos) {
      if (m.vivo && m.y <= pies) dibujarMonstruoMapa(ctx, m, m.datos.color, this.tiempo);
    }
    // Parpadea mientras no se puede empezar otro combate.
    if (Math.floor(this.invulnerable * 10) % 2 === 0) dibujarHeroina(ctx, sprite, h, alpha);
    for (const m of monstruos) {
      if (m.vivo && m.y > pies) dibujarMonstruoMapa(ctx, m, m.datos.color, this.tiempo);
    }
    dibujarObjetos(ctx, sala, imagenes, tam, this.tiempo, pies, Infinity);
    ctx.drawImage(this.vineta, 0, 0);
    if (this.fundido > 0) {
      // Sube a negro y baja otra vez, con suavizado en los extremos.
      const t = 1 - Math.abs((2 * this.fundido) / duracionFundido - 1);
      ctx.globalAlpha = t * t * (3 - 2 * t);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.vineta.width, this.vineta.height);
      ctx.globalAlpha = 1;
    }
    this.refrescarHud();
    dibujarHud(ctx, this.o.luchadora, this.hud);
    // El minimapa va encima del fundido: es interfaz, no parte de la sala.
    ctx.drawImage(this.minimapa, this.vineta.width - this.minimapa.width - MARGEN_HUD, MARGEN_HUD);
  }

  private refrescarHud(): void {
    const l = this.o.luchadora;
    // Firma numérica de lo que se muestra: si no cambia, los textos siguen valiendo.
    const firma = ((l.nivel * 1000 + l.pv) * 1000 + l.pvMax) * 1000000 + l.pm * 1000 + l.pmMax;
    if (firma === this.hudFirma) return;
    this.hudFirma = firma;
    this.hud.cabecera = `${this.o.nombreZona} · Nv ${l.nivel}`;
    this.hud.pv = `${l.pv}/${l.pvMax}`;
    this.hud.pm = `${l.pm}/${l.pmMax}`;
  }

  private luchar(m: MonstruoMapa): void {
    this.o.iniciarCombate(m.datos, (resultado) => {
      if (resultado === 'victoria') m.vivo = false;
      this.invulnerable = this.o.invulnerabilidad;
    });
  }

  private cruzar(lado: number): void {
    const vecina = salaVecina(this.o.zona, this.actual, lado);
    const entrada = this.salidas.find((s) => s.lado === opuesto(lado));
    if (!vecina || !entrada) return;
    this.actual = vecina;
    this.montada = this.montar(vecina);
    this.minimapa = this.visitar(vecina);
    this.colocar(posicionEntrada(entrada, this.o.tam, this.o.heroina.cuerpo.alto));
  }

  /** Marca la sala como visitada y devuelve el minimapa al día. */
  private visitar(s: SalaZona): HTMLCanvasElement {
    this.visitadas.add(s);
    return pintarMinimapa(this.o.zona, this.visitadas, s, this.o.rejilla);
  }

  /** Coloca a la heroína sin interpolar desde la posición anterior (evita que cruce la pantalla). */
  private colocar({ x, y }: { x: number; y: number }): void {
    const h = this.o.heroina;
    h.cuerpo.x = h.xAnterior = x;
    h.cuerpo.y = h.yAnterior = y;
  }

  /** Monta la sala la primera vez que se visita; después la reutiliza tal cual. */
  private montar(s: SalaZona): SalaMontada {
    const hecha = this.montadas.get(s);
    if (hecha) return hecha;
    const { zona, plantillas, catalogo, imagenes, tam } = this.o;
    // Semilla propia por sala: la misma zona da siempre las mismas salas, se visiten en el orden que sea.
    const azar = crearAzar(zona.semilla * 1009 + zona.salas.indexOf(s));
    const candidatas = plantillas.plantillas.filter((p) => p.tipo === s.tipo);
    const plantilla = candidatas[Math.floor(azar() * candidatas.length)];
    if (!plantilla) throw new Error(`No hay plantillas de tipo ${s.tipo}`);
    const sala = construirSala(
      aplicarPuertas(plantilla.mapa, s.puertas),
      plantillas,
      catalogo,
      azar,
    );
    const montada = {
      sala,
      fondo: pintarFondo(sala, imagenes, tam),
      monstruos: this.poblar(s, sala, azar),
    };
    this.montadas.set(s, montada);
    return montada;
  }

  /** Monstruos de una sala de combate, en casillas libres lejos de las entradas. */
  private poblar(s: SalaZona, sala: Sala, azar: () => number): MonstruoMapa[] {
    const { monstruos, monstruosPorSala, distanciaMonstruos, tam } = this.o;
    if (s.tipo !== 'combate' || monstruos.length === 0) return [];
    return colocarMonstruos(sala, this.salidas, monstruosPorSala, distanciaMonstruos, azar).map(
      ([c, f]) => {
        const datos = monstruos[Math.floor(azar() * monstruos.length)]!;
        const { ancho, alto } = datos.caja;
        return {
          x: c * tam + tam / 2,
          y: f * tam + (tam + alto) / 2,
          ancho,
          alto,
          datos,
          vivo: true,
        };
      },
    );
  }
}
