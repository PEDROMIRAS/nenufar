import type { Acciones } from '../core/acciones';
import {
  actuar,
  avanzar,
  habilidadesDisponibles,
  puedeHuir,
  type AccionHeroina,
  type Combate,
  type Evento,
  type Luchador,
  type Resultado,
} from '../core/combate';
import {
  anticipoAtaque,
  dibujarCombate,
  rectOpcion,
  type MenuVista,
  type VistaCombate,
} from '../render/combate';
import type { Sprite } from '../render/recursos';
import type { Escena } from './escena';

/** Segundos que se muestra cada tipo de evento antes de pasar al siguiente. */
const DURACION: Record<Evento['tipo'], number> = {
  turno: 0.15,
  danio: 0.7,
  defensa: 0.6,
  carga: 1.0,
  habilidad: 0.6,
  cura: 0.7,
  estado: 0.6,
  danioEstado: 0.7,
  pierdeTurno: 0.7,
  aviso: 1.1,
  aparece: 0.5,
  objeto: 0.6,
  mana: 0.6,
  botin: 0.8,
  equipo: 0.9,
  iniciativa: 1.0,
  huida: 0.7,
  muerte: 0.6,
  recupera: 0.8,
  experiencia: 0.8,
  nivel: 1.2,
  fin: 0,
};
/** Efecto que deja el golpe de un monstruo sobre la heroína. */
const EFECTO_MONSTRUO = 'impacto';
/** Segundos que parpadea quien recibe un golpe y flota su número. */
const DURACION_GOLPE = 0.7;
const TITULO: Record<Resultado, string> = {
  victoria: '¡Victoria!',
  derrota: 'Has caído...',
  huida: 'Has huido',
};
const PRINCIPAL = ['Atacar', 'Habilidad', 'Objeto', 'Defender', 'Huir'] as const;
type Modo = 'principal' | 'habilidades' | 'objetos' | 'objetivo';

const textoVida = (pv: number, max: number): string => `${pv}/${max}`;

/** Pantalla de combate: anima los eventos de `core/combate` uno a uno y recoge la acción de la heroína. */
export class EscenaCombate implements Escena {
  private readonly cola: Evento[] = [];
  /** Segundos que faltan para pasar al siguiente evento. */
  private espera = 0;
  /** Dirección del paso anterior, para mover la selección una vez por pulsación. */
  private ultimoX = 0;
  private ultimoY = 0;
  private modo: Modo = 'principal';
  /** Acción a la que solo le falta el objetivo, mientras se elige. */
  private pendiente: ((objetivo: Luchador) => AccionHeroina) | null = null;
  /** Opción elegida la última vez en el menú principal, para volver a ella. */
  private seleccionPrincipal = 0;
  /** Estados que se ven sobre cada luchador, en el orden en que aparecieron. */
  private readonly estadosVistos = new Map<Luchador, string[]>();
  private readonly v: VistaCombate;
  /** Quién hizo el último golpe enseñado, para no repetir su animación en un ataque a varios. */
  private ultimoAtacante: Luchador | null = null;

