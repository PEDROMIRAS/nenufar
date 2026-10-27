import type { Acciones } from '../core/acciones';
import type { Luchador, Resultado } from '../core/combate';
import { crearAzar, elegirConPeso } from '../core/azar';
import { actualizarHeroina, type Heroina } from '../core/heroina';
import {
  abrirSalidas,
  cerrarSalidas,
  objetoAlAlcance,
  opuesto,
  portalPisado,
  posicionEntrada,
  salaVecina,
  salidaPisada,
} from '../core/mapa';
import { colocarMonstruos, seTocan } from '../core/monstruos';
import { actualizarPatrulla, crearPatrulla, iniciativa, type Patrulla } from '../core/patrulla';
import { buscarInicio } from '../core/movimiento';
import {
  aplicarPuertas,
  chocarConElipse,
  construirSala,
  salidas,
  type Sala,
  type ObjetoSala,
  type Salida,
  type Tile,
} from '../core/sala';
import { abrirCofre } from '../core/equipo';
import type { CombateGuardado, EstadoMapa } from '../core/guardado';
import type { Inventario } from '../core/inventario';
import type {
  BotinJson,
  Direccion,
  MonstruoJson,
  ObjetosJson,
  PlantillasJson,
  ZonaHd2d,
} from '../core/types';
import type { SalaZona, Zona } from '../core/zona';
import {
  BOTON_MENU,
  colocarHud,
  dibujarAviso,
  dibujarBotonMenu,
  dibujarQuedan,
  dibujarHud,
  type TextosHud,
} from '../render/hud';
import { pintarMinimapa } from '../render/minimapa';
import { crearLluvia, dibujarLluvia, moverLluvia, type Lluvia } from '../render/lluvia';
import { direccionDe } from '../render/monstruo';
import type { Actor, FondoSala, Mundo, VistaSala } from '../render/mundo/mundo';
import type { Sprite } from '../render/recursos';
import { anunciar, movimientoReducido } from '../render/accesibilidad';
import { ponerMusica, sonar } from '../render/sonido';
import { dentro, SALA_ANCHO, vista as ventana } from '../render/pantalla';
import type { Escena } from './escena';

/** Vector hacia el que mira la heroína según su dirección. */
const MIRADA: Record<Direccion, [number, number]> = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

/** Separación del minimapa respecto al borde de la pantalla, en píxeles lógicos. */
const MARGEN_HUD = 6;
/** Píxeles alrededor de la heroína en los que un objeto se puede usar (pegarse a la fuente). */
const ALCANCE = 4;
/** Segundos que se ve un aviso en el mapa. */
const DURACION_AVISO = 2.5;

/** Un grupo de monstruos en el mapa: se ve y choca como el primero, y se lucha contra todos. */
interface MonstruoMapa {
  /** Posición, caja de colisión y patrulla (los jefes no tienen datos de movimiento y no se mueven). */
  p: Patrulla;
  grupo: MonstruoJson[];
  vivo: boolean;
}

