import type { Acciones } from '../core/acciones';
import { habilidadesDisponibles, type Luchador } from '../core/combate';
import { aplicarConsumible, gastar, haceAlgo, type Inventario } from '../core/inventario';
import { describirConsumible, partirEnLineas } from '../core/descripciones';
import { describirEfecto } from '../core/equipo';
import { experienciaParaSubir } from '../core/progresion';
import type { EquipoJson, EstadoJson, ObjetosJson, ReglasProgresion } from '../core/types';
import { opcionTocada, type MenuVista } from '../render/combate';
import { TEXTO_CONTROLES } from '../render/controles';
import {
  dibujarInventario,
  NOMBRE_PAGINA,
  PAGINAS,
  PESTANAS_INVENTARIO,
  type FichaInventario,
  type PaginaInventario,
  type VistaInventario,
} from '../render/pausa';
import { dentro } from '../render/pantalla';
import type { Sprite } from '../render/recursos';
import type { Casilla, Deslizador } from '../render/deslizador';
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

/** Letras que caben en una línea del panel de Objetos (a todo lo ancho). */
const LARGO_DESCRIPCION = 58;

/**
 * Inventario (botón de la mochila, Escape o I en el mapa): pausa el juego. Tres pestañas: la heroína
 * (estadísticas, equipo y puntos de mejora), los objetos (y usar pociones y éteres) y los ajustes
 * (sonido, música, efectos y la lista de controles).
 */
