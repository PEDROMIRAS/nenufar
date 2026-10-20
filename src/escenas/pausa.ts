import type { Acciones } from '../core/acciones';
import { habilidadesDisponibles, type Luchador } from '../core/combate';
import { aplicarConsumible, type Inventario } from '../core/inventario';
import { describirPieza } from '../core/equipo';
import { experienciaParaSubir } from '../core/progresion';
import type { EquipoJson, EstadoJson, ObjetosJson, ReglasProgresion } from '../core/types';
import { rectOpcion, type MenuVista } from '../render/combate';
import { dibujarInventario, type FichaInventario } from '../render/pausa';
import type { Sprite } from '../render/recursos';
import { estaSilenciado, silenciar, sonar } from '../render/sonido';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/**
 * Inventario (botón de la mochila o Escape en el mapa): pausa el juego y enseña la heroína, sus
 * estadísticas, equipo y objetos; se pueden usar pociones y éteres, quitar el sonido o salir.
 */
export class EscenaPausa implements Escena {
  /** Consumibles que sirven fuera de combate (los que restauran PV o PM). */
  private readonly usables: string[];
  private readonly menu: MenuVista = { opciones: [], seleccion: 0 };
  private ficha!: FichaInventario;
  private tiempo = 0;
  private ultimoX = 0;
  /** Salir pide una segunda pulsación para no perder la partida por un toque sin querer. */
  private salirPulsado = false;

  constructor(
    private readonly l: Luchador,
    private readonly sprite: Sprite,
    private readonly inv: Inventario,
    private readonly objetos: ObjetosJson,
    private readonly progresion: ReglasProgresion,
    private readonly estados: Record<string, EstadoJson>,
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
  }
  exit(): void {}

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (a.cancelar || a.menu) {
      this.alSeguir();
      return;
    }
    const n = this.menu.opciones.length;
    if (a.toqueX >= 0) {
      for (let i = 0; i < n; i++) {
        const r = rectOpcion(i, n);
        if (
          a.toqueX >= r.x &&
          a.toqueX < r.x + r.ancho &&
          a.toqueY >= r.y &&
          a.toqueY < r.y + r.alto
        ) {
          this.menu.seleccion = i;
          this.elegir(i);
          return;
        }
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
    } else if (i === n - 1) {
      if (this.salirPulsado) this.alSalir();
      this.salirPulsado = true;
    } else if (i === n - 2) {
      silenciar(!estaSilenciado());
    } else {
      const clave = this.usables[i - 1]!;
      const obj = this.objetos.consumibles[clave];
      if (obj && (this.inv.consumibles[clave] ?? 0) > 0) {
        aplicarConsumible(this.l, obj);
        this.inv.consumibles[clave]! -= 1;
      }
    }
    this.rehacer();
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
      // El efecto especial (veneno al golpear…) es la última línea de su descripción.
      ...(p?.efecto ? describirPieza(p, this.estados).slice(-1) : []),
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
        'Objetos:',
        ...Object.entries(objetos.consumibles).map(
          ([clave, o]) => `${o.nombre} x${inv.consumibles[clave] ?? 0}`,
        ),
      ],
    };
    this.menu.opciones = [
      { texto: 'Seguir', detalle: '', disponible: true },
      ...this.usables.map((clave) => {
        const cuantos = inv.consumibles[clave] ?? 0;
        return {
          texto: objetos.consumibles[clave]!.nombre,
          detalle: `x${cuantos}`,
          disponible: cuantos > 0,
        };
      }),
      { texto: 'Sonido', detalle: estaSilenciado() ? 'No' : 'Sí', disponible: true },
      { texto: 'Salir', detalle: this.salirPulsado ? '¿Seguro?' : '', disponible: true },
    ];
  }
}
