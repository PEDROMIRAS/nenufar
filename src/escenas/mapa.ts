import type { Acciones } from '../core/acciones';
import { crearAzar } from '../core/azar';
import { actualizarHeroina, type Heroina } from '../core/heroina';
import { opuesto, posicionEntrada, salaVecina, salidaPisada } from '../core/mapa';
import { buscarInicio } from '../core/movimiento';
import {
  aplicarPuertas,
  construirSala,
  salidas,
  type Sala,
  type Salida,
  type Tile,
} from '../core/sala';
import type { PlantillasJson } from '../core/types';
import type { SalaZona, Zona } from '../core/zona';
import { dibujarHeroina } from '../render/heroina';
import type { Sprite } from '../render/recursos';
import { dibujarObjetos, pintarFondo, pintarVineta } from '../render/sala';
import type { Escena } from './escena';

interface SalaMontada {
  sala: Sala;
  fondo: HTMLCanvasElement;
}

/** Exploración de una zona: la sala actual, la heroína y el paso de una sala a otra. */
export class EscenaMapa implements Escena {
  private readonly montadas = new Map<SalaZona, SalaMontada>();
  private readonly salidas: Salida[];
  private readonly vineta: HTMLCanvasElement;
  private actual: SalaZona;
  private montada: SalaMontada;
  private tiempo = 0;

  constructor(
    private readonly zona: Zona,
    private readonly plantillas: PlantillasJson,
    private readonly catalogo: ReadonlyMap<string, Tile>,
    private readonly imagenes: readonly HTMLImageElement[],
    private readonly tam: number,
    private readonly heroina: Heroina,
    private readonly sprite: Sprite,
  ) {
    const inicio = zona.salas.find((s) => s.tipo === 'inicio');
    if (!inicio) throw new Error('La zona no tiene sala de inicio');
    this.actual = inicio;
    this.montada = this.montar(inicio);
    const { sala } = this.montada;
    this.salidas = salidas(sala.ancho, sala.alto);
    this.vineta = pintarVineta(this.montada.fondo.width, this.montada.fondo.height);
    const c = heroina.cuerpo;
    this.colocar(buscarInicio(sala, tam, c.ancho, c.alto));
  }

  enter(): void {}
  exit(): void {}

  update(dt: number, acciones: Acciones): void {
    this.tiempo += dt;
    const h = this.heroina;
    actualizarHeroina(h, acciones, dt, this.montada.sala, this.tam);
    const salida = salidaPisada(
      this.salidas,
      this.actual.puertas,
      this.tam,
      h.cuerpo.x,
      h.cuerpo.y,
    );
    if (salida) this.cruzar(salida.lado);
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number): void {
    const h = this.heroina;
    const { sala, fondo } = this.montada;
    // Los objetos con la base por encima de los pies quedan detrás de la heroína; el resto, delante.
    const pies = Math.round(h.yAnterior + (h.cuerpo.y - h.yAnterior) * alpha);
    ctx.drawImage(fondo, 0, 0);
    dibujarObjetos(ctx, sala, this.imagenes, this.tam, this.tiempo, -Infinity, pies);
    dibujarHeroina(ctx, this.sprite, h, alpha);
    dibujarObjetos(ctx, sala, this.imagenes, this.tam, this.tiempo, pies, Infinity);
    ctx.drawImage(this.vineta, 0, 0);
  }

  private cruzar(lado: number): void {
    const vecina = salaVecina(this.zona, this.actual, lado);
    const entrada = this.salidas.find((s) => s.lado === opuesto(lado));
    if (!vecina || !entrada) return;
    this.actual = vecina;
    this.montada = this.montar(vecina);
    this.colocar(posicionEntrada(entrada, this.tam, this.heroina.cuerpo.alto));
  }

  /** Coloca a la heroína sin interpolar desde la posición anterior (evita que cruce la pantalla). */
  private colocar({ x, y }: { x: number; y: number }): void {
    const h = this.heroina;
    h.cuerpo.x = h.xAnterior = x;
    h.cuerpo.y = h.yAnterior = y;
  }

  /** Monta la sala la primera vez que se visita; después la reutiliza tal cual. */
  private montar(s: SalaZona): SalaMontada {
    const hecha = this.montadas.get(s);
    if (hecha) return hecha;
    // Semilla propia por sala: la misma zona da siempre las mismas salas, se visiten en el orden que sea.
    const azar = crearAzar(this.zona.semilla * 1009 + this.zona.salas.indexOf(s));
    const candidatas = this.plantillas.plantillas.filter((p) => p.tipo === s.tipo);
    const plantilla = candidatas[Math.floor(azar() * candidatas.length)];
    if (!plantilla) throw new Error(`No hay plantillas de tipo ${s.tipo}`);
    const sala = construirSala(
      aplicarPuertas(plantilla.mapa, s.puertas),
      this.plantillas,
      this.catalogo,
      azar,
    );
    const montada = { sala, fondo: pintarFondo(sala, this.imagenes, this.tam) };
    this.montadas.set(s, montada);
    return montada;
  }
}