  constructor(
    private readonly combate: Combate,
    sprite: Sprite,
    hojas: ReadonlyMap<string, Sprite>,
    fondo: HTMLCanvasElement,
    private readonly alTerminar: (resultado: Resultado) => void,
  ) {
    const todos = [combate.heroina, ...combate.enemigos];
    const h = combate.heroina;
    this.v = {
      combate,
      sprite,
      hojas,
      fondo,
      tiempo: 0,
      pv: new Map(todos.map((l) => [l, l.pv])),
      textoPv: new Map(todos.map((l) => [l, textoVida(l.pv, l.pvMax)])),
      textoPm: textoVida(h.pm, h.pmMax),
      estados: new Map(),
      registro: ['', `¡Aparece ${combate.enemigos.map((e) => e.nombre).join(' y ')}!`],
      menu: null,
      apuntado: null,
      golpeado: null,
      flotante: '',
      flotanteCura: false,
      tiempoGolpe: 0,
      atacante: null,
      tiempoAtaque: 0,
      objetivoAtaque: null,
      efecto: '',
      efectoEn: null,
      tiempoEfecto: 0,
      tiempoCaida: -1,
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
    v.tiempoAtaque += dt;
    v.tiempoEfecto += dt;
    if (v.tiempoCaida >= 0) v.tiempoCaida += dt;
    if (v.golpeado) {
      v.tiempoGolpe += dt;
      if (v.tiempoGolpe >= DURACION_GOLPE) v.golpeado = null;
    }
    if (this.espera > 0) {
      this.espera -= dt;
      return;
    }
    // Antes de enseñar un golpe, el atacante hace su animación (los golpes seguidos del mismo, una vez).
    const siguiente = this.cola[0];
    if (siguiente?.tipo === 'danio' && siguiente.origen !== this.ultimoAtacante) {
      this.ultimoAtacante = siguiente.origen;
      v.atacante = siguiente.origen;
      v.objetivoAtaque = siguiente.objetivo;
      v.tiempoAtaque = 0;
      this.espera = anticipoAtaque(v, siguiente.origen);
      return;
    }
    const evento = this.cola.shift();
    if (evento) {
      if (evento.tipo !== 'danio') this.ultimoAtacante = null;
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
        this.cambiarVida(
          e.objetivo,
          -e.cantidad,
          e.critico ? `${e.cantidad}!` : String(e.cantidad),
        );
        if (e.cargado) v.cargando.delete(e.origen);
        v.efecto = e.origen.heroe?.combate.efecto ?? EFECTO_MONSTRUO;
        v.efectoEn = e.objetivo;
        v.tiempoEfecto = 0;
        const como = e.cargado ? 'descarga su golpe sobre' : 'golpea a';
        this.registrar(
          `${e.origen.nombre} ${como} ${e.objetivo.nombre}: ${e.cantidad}${e.critico ? ' ¡crítico!' : ''}`,
        );
        break;
      }
      case 'danioEstado':
        this.cambiarVida(e.objetivo, -e.cantidad, String(e.cantidad));
        this.registrar(`${e.objetivo.nombre} pierde ${e.cantidad} PV por ${e.estado}`);
        break;
      case 'cura':
        this.cambiarVida(e.objetivo, e.cantidad, `+${e.cantidad}`);
        this.registrar(`${e.objetivo.nombre} recupera ${e.cantidad} PV`);
        break;
      case 'habilidad':
        if (e.actor.esHeroina) v.textoPm = textoVida(e.actor.pm, e.actor.pmMax);
        this.registrar(`${e.actor.nombre} usa ${e.nombre}`);
        break;
      case 'estado': {
        const lista = (this.estadosVistos.get(e.objetivo) ?? []).filter((n) => n !== e.estado);
        if (e.activo) lista.push(e.estado);
        this.estadosVistos.set(e.objetivo, lista);
        v.estados.set(e.objetivo, lista.join(' · '));
        this.registrar(
          e.activo
            ? `${e.estado} en ${e.objetivo.nombre}`
            : `Se acaba ${e.estado} en ${e.objetivo.nombre}`,
        );
        break;
      }
      case 'pierdeTurno':
        this.registrar(`${e.actor.nombre} pierde el turno`);
        break;
      case 'aviso':
        // Un jefe que se transforma deja de verse sin «caer».
        if (e.retira) {
          v.pv.set(e.actor, 0);
          v.estados.delete(e.actor);
          v.cargando.delete(e.actor);
        }
        this.registrar(e.texto);
        break;
      case 'iniciativa':
        this.registrar(
          e.quien === 'heroina'
            ? '¡Pillas al enemigo por la espalda!'
            : '¡Te atacan por la espalda!',
        );
        break;
      case 'aparece':
        v.pv.set(e.objetivo, e.objetivo.pv);
        v.textoPv.set(e.objetivo, textoVida(e.objetivo.pv, e.objetivo.pvMax));
        this.registrar(`¡Aparece ${e.objetivo.nombre}!`);
        break;
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
        if (e.objetivo.esHeroina) v.tiempoCaida = 0;
        v.estados.delete(e.objetivo);
        this.estadosVistos.delete(e.objetivo);
        this.registrar(`${e.objetivo.nombre} cae.`);
        break;
      case 'objeto':
        this.registrar(`${e.actor.nombre} usa ${e.nombre}`);
        break;
      case 'mana':
        v.textoPm = textoVida(e.objetivo.pm, e.objetivo.pmMax);
        this.registrar(`${e.objetivo.nombre} recupera ${e.cantidad} PM`);
        break;
      case 'botin':
        this.registrar(e.guardado ? `Obtienes ${e.nombre}` : `${e.nombre}: no te caben más`);
        break;
      case 'equipo':
        this.registrar(`¡Encuentras ${e.nombre}!`);
        break;
      case 'recupera': {
        const h = this.combate.heroina;
        v.pv.set(h, h.pv);
        v.textoPv.set(h, textoVida(h.pv, h.pvMax));
        v.textoPm = textoVida(h.pm, h.pmMax);
        this.registrar(`Recuperas ${e.pv} PV y ${e.pm} PM`);
        break;
      }
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
        v.menu = null;
        break;
    }
  }