interface SalaMontada {
  sala: Sala;
  /** La sala en 3D y un actor por monstruo de cada grupo; se montan la primera vez que se ve. */
  vista: { sala: VistaSala; actores: Actor[][] } | null;
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
  /** Pista de sonido.json que suena en la zona. */
  musica: string;
  /** Hojas de los monstruos, por el nombre de `sprite` de cada uno. */
  spritesMonstruos: ReadonlyMap<string, Sprite>;
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
  /** Jefe de la sala violeta, si la zona la tiene: espera en su centro como el de zona, sin portal. */
  jefeVioleta: MonstruoJson | null;
  /** El monstruo que es el cofre de un tesoro trampa: se lucha contra él al abrirlo. */
  cofreTrampa: MonstruoJson;
  distanciaMonstruos: number;
  /** Segundos sin poder empezar otro combate tras huir o vencer. */
  invulnerabilidad: number;
  /** Abre el combate contra `monstruo` y avisa de su resultado al terminar (salvo derrota). */
  iniciarCombate: (
    grupo: MonstruoJson[],
    alTerminar: (r: Resultado) => void,
    iniciativa: 'heroina' | 'monstruos' | null,
    /** Qué combate es, para poder volver a él si se cierra el navegador a mitad. */
    combate: CombateGuardado,
  ) => void;
  /** Estadísticas de combate de la heroína y nombre de la zona, para el HUD. */
  luchadora: Luchador;
  nombreZona: string;
  /** Segundos que llueve al vencer al jefe de la zona (el Rey Limo devuelve la lluvia); 0, nada. */
  lluviaTrasJefe: number;
  /** Pistas de controles que se enseñan una tras otra al empezar (solo la primera vez), y cuánto dura cada una. */
  pistas: readonly string[];
  segundosPista: number;
  /** Tabla del cofre de la sala del tesoro, inventario de la partida y objetos que existen. */
  cofre: readonly BotinJson[];
  inventario: Inventario;
  objetos: ObjetosJson;
  /** Enseña la comparación de una pieza de equipo encontrada y avisa al decidir. */
  ofrecerEquipo: (clave: string, alFinal: () => void) => void;
  /** Abre la pausa (MENU o el botón de la esquina). */
  abrirPausa: () => void;
  /** El mapa en 3D, compartido por todas las zonas, y el aspecto de esta. */
  mundo: Mundo;
  aspecto: ZonaHd2d;
  /** La fuente choca con la elipse de su pilón: cuánto baja su centro en la casilla y sus semiejes, en casillas. */
  fuente: { centroZ: number; radioX: number; radioZ: number };
  /** Estado recuperado de una partida guardada; null o ausente en una zona nueva. */
  recuperado?: EstadoMapa | null;
  /** Se llama al terminar de entrar en una sala (también la inicial y la recuperada), para guardar. */
  alEntrarEnSala?: (estado: EstadoMapa) => void;
}

/** Exploración de una zona: la sala actual, la heroína y el paso de una sala a otra o a la zona siguiente. */
export class EscenaMapa implements Escena {
  readonly conMundo = true;
  readonly ventana = true;

  private readonly montadas = new Map<SalaZona, SalaMontada>();
  private readonly salidas: Salida[];
  private readonly visitadas = new Set<SalaZona>();
  /** Salas con el cofre abierto, la fuente usada o el jefe vencido, para el minimapa. */
  private readonly hechas = new Set<SalaZona>();
  private actual: SalaZona;
  /** Lado por el que se entró en la sala actual; null en la de inicio. */
  private ladoEntrada: number | null = null;
  private montada: SalaMontada;
  private minimapa: HTMLCanvasElement;
  private tiempo = 0;
  /** Segundos que lleva el fundido (0 = sin fundido) y qué pasa a mitad: cruzar un lado o usar el portal. */
  private fundido = 0;
  private pendiente: number | 'portal' | null = null;
  private portalUsado = false;
  /** Segundos que quedan sin poder empezar otro combate. */
  private invulnerable = 0;
  /** Salidas cerradas mientras queden monstruos (bits), y casillas marcadas sólidas por ello. */
  private cerradas = 0;
  /** Grupos de monstruos que quedan en la sala y su texto (se rehace solo si cambia la cuenta). */
  private quedan = -1;
  private textoQuedan = '';
  private bloqueadas: number[] = [];
  /** Azar de la patrulla de los monstruos. */
  private readonly azarMapa: () => number;
  /** La fuente de la sala de descanso restaura una sola vez por zona. */
  private fuenteUsada = false;
  /** Segundos de lluvia que quedan, y sus gotas (solo si la zona tiene lluvia tras el jefe). */
  private lluvia = 0;
  /** Siguiente pista por enseñar. */
  private pista = 0;
  private readonly gotas: Lluvia | null;
  /** Aviso en pantalla (la fuente…) y segundos que le quedan. */
  private aviso = '';
  private tiempoAviso = 0;
  private readonly hud: TextosHud = { cabecera: '', pv: '', pm: '' };
  /** Valores con los que se escribieron los textos del HUD, para rehacerlos solo si cambian. */
  private hudFirma = -1;

