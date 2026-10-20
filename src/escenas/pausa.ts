import type { Acciones } from '../core/acciones';
import { habilidadesDisponibles, type Luchador } from '../core/combate';
import { aplicarConsumible, type Inventario } from '../core/inventario';
import { experienciaParaSubir } from '../core/progresion';
import type { ObjetosJson, ReglasProgresion } from '../core/types';
import { rectOpcion, type MenuVista } from '../render/combate';
import { dibujarPausa } from '../render/pausa';
import { estaSilenciado, silenciar, sonar } from '../render/sonido';
import { anunciar } from '../render/accesibilidad';
import type { Escena } from './escena';

/** Pausa en el mapa: estadísticas, equipo e inventario; se pueden usar pociones y éteres y quitar el sonido. */
export class EscenaPausa implements Escena {
  /** Consumibles que sirven fuera de combate (los que restauran PV o PM). */
  private readonly usables: string[];
  private readonly menu: MenuVista = { opciones: [], seleccion: 0 };
  private izquierda: string[] = [];
  private derecha: string[] = [];
  private ultimoX = 0;
  /** Salir pide una segunda pulsación para no perder la partida por un toque sin querer. */
  private salirPulsado = false;

  constructor(
    private readonly l: Luchador,
    private readonly inv: Inventario,
    private readonly objetos: ObjetosJson,
    private readonly progresion: ReglasProgresion,
    private readonly alSeguir: () => void,
    private readonly alSalir: () => void,
  ) {
    this.usables = Object.entries(objetos.consumibles)
      .filter(([, o]) => o.pv || o.pm)
      .map(([clave]) => clave);
    this.rehacer();
  }

  enter(): void {
    anunciar(['Pausa', ...this.izquierda, ...this.derecha].join('. '));
  }
  exit(): void {}

  update(_dt: number, a: Acciones): void {
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
    dibujarPausa(ctx, this.izquierda, this.derecha, this.menu);
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

  /** Rehace textos y menú (al abrir y después de usar algo). */
  private rehacer(): void {
    const { l, inv, objetos } = this;
    const nombre = (clave: string | null): string =>
      (clave && objetos.equipo[clave]?.nombre) || 'Nada';
    this.izquierda = [
      `${l.nombre}:`,
      `Nivel ${l.nivel}`,
      `PX ${l.experiencia}/${experienciaParaSubir(l.nivel, this.progresion)}`,
      `PV ${l.pv}/${l.pvMax}`,
      `PM ${l.pm}/${l.pmMax}`,
      `Ataque ${l.ataque} · Magia ${l.magia}`,
      `Defensa ${l.defensa} · Velocidad ${l.velocidad}`,
      'Habilidades:',
      ...habilidadesDisponibles(l).map((h) => h.nombre),
    ];
    this.derecha = [
      'Equipo:',
      `Arma: ${nombre(inv.arma)}`,
      `Armadura: ${nombre(inv.armadura)}`,
      'Inventario:',
      ...Object.entries(objetos.consumibles).map(
        ([clave, o]) => `${o.nombre} x${inv.consumibles[clave] ?? 0}`,
      ),
    ];
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