  /** Cambia la vida que se ve y hace flotar el número (rojo/blanco si es daño, verde si es cura). */
  private cambiarVida(l: Luchador, cambio: number, flotante: string): void {
    const v = this.v;
    const pv = Math.min(l.pvMax, Math.max(0, (v.pv.get(l) ?? 0) + cambio));
    v.pv.set(l, pv);
    v.textoPv.set(l, textoVida(pv, l.pvMax));
    v.golpeado = l;
    v.tiempoGolpe = 0;
    v.flotante = flotante;
    v.flotanteCura = cambio > 0;
  }

  private registrar(texto: string): void {
    this.v.registro[0] = this.v.registro[1];
    this.v.registro[1] = texto;
  }

  private vivos(): Luchador[] {
    return this.combate.enemigos.filter((e) => e.pv > 0);
  }

  private abrir(modo: Modo): void {
    this.modo = modo;
    const h = this.combate.heroina;
    let menu: MenuVista;
    if (modo === 'principal') {
      const disponible = [
        true,
        habilidadesDisponibles(h).length > 0,
        this.consumibles().some((clave) => this.cuantos(clave) > 0),
        true,
        puedeHuir(this.combate),
      ];
      menu = {
        opciones: PRINCIPAL.map((texto, i) => ({ texto, detalle: '', disponible: disponible[i]! })),
        seleccion: this.seleccionPrincipal,
      };
    } else if (modo === 'objetos') {
      menu = {
        opciones: [
          ...this.consumibles().map((clave) => ({
            texto: this.combate.objetos.consumibles[clave]!.nombre,
            detalle: `x${this.cuantos(clave)}`,
            disponible: this.cuantos(clave) > 0,
          })),
          { texto: 'Volver', detalle: '', disponible: true },
        ],
        seleccion: 0,
      };
    } else if (modo === 'objetivo') {
      menu = {
        opciones: [
          ...this.vivos().map((e) => ({ texto: e.nombre, detalle: '', disponible: true })),
          { texto: 'Volver', detalle: '', disponible: true },
        ],
        seleccion: 0,
      };
    } else {
      menu = {
        opciones: [
          ...habilidadesDisponibles(h).map((hab) => ({
            texto: hab.nombre,
            detalle: `${hab.pm} PM`,
            disponible: hab.pm <= h.pm,
          })),
          { texto: 'Volver', detalle: '', disponible: true },
        ],
        seleccion: 0,
      };
    }
    this.v.menu = menu;
  }

