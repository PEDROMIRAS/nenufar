import type { Acciones } from '../core/acciones';
import { habilidadesDisponibles, type Luchador } from '../core/combate';
import { aplicarConsumible, gastar, haceAlgo, type Inventario } from '../core/inventario';
import { describirConsumible, partirEnLineas } from '../core/descripciones';
import { bonoDe, describirEfecto } from '../core/equipo';
import { efectoToque, filaTocada } from '../core/menu';
import { experienciaParaSubir } from '../core/progresion';
import type { EquipoJson, EstadoJson, ObjetosJson, ReglasProgresion } from '../core/types';
import { TEXTO_CONTROLES } from '../render/controles';
import {
  dibujarInventario,
  FILA_INVENTARIO,
  LETRAS_COLUMNA,
  LETRAS_PANEL,
  NOMBRE_SECCION,
  OBJETOS_INVENTARIO,
  SECCIONES,
  seccionTocada,
  type FichaInventario,
  type PaginaInventario,
  type VistaInventario,
} from '../render/pausa';
import type { Sprite } from '../render/recursos';
import type { Casilla, Deslizador } from '../render/deslizador';
import { esCalidadAlta, ponerCalidadAlta } from '../render/mundo/mundo';
import {
  estaSilenciado,
  leerVolumenEfectos,
  leerVolumenMusica,
  ponerVolumenEfectos,
  ponerVolumenMusica,
  silenciar,
  sonar,
} from '../render/sonido';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/**
 * Inventario (botón de la mochila, Escape o I en el mapa): pausa el juego. A la izquierda la lista
 * (Heroína, Objetos, Equipo, Mejorar, Ajustes; Seguir y Salir abajo) y a la derecha la sección
 * elegida: la heroína, los objetos (usar pociones y éteres) o los ajustes (sonido, calidad, volumen
 * y la lista de controles). Equipo y Mejorar abren sus pantallas encima.
 */
export class EscenaPausa implements Escena {
  private ficha!: FichaInventario;
  private readonly vista: VistaInventario;
  private pagina: PaginaInventario = 'heroina';
  /** Fila de la lista con el cursor (posición en `SECCIONES`). */
  private elegida = 0;
  /** El foco dentro de la sección Objetos (arriba y abajo eligen consumible). */
  private enObjetos = false;
  private objeto = 0;
  private tiempo = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  /** Salir pide una segunda pulsación para no perder la partida por un toque sin querer. */
  private salirPulsado = false;
  /** Equipo o Mejorar está encima: los controles HTML no se ven aunque se esté en Ajustes. */
  private tapado = false;

  constructor(
    private readonly l: Luchador,
    sprite: Sprite,
    private readonly inv: Inventario,
    private readonly objetos: ObjetosJson,
    private readonly progresion: ReglasProgresion,
    private readonly estados: Record<string, EstadoJson>,
    /** Sonido sí o no, calidad alta o baja y volumen de música y efectos: controles HTML sobre el canvas en Ajustes. */
    private readonly controles: {
      sonido: Casilla;
      calidad: Casilla;
      musica: Deslizador;
      efectos: Deslizador;
    },
    /** Abre la pantalla de Equipo para cambiar arma y armadura. */
    private readonly alEquipo: () => void,
    /** Abre la pantalla de puntos de mejora. */
    private readonly alMejorar: () => void,
    private readonly alSeguir: () => void,
    private readonly alSalir: () => void,
  ) {
    this.rehacer();
    this.vista = {
      pagina: this.pagina,
      elegida: 0,
      enObjetos: false,
      objeto: 0,
      sprite,
      tiempo: 0,
      ficha: this.ficha,
    };
    // Con el foco en un control HTML, ↑ y ↓ van de uno a otro (Sonido, Calidad, Música, Efectos); ↑ desde
    // Sonido y ↓ desde Efectos devuelven las teclas a la lista.
    const { sonido, calidad, musica, efectos } = controles;
    sonido.enlazar(
      () => this.anunciarFila(),
      () => calidad.enfocar(),
    );
    calidad.enlazar(
      () => sonido.enfocar(),
      () => musica.enfocar(),
    );
    musica.enlazar(
      () => calidad.enfocar(),
      () => efectos.enfocar(),
    );
    efectos.enlazar(() => musica.enfocar(), null);
  }

