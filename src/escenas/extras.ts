import type { Acciones } from '../core/acciones';
import { entradasBestiario, type Logro } from '../core/logros';
import type { Records } from '../core/records';
import { partirTexto } from '../core/texto';
import type { MonstruoJson } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import {
  CELDAS,
  PESTANAS,
  dibujarExtras,
  siluetaDe,
  type FichaMonstruo,
  type LogroVisto,
  type VistaExtras,
} from '../render/extras';
import { dentro, esTactil } from '../render/pantalla';
import type { Sprite } from '../render/recursos';
import { sonar } from '../render/sonido';
import type { Escena } from './escena';

const POR_FILA = 8;
const PISTA = esTactil()
  ? {
      bestiario: 'Toca un monstruo para ver su ficha',
      logros: 'Los conseguidos salen en dorado',
    }
  : {
      bestiario: 'Flechas elegir · ↑ pestañas · I volver',
      logros: '← → pestaña · I volver',
    };

/** Dónde están las flechas: las pestañas de arriba, la rejilla del bestiario o «Volver» abajo. */
type Foco = 'pestanas' | 'rejilla' | 'volver';

/** Bestiario (los monstruos vencidos, el resto en silueta) y logros, desde el título. */
/** Letras por línea de la ficha del monstruo: lo que cabe en su marco (fuente monoespaciada). */
const LETRAS_FICHA = 52;

export class EscenaExtras implements Escena {
  private pagina: 'bestiario' | 'logros' = 'bestiario';
  private foco: Foco = 'rejilla';
  private elegido = 0;
  private tiempo = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  private readonly fichas: FichaMonstruo[];
  private readonly logros: LogroVisto[];
  private readonly vistos: string;
  private readonly conseguidos: string;
  private readonly vista: VistaExtras;
  private readonly menu: MenuVista = {
    opciones: [{ texto: 'Volver', detalle: '', disponible: true }],
    seleccion: -1,
  };

  constructor(
    records: Records,
    monstruos: Readonly<Record<string, MonstruoJson>>,
    hojas: ReadonlyMap<string, Sprite>,
    logros: readonly Logro[],
    private readonly alVolver: () => void,
  ) {
    // Los ocultos no salen ni como «???» hasta vencerlos: el bestiario no los delata.
    this.fichas = entradasBestiario(monstruos, records.bestiario).flatMap(({ clave, visto }) => {
      const m = monstruos[clave]!;
      const sprite = hojas.get(m.sprite);
      if (!sprite) return [];
      const e = m.estadisticas;
      const habilidades = m.habilidades?.map((h) => h.nombre).join(', ') || 'ninguna';
      return [
        {
          sprite,
          silueta: siluetaDe(sprite),
          visto,
          nombre: visto ? `${m.nombre}${m.jefe ? ' (jefe)' : ''}` : '???',
          lineas: visto
            ? [
                `PV ${e.pv} · Ataque ${e.ataque} · Magia ${e.magia}`,
                `Defensa ${e.defensa} · Velocidad ${e.velocidad}`,
                ...partirTexto(`Habilidades: ${habilidades}`, LETRAS_FICHA),
              ]
            : ['Aún no lo has vencido'],
        },
      ];
    });
    this.logros = logros.map((l) => ({
      nombre: l.nombre,
      descripcion: l.descripcion,
      conseguido: records.logros.includes(l.clave),
    }));
    this.vistos = `Vencidos ${this.fichas.filter((f) => f.visto).length} de ${this.fichas.length}`;
    this.conseguidos = `Conseguidos ${this.logros.filter((l) => l.conseguido).length} de ${this.logros.length}`;
    this.vista = {
      pagina: this.pagina,
      focoPestanas: false,
      subtitulo: this.vistos,
      pista: PISTA.bestiario,
      fichas: this.fichas,
      elegido: 0,
      logros: this.logros,
      menu: this.menu,
      tiempo: 0,
    };
  }

  enter(): void {
    anunciar(`Bestiario. ${this.vistos}. ${PISTA.bestiario}`);
  }
  exit(): void {}

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (a.cancelar || a.menu || a.info) {
      this.alVolver();
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
    const bestiario = this.pagina === 'bestiario';
    // De arriba abajo: pestañas, rejilla (solo en el bestiario) y Volver.
    if (this.foco === 'pestanas') {
      if (nuevoX) this.verPagina(bestiario ? 'logros' : 'bestiario');
      else if (nuevoY && dy > 0) this.enfocar(bestiario ? 'rejilla' : 'volver');
    } else if (this.foco === 'volver') {
      if (a.confirmar) this.alVolver();
      else if (nuevoY && dy < 0) this.enfocar(bestiario ? 'rejilla' : 'pestanas');
    } else if (nuevoX) {
      this.elegir(this.elegido + dx);
    } else if (nuevoY) {
      const destino = this.elegido + dy * POR_FILA;
      if (destino < 0) this.enfocar('pestanas');
      else if (destino >= this.fichas.length) this.enfocar('volver');
      else this.elegir(destino);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // La misma vista en cada fotograma, puesta al día (crear una nueva sería memoria en el bucle).
    const v = this.vista;
    v.pagina = this.pagina;
    v.focoPestanas = this.foco === 'pestanas';
    v.subtitulo = this.pagina === 'bestiario' ? this.vistos : this.conseguidos;
    v.pista = PISTA[this.pagina];
    v.elegido = this.elegido;
    v.tiempo = this.tiempo;
    dibujarExtras(ctx, v);
  }

  private tocar(x: number, y: number): void {
    const pestana = PESTANAS.findIndex((r) => dentro(x, y, r));
    if (pestana >= 0) this.verPagina(pestana === 0 ? 'bestiario' : 'logros');
    else if (opcionTocada(x, y, this.menu.opciones.length) === 0) this.alVolver();
    else if (this.pagina === 'bestiario') {
      const i = CELDAS.findIndex((c) => dentro(x, y, c));
      if (i >= 0 && i < this.fichas.length) {
        this.foco = 'rejilla';
        this.menu.seleccion = -1;
        this.elegir(i);
      }
    }
  }

  private enfocar(foco: Foco): void {
    this.foco = foco;
    this.menu.seleccion = foco === 'volver' ? 0 : -1;
    sonar('cursor');
    if (foco === 'volver') anunciar('Volver');
    else if (foco === 'pestanas')
      anunciar(`Pestaña ${this.pagina === 'bestiario' ? 'Bestiario' : 'Logros'}`);
    else this.elegir(this.elegido);
  }

  private elegir(i: number): void {
    if (i < 0 || i >= this.fichas.length) return;
    this.elegido = i;
    sonar('cursor');
    const f = this.fichas[i]!;
    anunciar([f.nombre, ...f.lineas].join('. '));
  }

  private verPagina(p: 'bestiario' | 'logros'): void {
    if (p === this.pagina) return;
    this.pagina = p;
    // Al cambiar con las flechas, se sigue en las pestañas; al tocar, también (es donde se tocó).
    this.foco = 'pestanas';
    this.menu.seleccion = -1;
    sonar('confirmar');
    anunciar(
      p === 'bestiario'
        ? `Bestiario. ${this.vistos}`
        : [
            `Logros. ${this.conseguidos}`,
            ...this.logros.map(
              (l) => `${l.nombre}: ${l.descripcion}${l.conseguido ? ', conseguido' : ''}`,
            ),
          ].join('. '),
    );
  }
}
