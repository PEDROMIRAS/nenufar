import type { Acciones } from '../core/acciones';
import {
  actuar,
  avanzar,
  puedeHuir,
  type Combate,
  type Evento,
  type Luchador,
  type Resultado,
} from '../core/combate';
import { BOTONES, dibujarCombate, type AccionMenu, type VistaCombate } from '../render/combate';
import type { Sprite } from '../render/recursos';
import type { Escena } from './escena';

/** Segundos que se muestra cada tipo de evento antes de pasar al siguiente. */
const DURACION: Record<Evento['tipo'], number> = {
  turno: 0.15,
  danio: 0.7,
  defensa: 0.6,
  carga: 1.0,
  huida: 0.7,
  muerte: 0.6,
  experiencia: 0.8,
  nivel: 1.2,
  fin: 0,
};
/** Segundos que parpadea quien recibe un golpe y flota su número. */
const DURACION_GOLPE = 0.7;
const TITULO: Record<Resultado, string> = {
  victoria: '¡Victoria!',
  derrota: 'Has caído...',
  huida: 'Has huido',
};

const textoVida = (pv: number, max: number): string => `${pv}/${max}`;

/** Pantalla de combate: anima los eventos de `core/combate` uno a uno y recoge la acción de la heroína. */
export class EscenaCombate implements Escena {
  private readonly cola: Evento[] = [];
  /** Segundos que faltan para pasar al siguiente evento. */
  private espera = 0;
  /** Dirección horizontal del paso anterior, para mover la selección una vez por pulsación. */
  private ultimoX = 0;
  private readonly v: VistaCombate;

  constructor(
    private readonly combate: Combate,
    sprite: Sprite,
    private readonly alTerminar: (resultado: Resultado) => void,
  ) {
    const todos = [combate.heroina, ...combate.enemigos];
    const h = combate.heroina;
    this.v = {
      combate,
      sprite,
      tiempo: 0,
      pv: new Map(todos.map((l) => [l, l.pv])),
      textoPv: new Map(todos.map((l) => [l, textoVida(l.pv, l.pvMax)])),
      textoPm: textoVida(h.pm, h.pmMax),
      registro: ['', `¡Aparece ${combate.enemigos.map((e) => e.nombre).join(' y ')}!`],
      seleccion: 0,
      menuActivo: false,
      puedeHuir: puedeHuir(combate),
      golpeado: null,
      flotante: '',
      tiempoGolpe: 0,
      cargando: new Set(),
      defendiendo: false,
      titulo: '',
    };
  }

  enter(): void {
    this.cola.push(...avanzar(this.combate));
  }

  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    const v = this.v;
    v.tiempo += dt;
    if (v.golpeado) {
      v.tiempoGolpe += dt;
      if (v.tiempoGolpe >= DURACION_GOLPE) v.golpeado = null;
    }
    if (this.espera > 0) {
      this.espera -= dt;
      return;
    }
    const evento = this.cola.shift();
    if (evento) {
      this.mostrar(evento);
      this.espera = DURACION[evento.tipo];
      return;
    }
    const { resultado } = this.combate;
    if (resultado) {
      if (acciones.confirmar || acciones.toqueX >= 0) this.alTerminar(resultado);
      return;
    }
    if (this.combate.esperando) this.manejarMenu(acciones);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarCombate(ctx, this.v);
  }

  /** Aplica a la vista lo que cuenta un evento: vida, aviso, registro... */
  private mostrar(e: Evento): void {
    const v = this.v;
    switch (e.tipo) {
      case 'turno':
        // La defensa dura hasta el comienzo de su propio turno.
        if (e.actor.esHeroina) v.defendiendo = false;
        break;
      case 'danio': {
        const pv = Math.max(0, (v.pv.get(e.objetivo) ?? 0) - e.cantidad);
        v.pv.set(e.objetivo, pv);
        v.textoPv.set(e.objetivo, textoVida(pv, e.objetivo.pvMax));
        v.golpeado = e.objetivo;
        v.tiempoGolpe = 0;
        v.flotante = e.critico ? `${e.cantidad}!` : String(e.cantidad);
        if (e.cargado) v.cargando.delete(e.origen);
        const como = e.cargado ? 'descarga su golpe sobre' : 'golpea a';
        this.registrar(
          `${e.origen.nombre} ${como} ${e.objetivo.nombre}: ${e.cantidad}${e.critico ? ' ¡crítico!' : ''}`,
        );
        break;
      }
      case 'defensa':
        v.defendiendo = true;
        v.textoPm = textoVida(e.actor.pm, e.actor.pmMax);
        this.registrar(`${e.actor.nombre} se defiende (+${e.pm} PM)`);
        break;
      case 'carga':
        v.cargando.add(e.actor);
        this.registrar(e.aviso);
        break;
      case 'huida':
        this.registrar(e.exito ? 'Huyes del combate.' : 'No consigues huir.');
        break;
      case 'muerte':
        this.registrar(`${e.objetivo.nombre} cae.`);
        break;
      case 'experiencia':
        this.registrar(`+${e.cantidad} PX`);
        break;
      case 'nivel': {
        // Las estadísticas ya son las del nivel nuevo: la vista se pone al día de golpe.
        const h = this.combate.heroina;
        v.pv.set(h, h.pv);
        v.textoPv.set(h, textoVida(h.pv, h.pvMax));
        v.textoPm = textoVida(h.pm, h.pmMax);
        this.registrar(`¡${h.nombre} sube a nivel ${e.nivel}!`);
        break;
      }
      case 'fin':
        v.titulo = TITULO[e.resultado];
        v.menuActivo = false;
        break;
    }
  }

  private registrar(texto: string): void {
    this.v.registro[0] = this.v.registro[1];
    this.v.registro[1] = texto;
  }

  private manejarMenu(a: Acciones): void {
    const v = this.v;
    v.menuActivo = true;
    // Tocar un botón lo elige y lo usa a la vez.
    if (a.toqueX >= 0) {
      const i = BOTONES.findIndex(
        (b) =>
          a.toqueX >= b.x && a.toqueX < b.x + b.ancho && a.toqueY >= b.y && a.toqueY < b.y + b.alto,
      );
      if (i >= 0) {
        v.seleccion = i;
        this.elegir(BOTONES[i]!.accion);
      }
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) {
      v.seleccion = (v.seleccion + dir + BOTONES.length) % BOTONES.length;
    }
    this.ultimoX = dir;
    if (a.confirmar) this.elegir(BOTONES[v.seleccion]!.accion);
  }

  private elegir(accion: AccionMenu): void {
    if (accion === 'huir' && !this.v.puedeHuir) {
      this.registrar('¡De este combate no se puede huir!');
      return;
    }
    // shortcut: siempre al primer enemigo vivo; elegir objetivo llega con los grupos de monstruos (hito 4).
    const objetivo = this.combate.enemigos.find((e: Luchador) => e.pv > 0);
    if (accion === 'atacar' && !objetivo) return;
    this.v.menuActivo = false;
    this.cola.push(
      ...actuar(
        this.combate,
        accion === 'atacar' ? { tipo: 'atacar', objetivo: objetivo! } : { tipo: accion },
      ),
    );
  }
}