  enter(): void {
    this.anunciarPagina();
    this.mostrarControles();
  }

  exit(): void {
    this.ocultarControles();
  }

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (a.info) {
      this.alSeguir();
      return;
    }
    // Escape llega como cancelar y como menú a la vez.
    if (a.cancelar || a.menu) {
      // Escape dentro de una sección vuelve a la lista; en la lista, sigue jugando.
      if (this.enObjetos) this.volverALista();
      else if (this.controlEnfocado()) {
        this.soltarControles();
        this.volverALista();
      } else this.alSeguir();
      return;
    }
    if (a.toqueX >= 0) {
      this.tocar(a.toqueX, a.toqueY);
      return;
    }
    const dx = Math.sign(a.moverX);
    const dy = Math.sign(a.moverY);
    const nuevoX = dx !== 0 && dx !== this.ultimoX;
    const nuevoY = dy !== 0 && dy !== this.ultimoY;
    this.ultimoX = dx;
    this.ultimoY = dy;
    if (this.enObjetos) {
      const n = this.ficha.objetos.length;
      if (nuevoY) {
        this.objeto = (this.objeto + dy + n) % n;
        sonar('cursor');
        this.anunciarObjeto();
      } else if (nuevoX && dx < 0) this.volverALista();
      else if (a.confirmar) this.usar(this.objeto);
      return;
    }
    if (nuevoY) {
      const n = SECCIONES.length;
      this.elegirFila((this.elegida + dy + n) % n);
    } else if ((nuevoX && dx > 0) || a.confirmar) {
      this.activar(this.elegida);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const v = this.vista;
    v.pagina = this.pagina;
    v.elegida = this.controlEnfocado() ? -1 : this.elegida;
    v.enObjetos = this.enObjetos;
    v.objeto = this.objeto;
    v.tiempo = this.tiempo;
    v.ficha = this.ficha;
    dibujarInventario(ctx, v);
  }

  /** Vuelve a leer a la heroína (al volver de la pantalla de Equipo o de la de puntos). */
  refrescar(): void {
    this.tapado = false;
    this.mostrarControles();
    this.rehacer();
  }

  private tocar(x: number, y: number): void {
    const i = seccionTocada(x, y);
    if (i >= 0) {
      this.enObjetos = false;
      this.soltarControles();
      this.elegirFila(i);
      // Heroína, Objetos y Ajustes ya se ven al elegirlas; lo demás (Equipo, Mejorar, Seguir, Salir) se hace.
      const s = SECCIONES[i]!;
      if (s !== 'heroina' && s !== 'objetos' && s !== 'ajustes') this.activar(i);
      return;
    }
    if (this.pagina !== 'objetos') return;
    const n = this.ficha.objetos.length;
    const o = filaTocada(x, y, OBJETOS_INVENTARIO, FILA_INVENTARIO, n);
    if (o < 0) return;
    // Usar un objeto pide dos toques, como en el combate: el primero solo lo elige y dice qué hace.
    const usar = this.enObjetos && efectoToque(this.objeto, o, true) === 'usar';
    this.enObjetos = true;
    this.objeto = o;
    if (usar) this.usar(o);
    else {
      sonar('cursor');
      this.anunciarObjeto();
    }
  }

  /** Mueve el cursor de la lista; Heroína, Objetos y Ajustes se ven a la derecha al momento. */
  private elegirFila(i: number): void {
    if (i !== this.elegida) sonar('cursor');
    this.elegida = i;
    const s = SECCIONES[i]!;
    if (s === 'heroina' || s === 'objetos' || s === 'ajustes') this.verPagina(s);
    else this.anunciarFila();
  }