export class EscenaPausa implements Escena {
  /** Consumibles que sirven fuera de combate (los que restauran PV o PM). */
  private readonly usables: string[];
  private readonly menu: MenuVista = { opciones: [], seleccion: 0 };
  /** Lo que hace cada botón del menú de la página que se ve, en su orden. */
  private acciones: (() => void)[] = [];
  private ficha!: FichaInventario;
  private readonly vista: VistaInventario;
  private pagina: PaginaInventario = 'heroina';
  /** Las flechas en las pestañas de arriba en vez de en el menú de abajo. */
  private enPestanas = false;
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
    /** Sonido sí o no y volumen de música y efectos: controles HTML sobre el canvas en la pestaña Ajustes. */
    private readonly controles: { sonido: Casilla; musica: Deslizador; efectos: Deslizador },
    /** Abre la pantalla de Equipo para cambiar arma y armadura. */
    private readonly alEquipo: () => void,
    /** Abre la pantalla de puntos de mejora. */
    private readonly alMejorar: () => void,
    private readonly alSeguir: () => void,
    private readonly alSalir: () => void,
  ) {
    this.usables = Object.entries(objetos.consumibles)
      .filter(([, o]) => o.pv || o.pm)
      .map(([clave]) => clave);
    this.rehacer();
    this.vista = {
      pagina: this.pagina,
      focoPestanas: false,
      sprite,
      tiempo: 0,
      ficha: this.ficha,
      menu: this.menu,
    };
    // Con el foco en un control HTML, ↑ y ↓ van de uno a otro; ↑ desde Sonido sube a las pestañas
    // y ↓ desde Efectos baja al menú.
    const { sonido, musica, efectos } = controles;
    sonido.enlazar(
      () => (this.enPestanas = true),
      () => musica.enfocar(),
    );
    musica.enlazar(
      () => sonido.enfocar(),
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
    if (a.cancelar || a.menu || a.info) {
      this.alSeguir();
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
    if (this.enPestanas) {
      if (nuevoX) {
        const n = PAGINAS.length;
        this.verPagina(PAGINAS[(PAGINAS.indexOf(this.pagina) + dx + n) % n]!);
      } else if (nuevoY && dy > 0) {
        // En Ajustes se baja a los controles HTML; en las demás, al menú.
        this.enPestanas = false;
        if (this.pagina === 'ajustes') this.controles.sonido.enfocar();
        else this.anunciarOpcion();
      }
      return;
    }
    const n = this.menu.opciones.length;
    if (nuevoX) {
      this.menu.seleccion = (this.menu.seleccion + dx + n) % n;
      sonar('cursor');
      this.anunciarOpcion();
    } else if (nuevoY && dy < 0) {
      // ↑ desde el menú: a Efectos en Ajustes (lo que hay justo encima), si no a las pestañas.
      if (this.pagina === 'ajustes') this.controles.efectos.enfocar();
      else {
        this.enPestanas = true;
        anunciar(`Pestaña ${NOMBRE_PAGINA[this.pagina]}`);
      }
    }
    if (a.confirmar) this.elegir(this.menu.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Con el foco arriba (pestañas o un control HTML), ningún botón de abajo se ve elegido.
    const seleccion = this.menu.seleccion;
    const c = this.controles;
    const arriba =
      this.enPestanas || c.sonido.enfocado() || c.musica.enfocado() || c.efectos.enfocado();
    if (arriba) this.menu.seleccion = -1;
    const v = this.vista;
    v.pagina = this.pagina;
    v.focoPestanas = this.enPestanas;
    v.tiempo = this.tiempo;
    v.ficha = this.ficha;
    dibujarInventario(ctx, v);
    this.menu.seleccion = seleccion;
  }

  /** Vuelve a leer a la heroína (al volver de la pantalla de Equipo o de la de puntos). */
  refrescar(): void {
    this.tapado = false;
    this.mostrarControles();
    this.rehacer();
  }

  private tocar(x: number, y: number): void {
    const pestana = PESTANAS_INVENTARIO.findIndex((r) => dentro(x, y, r));
    if (pestana >= 0) {
      this.verPagina(PAGINAS[pestana]!);
      return;
    }
    const i = opcionTocada(x, y, this.menu.opciones.length);
    if (i >= 0) {
      this.enPestanas = false;
      this.menu.seleccion = i;
      this.elegir(i);
    }
  }

  private verPagina(p: PaginaInventario): void {
    if (p === this.pagina) return;
    this.pagina = p;
    this.menu.seleccion = 0;
    sonar('confirmar');
    this.rehacer();
    this.mostrarControles();
    this.anunciarPagina();
  }

  private elegir(i: number): void {
    sonar('confirmar');
    this.acciones[i]?.();
  }

  private anunciarOpcion(): void {
    const o = this.menu.opciones[this.menu.seleccion];
    if (o) anunciar(`${o.texto} ${o.detalle}`);
  }

  /** Lo que se ve en la pestaña, para el lector de pantalla. */
  private anunciarPagina(): void {
    const f = this.ficha;
    const contenido =
      this.pagina === 'heroina'
        ? [
            f.cabecera,
            `PV ${f.textoPv}`,
            `PM ${f.textoPm}`,
            `PX ${f.textoPx}`,
            ...f.habilidades,
            ...f.derecha,
          ]
        : this.pagina === 'objetos'
          ? f.objetos.map((o) => `${o.titulo}: ${o.lineas.join(' ')}`)
          : ['Sonido, música y efectos', `Controles. ${TEXTO_CONTROLES}`];
    anunciar([`Inventario, pestaña ${NOMBRE_PAGINA[this.pagina]}`, ...contenido].join('. '));
  }

  /** Los controles HTML solo se ven en Ajustes y si no hay otra pantalla encima. */
  private mostrarControles(): void {
    if (this.pagina !== 'ajustes' || this.tapado) {
      this.ocultarControles();
      return;
    }
    this.controles.sonido.mostrar(!estaSilenciado(), (si) => silenciar(!si));
    this.controles.musica.mostrar(leerVolumenMusica(), ponerVolumenMusica);
    this.controles.efectos.mostrar(leerVolumenEfectos(), ponerVolumenEfectos);
  }

  private ocultarControles(): void {
    this.controles.sonido.ocultar();
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
  }

  private usar(clave: string): void {
    const obj = this.objetos.consumibles[clave];
    if (obj && (this.inv.consumibles[clave] ?? 0) > 0 && haceAlgo(this.l, obj)) {
      aplicarConsumible(this.l, obj);
      gastar(this.inv, clave);
    }
    this.rehacer();
  }

  /** Rehace la ficha y el menú de la página (al abrir, al cambiar de pestaña y después de usar algo). */
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
      const bono = piezas.reduce((suma, p) => suma + (p?.bonos[clave] ?? 0), 0);
      return `${etiqueta} ${l[clave]}${bono ? ` (+${bono})` : ''}`;
    };
    const pieza = (etiqueta: string, p: EquipoJson | undefined): string[] => [
      `${etiqueta}: ${p?.nombre ?? 'Nada'}`,
      ...(p?.efecto ? [describirEfecto(p.efecto, this.estados)] : []),
    ];
    const siguiente = experienciaParaSubir(l.nivel, this.progresion);
    // En el nivel máximo la barra de PX se ve llena y sin cuenta.
    const maximo = l.nivel >= this.progresion.nivelMaximo;
    this.ficha = {
      cabecera: `${l.nombre} · Nivel ${l.nivel}`,
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
      derecha: [
        'Estadísticas:',
        conBono('Ataque', 'ataque'),
        conBono('Magia', 'magia'),
        conBono('Defensa', 'defensa'),
        conBono('Velocidad', 'velocidad'),
        'Equipo:',
        ...pieza('Arma', piezas[0]),
        ...pieza('Armadura', piezas[1]),
        ...(inv.mochila.length > 0 ? [`En la mochila: ${inv.mochila.length}`] : []),
      ],
      objetos: Object.entries(objetos.consumibles).map(([clave, o]) => ({
        titulo: `${o.nombre} x${inv.consumibles[clave] ?? 0}`,
        lineas: partirEnLineas(describirConsumible(o, this.estados), LARGO_DESCRIPCION),
      })),
    };

    // Seguir el primero y Salir el último en todas las páginas; en medio, lo de cada una.
    const opciones: MenuVista['opciones'] = [{ texto: 'Seguir', detalle: '', disponible: true }];
    const acciones: (() => void)[] = [this.alSeguir];
    if (this.pagina === 'heroina') {
      opciones.push(
        { texto: 'Equipo', detalle: '', disponible: true },
        {
          texto: 'Mejorar',
          detalle: l.puntos > 0 ? `${l.puntos} libres` : '',
          disponible: l.puntos > 0,
        },
      );
      acciones.push(
        () => this.abrirEncima(this.alEquipo),
        () => (l.puntos > 0 ? this.abrirEncima(this.alMejorar) : undefined),
      );
    } else if (this.pagina === 'objetos') {
      for (const clave of this.usables) {
        const cuantos = inv.consumibles[clave] ?? 0;
        opciones.push({
          texto: objetos.consumibles[clave]!.nombre,
          detalle: `x${cuantos}`,
          disponible: cuantos > 0 && haceAlgo(l, objetos.consumibles[clave]!),
        });
        acciones.push(() => this.usar(clave));
      }
    }
    opciones.push({
      texto: 'Salir',
      detalle: this.salirPulsado ? '¿Seguro?' : '',
      disponible: true,
    });
    acciones.push(() => this.salir());
    this.menu.opciones = opciones;
    this.acciones = acciones;
    if (this.menu.seleccion >= opciones.length) this.menu.seleccion = 0;
  }
}