  constructor(private readonly o: OpcionesMapa) {
    const inicio = o.zona.salas.find((s) => s.tipo === 'inicio');
    if (!inicio) throw new Error('La zona no tiene sala de inicio');
    this.azarMapa = crearAzar(o.zona.semilla * 7 + 3);
    this.gotas = o.lluviaTrasJefe > 0 ? crearLluvia() : null;
    const referencia = o.plantillas.plantillas[0]?.mapa ?? [];
    this.salidas = salidas(referencia[0]?.length ?? 0, referencia.length);
    const r = o.recuperado;
    if (r) this.recuperar(r);
    this.actual = (r && o.zona.salas[r.sala]) || inicio;
    this.montada = this.montar(this.actual);
    this.minimapa = this.visitar(this.actual);
    const entrada = r?.lado != null ? this.salidas.find((s) => s.lado === r.lado) : undefined;
    const c = o.heroina.cuerpo;
    if (entrada) {
      this.ladoEntrada = entrada.lado;
      this.colocar(posicionEntrada(entrada, o.tam, c.alto));
    } else {
      this.colocar(buscarInicio(this.montada.sala, o.tam, c.ancho, c.alto));
    }
    this.aplicarCierre();
    if (o.entrarDesdeNegro) this.fundido = o.duracionFundido / 2;
    o.alEntrarEnSala?.(this.estado());
  }

  /** Vuelve a dejar la zona como estaba al guardar: salas vistas y hechas, grupos vencidos, fuente. */
  private recuperar(r: EstadoMapa): void {
    const { salas } = this.o.zona;
    for (const i of r.visitadas) if (salas[i]) this.visitadas.add(salas[i]);
    for (const [i, posiciones] of Object.entries(r.vencidos)) {
      const s = salas[Number(i)];
      if (!s) continue;
      const m = this.montar(s);
      for (const p of posiciones) if (m.monstruos[p]) m.monstruos[p].vivo = false;
    }
    this.fuenteUsada = r.fuenteUsada;
    const abierto = this.o.catalogo.get('cofre_abierto');
    for (const i of r.hechas) {
      const s = salas[i];
      if (!s) continue;
      this.hechas.add(s);
      // Lo que se deduce de una sala hecha: el cofre abierto o el portal del jefe.
      if (s.tipo === 'tesoro' && abierto) {
        for (const o of this.montar(s).sala.objetos)
          if (o.inf.name === 'cofre_cerrado') o.inf = abierto;
      } else if (s.tipo === 'jefe') {
        this.abrirPortal(this.montar(s));
      }
    }
  }

  /** Lo que hay que guardar de la zona (al entrar en cada sala y al empezar y acabar cada combate). */
  estado(): EstadoMapa {
    const { salas } = this.o.zona;
    const vencidos: Record<number, number[]> = {};
    for (const [s, m] of this.montadas) {
      const posiciones = m.monstruos.flatMap((g, i) => (g.vivo ? [] : [i]));
      if (posiciones.length > 0) vencidos[salas.indexOf(s)] = posiciones;
    }
    return {
      sala: salas.indexOf(this.actual),
      lado: this.ladoEntrada,
      visitadas: [...this.visitadas].map((s) => salas.indexOf(s)),
      hechas: [...this.hechas].map((s) => salas.indexOf(s)),
      vencidos,
      fuenteUsada: this.fuenteUsada,
    };
  }

  enter(): void {
    const { mundo, aspecto, imagenes, catalogo, tam } = this.o;
    mundo.prepararZona(aspecto, imagenes, catalogo, tam);
  }

  exit(): void {
    this.o.mundo.vaciar();
    for (const m of this.montadas.values()) m.vista = null;
  }