  /** Enter (o →) o un toque en la fila `i`. */
  private activar(i: number): void {
    const s = SECCIONES[i]!;
    if (s === 'objetos' && this.ficha.objetos.length > 0) {
      sonar('confirmar');
      this.enObjetos = true;
      this.anunciarObjeto();
    } else if (s === 'ajustes') {
      if (!this.controlEnfocado()) this.controles.sonido.enfocar();
    } else if (s === 'equipo') {
      sonar('confirmar');
      this.abrirEncima(this.alEquipo);
    } else if (s === 'mejorar') {
      if (this.l.puntos > 0) {
        sonar('confirmar');
        this.abrirEncima(this.alMejorar);
      }
    } else if (s === 'seguir') this.alSeguir();
    else if (s === 'salir') {
      sonar('confirmar');
      this.salir();
    }
  }

  private verPagina(p: PaginaInventario): void {
    if (p === this.pagina) {
      this.anunciarFila();
      return;
    }
    this.pagina = p;
    this.objeto = 0;
    this.mostrarControles();
    this.anunciarPagina();
  }

  private volverALista(): void {
    this.enObjetos = false;
    this.anunciarFila();
  }

  private controlEnfocado(): boolean {
    const c = this.controles;
    return (
      c.sonido.enfocado() || c.calidad.enfocado() || c.musica.enfocado() || c.efectos.enfocado()
    );
  }

  private soltarControles(): void {
    const c = this.controles;
    c.sonido.soltar();
    c.calidad.soltar();
    c.musica.soltar();
    c.efectos.soltar();
  }

  private anunciarFila(): void {
    const s = SECCIONES[this.elegida]!;
    anunciar(`${NOMBRE_SECCION[s]} ${this.ficha.detalles[s]}`);
  }

  private anunciarObjeto(): void {
    const o = this.ficha.objetos[this.objeto];
    if (o) anunciar(`${o.nombre} ${o.cantidad}. ${o.lineas.join(' ')}`);
  }

  /** Lo que se ve en la sección, para el lector de pantalla. */
  private anunciarPagina(): void {
    const f = this.ficha;
    const contenido =
      this.pagina === 'heroina'
        ? [
            `${f.nombre}, ${f.nivel}`,
            `PV ${f.textoPv}`,
            `PM ${f.textoPm}`,
            `PX ${f.textoPx}`,
            'Habilidades',
            ...f.habilidades,
            'Estadísticas',
            ...f.estadisticas,
            'Equipo',
            ...f.equipo,
          ]
        : this.pagina === 'objetos'
          ? f.objetos.map((o) => `${o.nombre} ${o.cantidad}: ${o.lineas.join(' ')}`)
          : ['Sonido, calidad, música y efectos', `Controles. ${TEXTO_CONTROLES}`];
    anunciar([`Inventario, ${NOMBRE_SECCION[this.pagina]}`, ...contenido].join('. '));
  }

  /** Los controles HTML solo se ven en Ajustes y si no hay otra pantalla encima. */
  private mostrarControles(): void {
    if (this.pagina !== 'ajustes' || this.tapado) {
      this.ocultarControles();
      return;
    }
    this.controles.sonido.mostrar(!estaSilenciado(), (si) => silenciar(!si));
    this.controles.calidad.mostrar(esCalidadAlta(), ponerCalidadAlta);
    this.controles.musica.mostrar(leerVolumenMusica(), ponerVolumenMusica);
    this.controles.efectos.mostrar(leerVolumenEfectos(), ponerVolumenEfectos);
  }

  private ocultarControles(): void {
    this.controles.sonido.ocultar();
    this.controles.calidad.ocultar();
    this.controles.musica.ocultar();
    this.controles.efectos.ocultar();
  }

  /** Equipo y Mejorar se apilan encima sin cerrar esta: los controles HTML no deben quedarse a la vista. */
  private abrirEncima(abrir: () => void): void {
    this.tapado = true;
    this.ocultarControles();
    abrir();
  }

  private salir(): void {
    if (this.salirPulsado) this.alSalir();
    this.salirPulsado = true;
    this.rehacer();
    this.anunciarFila();
  }

