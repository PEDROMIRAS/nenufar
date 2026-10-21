import type { Acciones } from '../core/acciones';
import { habilidadesDisponibles, type Luchador } from '../core/combate';
import { aplicarConsumible, gastar, type Inventario } from '../core/inventario';
import { describirEfecto } from '../core/equipo';
import { experienciaParaSubir } from '../core/progresion';
import type { EquipoJson, EstadoJson, ObjetosJson, ReglasProgresion } from '../core/types';
import { opcionTocada, type MenuVista } from '../render/combate';
import { dibujarInventario, type FichaInventario } from '../render/pausa';
import type { Sprite } from '../render/recursos';
import type { Casilla, Deslizador } from '../render/deslizador';
import {
  estaSilenciado,
  leerVolumenMusica,
  ponerVolumenMusica,
  silenciar,
  sonar,
} from '../render/sonido';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/**
 * Inventario (botón de la mochila o Escape en el mapa): pausa el juego y enseña la heroína, sus
 * estadísticas, equipo y objetos; se pueden usar pociones y éteres, repartir los puntos de mejora,
 * quitar el sonido, bajar la música o salir.
 */
export class EscenaPausa implements Escena {
  /** Consumibles que sirven fuera de combate (los que restauran PV o PM). */
  private readonly usables: string[];
  private readonly menu: MenuVista = { opciones: [], seleccion: 0 };
  private ficha!: FichaInventario;
  private tiempo = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  /** Salir pide una segunda pulsación para no perder la partida por un toque sin querer. */
  private salirPulsado = false;

  constructor(
    private readonly l: Luchador,
    private readonly sprite: Sprite,
    private readonly inv: Inventario,
    private readonly objetos: ObjetosJson,
    private readonly progresion: ReglasProgresion,
    private readonly estados: Record<string, EstadoJson>,
    /** Volumen de la música y sonido sí o no: controles HTML sobre el canvas mientras se ve el inventario. */
    private readonly controles: { musica: Deslizador; sonido: Casilla },
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
  }

  enter(): void {
    const f = this.ficha;
    anunciar(
      [
        'Inventario',
        f.cabecera,
        `PV ${f.textoPv}`,
        `PM ${f.textoPm}`,
        `PX ${f.textoPx}`,
        ...f.habilidades,
        ...f.derecha,
      ].join('. '),
    );
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
    const n = this.menu.opciones.length;
    if (a.toqueX >= 0) {
      const i = opcionTocada(a.toqueX, a.toqueY, n);
      if (i >= 0) {
        this.menu.seleccion = i;
        this.elegir(i);
      }
      return;
    }
    const dir = Math.sign(a.moverX);
    if (dir !== 0 && dir !== this.ultimoX) {
      this.menu.seleccion = (this.menu.seleccion + dir + n) % n;
      sonar('cursor');
      const o = this.menu.opciones[this.menu.seleccion];
      if (o) anunciar(`${o.texto} ${o.detalle}`);
    }
    this.ultimoX = dir;
    // ↑ sube a los controles HTML de arriba (sonido, y con → la música); ↓ o Tab desde ellos vuelve aquí.
    const dy = Math.sign(a.moverY);
    if (dy < 0 && dy !== this.ultimoY) this.controles.sonido.enfocar();
    this.ultimoY = dy;
    if (a.confirmar) this.elegir(this.menu.seleccion);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    dibujarInventario(ctx, this.sprite, this.tiempo, this.ficha, this.menu);
  }

  private elegir(i: number): void {
    const n = this.menu.opciones.length;
    sonar('confirmar');
    if (i === 0) {
      this.alSeguir();
    } else if (i === 1 || (i === 2 && this.l.puntos > 0)) {
      // Equipo y Mejorar se apilan encima sin cerrar esta: los controles HTML no deben quedarse a la vista.
      this.ocultarControles();
      if (i === 1) this.alEquipo();
      else this.alMejorar();
      return;
    } else if (i === n - 1) {
      if (this.salirPulsado) this.alSalir();
      this.salirPulsado = true;
    } else if (i > 2) {
      const clave = this.usables[i - 3]!;
      const obj = this.objetos.consumibles[clave];
      if (obj && (this.inv.consumibles[clave] ?? 0) > 0) {
        aplicarConsumible(this.l, obj);
        gastar(this.inv, clave);
      }
    }
    this.rehacer();
  }

  /** Vuelve a leer a la heroína (al volver de la pantalla de Equipo o de la de puntos). */
  refrescar(): void {
    this.mostrarControles();
    this.rehacer();
  }

  private mostrarControles(): void {
    this.controles.musica.mostrar(leerVolumenMusica(), ponerVolumenMusica);
    this.controles.sonido.mostrar(!estaSilenciado(), (si) => silenciar(!si));
  }

  private ocultarControles(): void {
    this.controles.musica.ocultar();
    this.controles.sonido.ocultar();
  }

  /** Rehace la ficha y el menú (al abrir y después de usar algo). */

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
    this.ficha = {
      cabecera: `${l.nombre} · Nivel ${l.nivel}`,
      pv: l.pv,
      pvMax: l.pvMax,
      pm: l.pm,
      pmMax: l.pmMax,
      px: l.experiencia,
      pxSiguiente: siguiente,
      textoPv: `${l.pv}/${l.pvMax}`,
      textoPm: `${l.pm}/${l.pmMax}`,
      textoPx: `${l.experiencia}/${siguiente}`,
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
        'Objetos:',
        ...Object.entries(objetos.consumibles).map(
          ([clave, o]) => `${o.nombre} x${inv.consumibles[clave] ?? 0}`,
        ),
      ],
    };
    this.menu.opciones = [
      { texto: 'Seguir', detalle: '', disponible: true },
      { texto: 'Equipo', detalle: '', disponible: true },
      {
        texto: 'Mejorar',
        detalle: l.puntos > 0 ? `${l.puntos} libres` : '',
        disponible: l.puntos > 0,
      },
      ...this.usables.map((clave) => {
        const cuantos = inv.consumibles[clave] ?? 0;
        return {
          texto: objetos.consumibles[clave]!.nombre,
          detalle: `x${cuantos}`,
          disponible: cuantos > 0,
        };
      }),
      { texto: 'Salir', detalle: this.salirPulsado ? '¿Seguro?' : '', disponible: true },
    ];
  }
}