  update(dt: number, acciones: Acciones): void {
    const { heroina: h, tam, duracionFundido } = this.o;
    ponerMusica(this.o.musica);
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
    // Escape, la tecla I o la mochila abren el inventario.
    colocarHud();
    if (acciones.menu || acciones.info || dentro(acciones.toqueX, acciones.toqueY, BOTON_MENU)) {
      this.o.abrirPausa();
      return;
    }
    actualizarHeroina(h, acciones, dt, this.montada.sala, tam, acciones.correr);
    this.tiempoAviso = Math.max(0, this.tiempoAviso - dt);
    if (this.tiempoAviso === 0 && this.pista < this.o.pistas.length) {
      this.avisar(this.o.pistas[this.pista++]!, this.o.segundosPista);
    }
    if (this.lluvia > 0 && this.gotas) {
      this.lluvia = Math.max(0, this.lluvia - dt);
      moverLluvia(this.gotas, dt);
    }
    if (
      !this.fuenteUsada &&
      this.actual.tipo === 'descanso' &&
      objetoAlAlcance(this.montada.sala, 'fuente', h.cuerpo, tam, ALCANCE)
    ) {
      const l = this.o.luchadora;
      l.pv = l.pvMax;
      l.pm = l.pmMax;
      this.fuenteUsada = true;
      this.marcarHecha(this.actual);
      sonar('cura');
      this.avisar('La fuente te restaura los PV y los PM');
    }
    // Tras huir del cofre trampa hay un momento para apartarse antes de que vuelva a morder.
    if (this.actual.tipo === 'tesoro' && !(this.actual.trampa && this.invulnerable > 0)) {
      const cofre = objetoAlAlcance(this.montada.sala, 'cofre_cerrado', h.cuerpo, tam, ALCANCE);
      if (cofre && this.actual.trampa && !this.hechas.has(this.actual)) {
        this.morder(cofre);
        return;
      }
      if (cofre) this.abrir(cofre);
    }
    for (const m of this.montada.monstruos) {
      const mov = m.grupo[0]?.mapa;
      if (m.vivo && mov) {
        actualizarPatrulla(
          m.p,
          mov,
          h.cuerpo.x,
          h.cuerpo.y,
          dt,
          this.montada.sala,
          tam,
          this.azarMapa,
        );
      }
    }
    if (this.invulnerable > 0) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
    } else {
      for (const m of this.montada.monstruos) {
        if (m.vivo && seTocan(h.cuerpo, m.p.cuerpo)) {
          this.luchar(m);
          return;
        }
      }
    }
    const abiertas = this.actual.puertas & ~this.cerradas;
    const salida = salidaPisada(this.salidas, abiertas, tam, h.cuerpo.x, h.cuerpo.y);
    if (salida) {
      this.pendiente = salida.lado;
      this.fundido = Number.EPSILON;
    } else if (
      this.o.alUsarPortal &&
      portalPisado(this.montada.sala, tam, h.cuerpo.x, h.cuerpo.y)
    ) {
      this.pendiente = 'portal';
      sonar('portal');
      this.fundido = Number.EPSILON;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    const { heroina: h, duracionFundido, mundo } = this.o;
    const vista = this.vistaDe(this.montada);
    this.montada.monstruos.forEach((m, i) => this.colocarMonstruos(m, vista.actores[i], alpha));
    // Parpadea 3 veces por segundo (tope de WCAG) mientras no se puede empezar otro combate; con menos
    // movimiento, medio transparente.
    let opacidad = 1;
    if (movimientoReducido()) {
      if (this.invulnerable > 0) opacidad = 0.5;
    } else if (Math.floor(this.invulnerable * 6) % 2 !== 0) {
      opacidad = 0;
    }
    mundo.dibujar(
      vista.sala,
      this.o.sprite,
      h.xAnterior + (h.cuerpo.x - h.xAnterior) * alpha,
      h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha,
      h.animacion,
      h.direccion,
      h.tiempoAnimacion,
      opacidad,
      this.cerradas,
      this.tiempo,
    );
    // El canvas 2D queda transparente encima del 3D, solo con la interfaz.
    ctx.clearRect(0, 0, ventana.ancho, ventana.alto);
    if (this.lluvia > 0 && this.gotas) {
      // Entra y se va poco a poco: un segundo al principio y otro al final.
      const total = this.o.lluviaTrasJefe;
      dibujarLluvia(ctx, this.gotas, Math.min(1, this.lluvia, total - this.lluvia));
    }
    if (this.fundido > 0) {
      // Sube a negro y baja otra vez, con suavizado en los extremos.
      const t = 1 - Math.abs((2 * this.fundido) / duracionFundido - 1);
      ctx.globalAlpha = t * t * (3 - 2 * t);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, ventana.ancho, ventana.alto);
      ctx.globalAlpha = 1;
    }
    this.refrescarHud();
    dibujarHud(ctx, this.o.luchadora, this.hud);
    if (this.cerradas) {
      let vivos = 0;
      for (const m of this.montada.monstruos) if (m.vivo) vivos++;
      if (vivos !== this.quedan) {
        this.quedan = vivos;
        this.textoQuedan = vivos === 1 ? 'Queda 1 grupo' : `Quedan ${vivos} grupos`;
      }
      if (vivos > 0) dibujarQuedan(ctx, this.textoQuedan);
    }
    if (this.tiempoAviso > 0) dibujarAviso(ctx, this.aviso);
    // El minimapa va encima del fundido: es interfaz, no parte de la sala.
    // A la izquierda de la mochila, como siempre; crece en enteros con el ancho que sobra a los lados de la sala.
    const { width: mw, height: mh } = this.minimapa;
    const lateral = (ventana.ancho - SALA_ANCHO) / 2 - 2 * MARGEN_HUD;
    const k = Math.max(1, Math.min(3, Math.floor(lateral / mw), Math.floor(ventana.alto / 2 / mh)));
    ctx.drawImage(this.minimapa, BOTON_MENU.x - MARGEN_HUD - mw * k, MARGEN_HUD, mw * k, mh * k);
    dibujarBotonMenu(ctx, this.o.luchadora.puntos > 0);
  }

  private avisar(texto: string, segundos = DURACION_AVISO): void {
    // Una pista que aún se veía y queda tapada por otro aviso vuelve a la cola: no se pierde.
    if (this.tiempoAviso > 0 && this.aviso === this.o.pistas[this.pista - 1]) this.pista--;
    this.aviso = texto;
    anunciar(texto);
    this.tiempoAviso = segundos;
  }

  /** Abre el cofre (se queda abierto) y guarda lo que hay o enseña la pieza de equipo. */
  private abrir(cofre: ObjetoSala): void {
    const { catalogo, cofre: tabla, luchadora, objetos, inventario } = this.o;
    const abierto = catalogo.get('cofre_abierto');
    if (abierto) cofre.inf = abierto;
    if (this.montada.vista) this.o.mundo.rehacerObjeto(this.montada.vista.sala, cofre);
    this.marcarHecha(this.actual);
    sonar('cofre');
    // Cada cofre sortea con su propio azar (zona y sala): cerrar el navegador y volver no lo cambia.
    const { zona } = this.o;
    const azar = crearAzar(zona.semilla * 1013 + zona.salas.indexOf(this.actual));
    const hallazgo = abrirCofre(tabla, azar, luchadora.heroe, objetos, inventario);
    if (!hallazgo) {
      this.avisar('El cofre está vacío');
    } else if (hallazgo.tipo === 'consumible') {
      this.avisar(
        hallazgo.guardado
          ? `En el cofre hay: ${hallazgo.nombre}`
          : `${hallazgo.nombre}: no te caben más`,
      );
    } else {
      this.o.ofrecerEquipo(hallazgo.clave, () => {});
    }
  }

  /** El cofre de un tesoro trampa es un monstruo: se abre igual (mismo sonido) y empieza el combate. */
  private morder(cofre: ObjetoSala): void {
    const sala = this.actual;
    sonar('cofre');
    this.o.iniciarCombate(
      [this.o.cofreTrampa],
      (resultado) => {
        this.invulnerable = this.o.invulnerabilidad;
        // Vencido, deja el botín de un cofre normal de la zona.
        if (resultado === 'victoria' && this.actual === sala) this.abrir(cofre);
      },
      null,
      { tipo: 'trampa' },
    );
  }

  /**
   * Vuelve a empezar el combate que se interrumpió al cerrar el navegador (la partida se recupera tal
   * como estaba al empezarlo). Si ya no está en la sala, no hace nada.
   */
  reanudarCombate(c: CombateGuardado): void {
    if (c.tipo === 'grupo') {
      const m = this.montada.monstruos[c.indice];
      if (m?.vivo) this.luchar(m, c.quien);
    } else if (c.tipo === 'trampa' && this.actual.trampa && !this.hechas.has(this.actual)) {
      const cofre = this.montada.sala.objetos.find((o) => o.inf.name === 'cofre_cerrado');
      if (cofre) this.morder(cofre);
    } else if (c.tipo === 'final') {
      // En la última zona, el portal lleva al jefe final.
      this.o.alUsarPortal?.();
    }
  }

  private refrescarHud(): void {
    const l = this.o.luchadora;
    // Firma numérica de lo que se muestra: si no cambia, los textos siguen valiendo.
    // shortcut: PV y PM de hasta 999 (hoy no pasan de 200); si crecen, ensanchar los factores.
    const firma = ((l.nivel * 1000 + l.pv) * 1000 + l.pvMax) * 1000000 + l.pm * 1000 + l.pmMax;
    if (firma === this.hudFirma) return;
    this.hudFirma = firma;
    this.hud.cabecera = `${this.o.nombreZona} · Nv ${l.nivel}`;
    this.hud.pv = `${l.pv}/${l.pvMax}`;
    this.hud.pm = `${l.pm}/${l.pmMax}`;
  }

  /** Coloca los actores de un grupo: el primero delante y los demás asomando a los lados. */
  private colocarMonstruos(m: MonstruoMapa, actores: Actor[] | undefined, alpha: number): void {
    if (!actores) return;
    const { cuerpo: c, xAnterior, yAnterior } = m.p;
    const x = xAnterior + (c.x - xAnterior) * alpha;
    const y = yAnterior + (c.y - yAnterior) * alpha;
    const andando = c.x !== xAnterior || c.y !== yAnterior;
    const direccion = direccionDe(m.p.dirX, m.p.dirY);
    actores.forEach((a, i) => {
      a.malla.visible = m.vivo;
      if (!m.vivo) return;
      const dx = i === 0 ? 0 : i % 2 === 1 ? -10 : 10;
      // Desfase por posición en el grupo: así no andan todos al paso.
      this.o.mundo.colocarActor(
        a,
        x + dx,
        y - (i > 0 ? 5 : 0),
        andando ? 'walk' : 'idle',
        direccion,
        this.tiempo + i * 0.37,
      );
    });
  }

  /** La sala en 3D, montada la primera vez que se ve, con un actor por monstruo. */
  private vistaDe(m: SalaMontada): { sala: VistaSala; actores: Actor[][] } {
    if (m.vista) return m.vista;
    const { mundo, zona, spritesMonstruos } = this.o;
    const sala = mundo.montar(
      m.sala,
      this.salidas,
      zona.semilla * 31 + zona.salas.indexOf(this.actual),
    );
    const actores = m.monstruos.map((g) =>
      g.grupo.flatMap((monstruo) => {
        const sprite = spritesMonstruos.get(monstruo.sprite);
        return sprite ? [mundo.crearActor(sala, sprite)] : [];
      }),
    );
    m.vista = { sala, actores };
    return m.vista;
  }

  /** La sala actual en 3D, de decorado del combate y de la presentación de los jefes. */
  readonly fondoSala: FondoSala = (tiempo, temblor, luz) =>
    this.o.mundo.dibujarFondo(this.vistaDe(this.montada).sala, tiempo, temblor, luz);

  /** Empieza el combate contra el grupo `m`; `forzada` es la iniciativa de un combate reanudado. */
  private luchar(m: MonstruoMapa, forzada?: 'heroina' | 'monstruos' | null): void {
    const sala = this.montada;
    const salaZona = this.actual;
    const h = this.o.heroina;
    const [dirX, dirY] = MIRADA[h.direccion];
    // Solo los monstruos que se mueven pueden pillar o ser pillados por la espalda.
    const quien =
      forzada !== undefined
        ? forzada
        : m.grupo[0]?.mapa
          ? iniciativa(
              { x: h.cuerpo.x, y: h.cuerpo.y, dirX, dirY },
              { x: m.p.cuerpo.x, y: m.p.cuerpo.y, dirX: m.p.dirX, dirY: m.p.dirY },
            )
          : null;
    this.o.iniciarCombate(
      m.grupo,
      (resultado) => {
        if (resultado === 'victoria') {
          m.vivo = false;
          if (m.grupo[0]?.jefe) this.marcarHecha(salaZona);
          if (salaZona.tipo === 'jefe') {
            this.abrirPortal(sala);
            this.lluvia = this.o.lluviaTrasJefe;
          }
          const cerrada = this.cerradas !== 0;
          this.soltarCierre();
          this.aplicarCierre();
          if (cerrada && this.cerradas === 0) this.avisar('Las puertas se abren');
        }
        this.invulnerable = this.o.invulnerabilidad;
      },
      quien,
      { tipo: 'grupo', indice: sala.monstruos.indexOf(m), quien },
    );
  }

  private cruzar(lado: number): void {
    const vecina = salaVecina(this.o.zona, this.actual, lado);
    const entrada = this.salidas.find((s) => s.lado === opuesto(lado));
    if (!vecina || !entrada) return;
    this.soltarCierre();
    this.actual = vecina;
    this.montada = this.montar(vecina);
    this.minimapa = this.visitar(vecina);
    this.colocar(posicionEntrada(entrada, this.o.tam, this.o.heroina.cuerpo.alto));
    this.ladoEntrada = entrada.lado;
    this.aplicarCierre();
    // Los probadores no entendían por qué no podían salir: se dice en pantalla, no solo al lector.
    if (this.cerradas !== 0) this.avisar('Vence a los monstruos para abrir las puertas');
    this.o.alEntrarEnSala?.(this.estado());
  }

  /**
   * En una sala de combate con monstruos vivos se cierran todas las salidas, también la de entrada:
   * no se sale hasta vencerlos (decisión de Pedro; la dificultad se elige al empezar).
   */
  private aplicarCierre(): void {
    const { sala, monstruos } = this.montada;
    const conCierre = this.actual.tipo === 'combate' || this.actual.tipo === 'violeta';
    const hayMonstruos = conCierre && monstruos.some((m) => m.vivo);
    this.cerradas = hayMonstruos ? this.actual.puertas : 0;
    this.bloqueadas.push(...cerrarSalidas(sala, this.salidas, this.cerradas));
  }

  /** Devuelve a su estado las casillas que cerró aplicarCierre (antes de cambiar de sala o al vencer). */
  private soltarCierre(): void {
    abrirSalidas(this.montada.sala, this.bloqueadas);
    this.bloqueadas = [];
    this.cerradas = 0;
  }

  /** Marca la sala como visitada y devuelve el minimapa al día. */
  private visitar(s: SalaZona): HTMLCanvasElement {
    this.visitadas.add(s);
    return pintarMinimapa(this.o.zona, this.visitadas, s, this.o.rejilla, this.hechas);
  }

  /** Su punto del minimapa pasa a gris (cofre abierto, fuente usada, jefe vencido). */
  private marcarHecha(s: SalaZona): void {
    this.hechas.add(s);
    this.minimapa = this.visitar(this.actual);
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
    const { zona, plantillas, catalogo, tam } = this.o;
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
    const fuente = sala.objetos.find((o) => o.inf.name === 'fuente_cen_inf');
    if (fuente) {
      const f = this.o.fuente;
      chocarConElipse(sala, tam, fuente.x + 0.5, fuente.y + f.centroZ, f.radioX, f.radioZ);
    }
    // Con jefe, el portal se saca de la sala hasta vencerlo.
    let portal: ObjetoSala | null = null;
    if (s.tipo === 'jefe' && this.o.jefe) {
      portal = sala.objetos.find((o) => o.inf.name === 'portal') ?? null;
      sala.objetos = sala.objetos.filter((o) => o !== portal);
    }
    const montada = {
      sala,
      vista: null,
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
    if (m.vista) {
      this.o.mundo.rehacerObjeto(m.vista.sala, m.portal);
      this.o.mundo.refrescarLuces();
    }
    m.portal = null;
  }

  /** Grupos de monstruos de una sala de combate, en casillas libres lejos de las entradas. */
  private poblar(s: SalaZona, sala: Sala, azar: () => number): MonstruoMapa[] {
    const { grupos, gruposPorSala, distanciaMonstruos, tam, jefe, jefeVioleta } = this.o;
    const central = s.tipo === 'jefe' ? jefe : s.tipo === 'violeta' ? jefeVioleta : null;
    if (central) {
      const { ancho, alto } = central.caja;
      const x = Math.floor(sala.ancho / 2) * tam + tam / 2;
      const y = Math.floor(sala.alto / 2) * tam + (tam + alto) / 2;
      return [{ p: crearPatrulla({ x, y, ancho, alto }), grupo: [central], vivo: true }];
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
          {
            p: crearPatrulla({ x: c * tam + tam / 2, y: f * tam + (tam + alto) / 2, ancho, alto }),
            grupo,
            vivo: true,
          },
        ];
      },
    );
  }
}