  /** Usa el consumible `i` si se puede (si no, no pasa nada: se ve apagado). */
  private usar(i: number): void {
    const o = this.ficha.objetos[i];
    const clave = Object.keys(this.objetos.consumibles)[i];
    const obj = clave ? this.objetos.consumibles[clave] : undefined;
    if (!o?.disponible || !clave || !obj) return;
    sonar('confirmar');
    aplicarConsumible(this.l, obj);
    gastar(this.inv, clave);
    this.rehacer();
    this.anunciarObjeto();
  }

  /** Rehace la ficha (al abrir, al volver de otra pantalla y después de usar algo). */
  private rehacer(): void {
    const { l, inv, objetos } = this;
    const piezas = [inv.arma, inv.armadura].map((clave) =>
      clave ? objetos.equipo[clave] : undefined,
    );
    // Lo que suma el equipo a cada estadística, para enseñarlo aparte: «Ataque 12 (+3)».
    const conBono = (
      etiqueta: string,
      clave: 'ataque' | 'magia' | 'defensa' | 'velocidad',
    ): string => {
      const bono = piezas.reduce((suma, p) => suma + (p ? bonoDe(p, clave, l.nivel) : 0), 0);
      return `${etiqueta} ${l[clave]}${bono ? ` (+${bono})` : ''}`;
    };
    const columna = (texto: string): string[] => partirEnLineas(texto, LETRAS_COLUMNA);
    const pieza = (p: EquipoJson | undefined): string[] => [
      ...columna(p?.nombre ?? 'Nada'),
      ...(p?.efecto ? columna(describirEfecto(p.efecto, this.estados)) : []),
    ];
    const siguiente = experienciaParaSubir(l.nivel, this.progresion);
    // En el nivel máximo la barra de PX se ve llena y sin cuenta.
    const maximo = l.nivel >= this.progresion.nivelMaximo;
    this.ficha = {
      nombre: l.nombre,
      nivel: `Nivel ${l.nivel}`,
      pv: l.pv,
      pvMax: l.pvMax,
      pm: l.pm,
      pmMax: l.pmMax,
      px: maximo ? 1 : l.experiencia,
      pxSiguiente: maximo ? 1 : siguiente,
      textoPv: `${l.pv}/${l.pvMax}`,
      textoPm: `${l.pm}/${l.pmMax}`,
      textoPx: maximo ? 'Máx.' : `${l.experiencia}/${siguiente}`,
      habilidades: habilidadesDisponibles(l).map((h) => h.nombre),
      estadisticas: [
        conBono('Ataque', 'ataque'),
        conBono('Magia', 'magia'),
        conBono('Defensa', 'defensa'),
        conBono('Velocidad', 'velocidad'),
      ],
      equipo: [
        ...pieza(piezas[0]),
        ...pieza(piezas[1]),
        // El hueco del Corazón no existe hasta vencer al dragón negro; gastado, sigue como recuerdo.
        ...(inv.corazon === 'no'
          ? []
          : columna(`Corazón: ${inv.corazon === 'lleno' ? 'del dragón negro' : 'vacío'}`)),
        ...(inv.mochila.length > 0 ? [`Mochila: ${inv.mochila.length}`] : []),
      ],
      // Todos los consumibles; solo se pueden usar aquí los que restauran PV o PM y si hacen algo.
      objetos: Object.entries(objetos.consumibles).map(([clave, o]) => {
        const cuantos = inv.consumibles[clave] ?? 0;
        return {
          nombre: o.nombre,
          cantidad: `x${cuantos}`,
          disponible: Boolean(o.pv || o.pm) && cuantos > 0 && haceAlgo(l, o),
          lineas: partirEnLineas(describirConsumible(o, this.estados), LETRAS_PANEL),
        };
      }),
      detalles: {
        heroina: '',
        objetos: '',
        equipo: '',
        mejorar: l.puntos > 0 ? String(l.puntos) : '',
        ajustes: '',
        seguir: '',
        salir: this.salirPulsado ? '¿Seguro?' : '',
      },
      mejorar: l.puntos > 0,
    };
  }
}