  private manejarMenu(a: Acciones): void {
    if (!this.v.menu) this.abrir('principal');
    const menu = this.v.menu!;
    const n = menu.opciones.length;
    // Tocar una opción la elige y la usa a la vez.
    if (a.toqueX >= 0) {
      for (let i = 0; i < n; i++) {
        const r = rectOpcion(i, n);
        if (
          a.toqueX >= r.x &&
          a.toqueX < r.x + r.ancho &&
          a.toqueY >= r.y &&
          a.toqueY < r.y + r.alto
        ) {
          menu.seleccion = i;
          this.elegir(i);
          return;
        }
      }
      return;
    }
    if (a.cancelar && this.modo !== 'principal') {
      this.abrir('principal');
      return;
    }
    const dx = Math.sign(a.moverX);
    const dy = Math.sign(a.moverY);
    // En la rejilla de 3 columnas, arriba y abajo saltan una fila.
    const salto = (dx !== this.ultimoX ? dx : 0) + (n > 5 && dy !== this.ultimoY ? dy * 3 : 0);
    if (salto !== 0) menu.seleccion = (((menu.seleccion + salto) % n) + n) % n;
    this.ultimoX = dx;
    this.ultimoY = dy;
    this.v.apuntado = this.modo === 'objetivo' ? (this.vivos()[menu.seleccion] ?? null) : null;
    if (a.confirmar) this.elegir(menu.seleccion);
  }

  private elegir(i: number): void {
    const h = this.combate.heroina;
    if (this.modo === 'objetivo') {
      const objetivo = this.vivos()[i];
      if (objetivo && this.pendiente) this.usar(this.pendiente(objetivo));
      else this.abrir('principal'); // «Volver»
      return;
    }
    if (this.modo === 'objetos') {
      const clave = this.consumibles()[i];
      if (!clave)
        this.abrir('principal'); // «Volver»
      else if (this.cuantos(clave) === 0) this.registrar('No te queda ninguno');
      else this.usar({ tipo: 'objeto', clave });
      return;
    }
    if (this.modo === 'habilidades') {
      const hab = habilidadesDisponibles(h)[i];
      if (!hab) {
        this.abrir('principal'); // «Volver»
      } else if (hab.pm > h.pm) {
        this.registrar(`No quedan PM para ${hab.nombre}`);
      } else if (hab.objetivo === 'uno') {
        this.apuntar((o) => ({ tipo: 'habilidad', habilidad: hab, objetivo: o }));
      } else {
        this.usar({ tipo: 'habilidad', habilidad: hab, objetivo: null });
      }
      return;
    }
    this.seleccionPrincipal = i;
    const opcion = PRINCIPAL[i];
    if (opcion === 'Atacar') this.apuntar((o) => ({ tipo: 'atacar', objetivo: o }));
    else if (opcion === 'Habilidad' && habilidadesDisponibles(h).length > 0)
      this.abrir('habilidades');
    else if (opcion === 'Objeto') this.abrir('objetos');
    else if (opcion === 'Defender') this.usar({ tipo: 'defender' });
    else if (opcion === 'Huir') {
      if (puedeHuir(this.combate)) this.usar({ tipo: 'huir' });
      else this.registrar('¡De este combate no se puede huir!');
    }
  }

  /** Claves de los consumibles que existen, en el orden de objetos.json. */
  private consumibles(): string[] {
    return Object.keys(this.combate.objetos.consumibles);
  }

  private cuantos(clave: string): number {
    return this.combate.inventario.consumibles[clave] ?? 0;
  }

  /** Con un solo enemigo vivo la acción va directa; con varios, se elige a quién. */
  private apuntar(accion: (objetivo: Luchador) => AccionHeroina): void {
    const vivos = this.vivos();
    if (vivos.length === 1) {
      this.usar(accion(vivos[0]!));
    } else if (vivos.length > 1) {
      this.pendiente = accion;
      this.abrir('objetivo');
    }
  }

  private usar(accion: AccionHeroina): void {
    this.v.menu = null;
    this.v.apuntado = null;
    this.modo = 'principal';
    this.pendiente = null;
    this.cola.push(...actuar(this.combate, accion));
  }
}
