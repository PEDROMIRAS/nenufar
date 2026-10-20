import type { Acciones } from '../core/acciones';
import type { Luchador, Resultado } from '../core/combate';
import { crearAzar, elegirConPeso } from '../core/azar';
import { actualizarHeroina, type Heroina } from '../core/heroina';
import {
  objetoAlAlcance,
  opuesto,
  portalPisado,
  posicionEntrada,
  salaVecina,
  salidaPisada,
} from '../core/mapa';
import { colocarMonstruos, seTocan, type Caja } from '../core/monstruos';
import { buscarInicio } from '../core/movimiento';
import {
  aplicarPuertas,
  construirSala,
  salidas,
  type Sala,
  type ObjetoSala,
  type Salida,
  type Tile,
} from '../core/sala';
import type { MonstruoJson, PlantillasJson } from '../core/types';
import type { SalaZona, Zona } from '../core/zona';
import { dibujarHeroina } from '../render/heroina';
import { dibujarAviso, dibujarHud, type TextosHud } from '../render/hud';
import { pintarMinimapa } from '../render/minimapa';
import { dibujarMonstruoMapa } from '../render/monstruo';
import type { Sprite } from '../render/recursos';
import { dibujarObjetos, pintarFondo, pintarVineta } from '../render/sala';
import type { Escena } from './escena';

/** Separación del minimapa respecto al borde de la pantalla, en píxeles lógicos. */
const MARGEN_HUD = 6;
/** Píxeles alrededor de la heroína en los que un objeto se puede usar (pegarse a la fuente). */
const ALCANCE = 4;
/** Segundos que se ve un aviso en el mapa. */
const DURACION_AVISO = 2.5;

/** Un grupo de monstruos en el mapa: se ve y choca como el primero, y se lucha contra todos. */
interface MonstruoMapa extends Caja {
  grupo: MonstruoJson[];
  vivo: boolean;
}

interface SalaMontada {
  sala: Sala;
  fondo: HTMLCanvasElement;
  monstruos: MonstruoMapa[];
  /** Portal de la sala del jefe, guardado fuera de la sala hasta que se vence al jefe. */
  portal: ObjetoSala | null;
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
  grupos: readonly { monstruos: MonstruoJson[]; peso: number }[];
  gruposPorSala: { min: number; max: number };
  /** Jefe de la zona: espera en el centro de su sala, y el portal no aparece hasta vencerlo. */
  jefe: MonstruoJson | null;
  distanciaMonstruos: number;
  /** Segundos sin poder empezar otro combate tras huir o vencer. */
  invulnerabilidad: number;
  /** Abre el combate contra `monstruo` y avisa de su resultado al terminar (salvo derrota). */
  iniciarCombate: (grupo: MonstruoJson[], alTerminar: (r: Resultado) => void) => void;
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
  /** La fuente de la sala de descanso restaura una sola vez por zona. */
  private fuenteUsada = false;
  /** Aviso en pantalla (la fuente…) y segundos que le quedan. */
  private aviso = '';
  private tiempoAviso = 0;
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
    this.tiempoAviso = Math.max(0, this.tiempoAviso - dt);
    if (
      !this.fuenteUsada &&
      this.actual.tipo === 'descanso' &&
      objetoAlAlcance(this.montada.sala, 'fuente', h.cuerpo, tam, ALCANCE)
    ) {
      const l = this.o.luchadora;
      l.pv = l.pvMax;
      l.pm = l.pmMax;
      this.fuenteUsada = true;
      this.aviso = 'La fuente te restaura los PV y los PM';
      this.tiempoAviso = DURACION_AVISO;
    }
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
      if (m.vivo && m.y <= pies) dibujarMonstruoMapa(ctx, m, m.grupo, this.tiempo);
    }
    // Parpadea mientras no se puede empezar otro combate.
    if (Math.floor(this.invulnerable * 10) % 2 === 0) dibujarHeroina(ctx, sprite, h, alpha);
    for (const m of monstruos) {
      if (m.vivo && m.y > pies) dibujarMonstruoMapa(ctx, m, m.grupo, this.tiempo);
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
    if (this.tiempoAviso > 0) dibujarAviso(ctx, this.aviso);
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
    const sala = this.montada;
    this.o.iniciarCombate(m.grupo, (resultado) => {
      if (resultado === 'victoria') {
        m.vivo = false;
        if (m.grupo[0]?.jefe) this.abrirPortal(sala);
      }
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
    // Con jefe, el portal se saca de la sala antes de pintar el fondo (sin él ni su halo).
    let portal: ObjetoSala | null = null;
    if (s.tipo === 'jefe' && this.o.jefe) {
      portal = sala.objetos.find((o) => o.inf.name === 'portal') ?? null;
      sala.objetos = sala.objetos.filter((o) => o !== portal);
    }
    const montada = {
      sala,
      fondo: pintarFondo(sala, imagenes, tam),
      monstruos: this.poblar(s, sala, azar),
      portal,
    };
    this.montadas.set(s, montada);
    return montada;
  }

  /** Tras vencer al jefe aparece el portal (con su halo de luz). */
  private abrirPortal(m: SalaMontada): void {
    if (!m.portal) return;
    m.sala.objetos = [...m.sala.objetos, m.portal].sort((a, b) => a.y - b.y);
    m.portal = null;
    m.fondo = pintarFondo(m.sala, this.o.imagenes, this.o.tam);
  }

  /** Grupos de monstruos de una sala de combate, en casillas libres lejos de las entradas. */
  private poblar(s: SalaZona, sala: Sala, azar: () => number): MonstruoMapa[] {
    const { grupos, gruposPorSala, distanciaMonstruos, tam, jefe } = this.o;
    if (s.tipo === 'jefe' && jefe) {
      const { ancho, alto } = jefe.caja;
      const x = Math.floor(sala.ancho / 2) * tam + tam / 2;
      const y = Math.floor(sala.alto / 2) * tam + (tam + alto) / 2;
      return [{ x, y, ancho, alto, grupo: [jefe], vivo: true }];
    }
    if (s.tipo !== 'combate' || grupos.length === 0) return [];
    const { min, max } = gruposPorSala;
    const cuantos = min + Math.floor(azar() * (max - min + 1));
    return colocarMonstruos(sala, this.salidas, cuantos, distanciaMonstruos, azar).flatMap(
      ([c, f]) => {
        const grupo = elegirConPeso(grupos, azar)?.monstruos;
        const primero = grupo?.[0];
        if (!grupo || !primero) return [];
        const { ancho, alto } = primero.caja;
        return [
          { x: c * tam + tam / 2, y: f * tam + (tam + alto) / 2, ancho, alto, grupo, vivo: true },
        ];
      },
    );
  }
}
