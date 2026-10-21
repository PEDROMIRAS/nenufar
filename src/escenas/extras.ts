import type { Acciones } from '../core/acciones';
import type { Logro } from '../core/logros';
import type { Records } from '../core/records';
import type { MonstruoJson } from '../core/types';
import { anunciar } from '../render/accesibilidad';
import { opcionTocada, type MenuVista } from '../render/combate';
import {
  CELDAS,
  dibujarExtras,
  siluetaDe,
  type FichaMonstruo,
  type LogroVisto,
} from '../render/extras';
import { dentro, esTactil } from '../render/pantalla';
import type { Sprite } from '../render/recursos';
import { sonar } from '../render/sonido';
import type { Escena } from './escena';

const POR_FILA = 6;
const PISTA = esTactil()
  ? {
      bestiario: 'Toca un monstruo para ver su ficha',
      logros: 'Los conseguidos salen en dorado',
    }
  : {
      bestiario: 'Flechas: elegir · Enter: logros · Escape: volver',
      logros: 'Enter: bestiario · Escape: volver',
    };

/** Bestiario (los monstruos vencidos, el resto en silueta) y logros, desde el título. */
export class EscenaExtras implements Escena {
  private pagina: 'bestiario' | 'logros' = 'bestiario';
  private elegido = 0;
  private tiempo = 0;
  private ultimoX = 0;
  private ultimoY = 0;
  private readonly fichas: FichaMonstruo[];
  private readonly logros: LogroVisto[];
  private readonly vistos: string;
  private readonly conseguidos: string;
  private readonly menu: MenuVista = {
    opciones: [
      { texto: 'Bestiario', detalle: '', disponible: true },
      { texto: 'Logros', detalle: '', disponible: true },
      { texto: 'Volver', detalle: '', disponible: true },
    ],
    seleccion: 0,
  };

  constructor(
    records: Records,
    monstruos: Readonly<Record<string, MonstruoJson>>,
    hojas: ReadonlyMap<string, Sprite>,
    logros: readonly Logro[],
    private readonly alVolver: () => void,
  ) {
    this.fichas = Object.entries(monstruos).flatMap(([clave, m]) => {
      const sprite = hojas.get(m.sprite);
      if (!sprite) return [];
      const visto = records.bestiario.includes(clave);
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
                `Habilidades: ${habilidades}`,
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
  }

  enter(): void {
    anunciar(`Bestiario. ${this.vistos}. ${PISTA.bestiario}`);
  }
  exit(): void {}

  update(dt: number, a: Acciones): void {
    this.tiempo += dt;
    if (a.cancelar || a.menu) {
      this.alVolver();
      return;
    }
    if (a.toqueX >= 0) {
      this.tocar(a.toqueX, a.toqueY);
      return;
    }
    if (a.confirmar) this.verPagina(this.pagina === 'bestiario' ? 'logros' : 'bestiario');
    if (this.pagina !== 'bestiario') return;
    const dx = Math.sign(a.moverX);
    const dy = Math.sign(a.moverY);
    if (dx !== 0 && dx !== this.ultimoX) this.elegir(this.elegido + dx);
    else if (dy !== 0 && dy !== this.ultimoY) this.elegir(this.elegido + dy * POR_FILA);
    this.ultimoX = dx;
    this.ultimoY = dy;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bestiario = this.pagina === 'bestiario';
    dibujarExtras(ctx, {
      pagina: this.pagina,
      titulo: bestiario ? 'Bestiario' : 'Logros',
      subtitulo: bestiario ? this.vistos : this.conseguidos,
      pista: PISTA[this.pagina],
      fichas: this.fichas,
      elegido: this.elegido,
      logros: this.logros,
      menu: this.menu,
      tiempo: this.tiempo,
    });
  }

  private tocar(x: number, y: number): void {
    const boton = opcionTocada(x, y, this.menu.opciones.length);
    if (boton === 2) this.alVolver();
    else if (boton >= 0) this.verPagina(boton === 0 ? 'bestiario' : 'logros');
    else if (this.pagina === 'bestiario') {
      const i = CELDAS.findIndex((c) => dentro(x, y, c));
      if (i >= 0 && i < this.fichas.length) this.elegir(i);
    }
  }

  private elegir(i: number): void {
    if (i < 0 || i >= this.fichas.length) return;
    this.elegido = i;
    sonar('cursor');
    const f = this.fichas[i]!;
    anunciar([f.nombre, ...f.lineas].join('. '));
  }

  private verPagina(p: 'bestiario' | 'logros'): void {
    this.pagina = p;
    this.menu.seleccion = p === 'bestiario' ? 0 : 1;
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
