import type { Resultado } from '../core/combate';
import { crearAzar } from '../core/azar';
import { gruposDesafio } from '../core/eventos';
import type { CombateGuardado } from '../core/guardado';
import { objetoAlAlcance } from '../core/mapa';
import type { Cuerpo } from '../core/movimiento';
import { actualizarPatrulla, type Patrulla } from '../core/patrulla';
import type { ObjetoSala, Sala } from '../core/sala';
import type { MonstruoJson, MovimientoMapaJson } from '../core/types';
import type { SalaZona } from '../core/zona';
import type { VistaSala } from '../render/mundo/mundo';
import { sonar } from '../render/sonido';
import type { OpcionesMapa } from './mapa';

/** Píxeles alrededor de la heroína en los que se alcanza el objeto del evento (como la fuente). */
const ALCANCE = 4;

/** Lo que las salas de evento necesitan del mapa. */
export interface PuertoMapa {
  readonly o: OpcionesMapa;
  readonly tam: number;
  /** La sala en la que está la heroína, y su montaje (la sala con sus objetos, la vista 3D si ya hay y el ermitaño). */
  actual(): SalaZona;
  montada(): { sala: Sala; vista: { sala: VistaSala } | null; ermitano: Patrulla | null };
  hecha(s: SalaZona): boolean;
  marcarHecha(s: SalaZona): void;
  avisar(texto: string): void;
  lanzarCombate(
    grupo: MonstruoJson[],
    alTerminar: (r: Resultado) => void,
    quien: 'heroina' | 'monstruos' | null,
    combate: CombateGuardado,
  ): void;
  /** El cofre de la zona para esta sala (ver `EscenaMapa.sacarBotin`). */
  sacarBotin(vacio: string, hay: string, equipo: string, alFinal: () => void): void;
  /** Guarda la partida tal como está (sin combate pendiente). */
  guardar(): void;
  /** Un rato sin poder empezar otro combate (tras huir o vencer). */
  descansar(): void;
  azarMapa(): number;
}

/**
 * Las salas de evento del mapa: el altar, el puesto del mercader, el círculo del desafío (con su cadena de combates y
 * su premio) y el ermitaño. El mapa les pregunta en cada paso (`pendiente`, `actualizar`) y les pasa lo que guarda.
 */
export class SalasEvento {
  /** Falso tras elegir «marcharse» y hasta que la heroína se aparte del altar o del círculo: así no se reabre a cada paso. */
  private eventoListo = true;
  /** Combate de la cadena del desafío que sigue; se lanza en el siguiente fotograma, ya guardado el anterior. */
  private desafioPendiente: number | null = null;
  /** Cómo pasea el ermitaño: sin visión ni persecución. Se hace una vez y no en cada fotograma. */
  private readonly paseoErmitano: MovimientoMapaJson;

  constructor(private readonly m: PuertoMapa) {
    this.paseoErmitano = { ...m.o.ermitano.mapa, persecucion: 0, vision: 0 };
  }

  /** Lanza lo que quedó pendiente del desafío (el siguiente combate o el premio). Si lo hace, el mapa para este paso. */
  pendiente(): boolean {
    if (this.desafioPendiente === null) return false;
    const paso = this.desafioPendiente;
    this.desafioPendiente = null;
    this.desafiar(paso);
    return true;
  }

  /**
   * Un paso con la heroína en `h`: el ermitaño pasea o se para a mirarla, y acercarse al ermitaño, al altar, al puesto o
   * al círculo abre su elección. Si abre algo, el mapa para este paso.
   */
  actualizar(h: Cuerpo, dt: number): boolean {
    const { o, tam } = this.m;
    const actual = this.m.actual();
    const montada = this.m.montada();
    const ermitano = montada.ermitano;
    if (ermitano) {
      const { alcance } = o.ermitano.mapa;
      const c = ermitano.cuerpo;
      const dx = h.x - c.x;
      const dy = h.y - c.y;
      if (Math.hypot(dx, dy) > alcance) {
        this.eventoListo = true;
        actualizarPatrulla(ermitano, this.paseoErmitano, h.x, h.y, dt, montada.sala, tam, () =>
          this.m.azarMapa(),
        );
        return false;
      }
      // Se para y mira a la heroína; si la sala aún no está hecha, abre la elección (una vez por acercamiento).
      ermitano.xAnterior = c.x;
      ermitano.yAnterior = c.y;
      ermitano.dirX = dx;
      ermitano.dirY = dy;
      if (this.eventoListo && !this.m.hecha(actual)) {
        this.eventoListo = false;
        this.hablarConErmitano();
        return true;
      }
      // Ya dio lo que tenía: solo lo dice (una vez por acercamiento).
      if (this.eventoListo) {
        this.eventoListo = false;
        this.m.avisar(o.ermitano.yaDado);
      }
      return false;
    }
    if (actual.tipo !== 'evento' || this.m.hecha(actual)) return false;
    const evento = actual.evento;
    const nombre = evento === 'desafio' || evento === 'mercader' ? evento : 'altar';
    const objeto = objetoAlAlcance(montada.sala, nombre, h, tam, ALCANCE);
    if (!objeto) {
      this.eventoListo = true;
      return false;
    }
    if (!this.eventoListo) return false;
    this.eventoListo = false;
    if (evento === 'desafio') this.retar(objeto);
    else if (evento === 'mercader') this.comerciar(objeto);
    else this.usarAltar(objeto);
    return true;
  }

  /** Lo que sigue en el desafío ya ganado un combate (el siguiente, o el premio), para guardarlo; null si no hay nada pendiente. */
  combatePendiente(): CombateGuardado | null {
    return this.desafioPendiente === null ? null : { tipo: 'desafio', paso: this.desafioPendiente };
  }

  /** Vuelve al combate `paso` del desafío interrumpido al cerrar el navegador (o a su premio), si sigue en su sala. */
  reanudar(paso: number): void {
    if (this.m.actual().evento === 'desafio' && paso <= this.m.o.desafio.combates)
      this.desafiar(paso);
  }

  /** Abre la elección del altar; si se acepta un trato, el altar se apaga y no se repite. */
  private usarAltar(altar: ObjetoSala): void {
    const sala = this.m.actual();
    this.m.o.usarAltar((usado, aviso) => {
      if (usado && this.m.actual() === sala) this.apagarEvento(altar);
      this.m.avisar(aviso);
    });
  }

  /** Abre el puesto del mercader; tras un trueque se apaga y la sala queda hecha. */
  private comerciar(puesto: ObjetoSala): void {
    const sala = this.m.actual();
    this.m.o.usarMercader((usado, aviso) => {
      if (usado && this.m.actual() === sala) this.apagarEvento(puesto);
      if (aviso) this.m.avisar(aviso);
    });
  }

  /** Abre las ofertas del ermitaño; al llevarse una, la sala queda hecha (él sigue ahí, pero ya no ofrece más). */
  private hablarConErmitano(): void {
    const { zona } = this.m.o;
    const sala = this.m.actual();
    // Las mismas ofertas en cada visita y al recuperar la partida.
    const azar = crearAzar(zona.semilla * 1021 + zona.salas.indexOf(sala));
    this.m.o.usarErmitano(azar, (usado, aviso) => {
      if (usado && this.m.actual() === sala) this.m.marcarHecha(sala);
      if (aviso) this.m.avisar(aviso);
    });
  }

  /** El altar o el círculo se apaga y la sala queda hecha: no se repite. */
  private apagarEvento(objeto: ObjetoSala): void {
    const { catalogo, mundo } = this.m.o;
    const apagado = catalogo.get('altar_apagado');
    if (apagado) objeto.inf = apagado;
    const vista = this.m.montada().vista;
    if (vista) mundo.rehacerObjeto(vista.sala, objeto);
    this.m.marcarHecha(this.m.actual());
    mundo.refrescarLuces();
  }

  /** Abre la elección del desafío; si se acepta, el círculo se apaga y empieza la cadena de combates. */
  private retar(circulo: ObjetoSala): void {
    const sala = this.m.actual();
    this.m.o.usarDesafio((aceptado) => {
      if (!aceptado || this.m.actual() !== sala) return;
      this.apagarEvento(circulo);
      this.desafiar(0);
    });
  }

  /** El premio del desafío: un cofre de la zona. Se sortea con el azar de la sala, así que al recuperar sale lo mismo. */
  private premiarDesafio(): void {
    const { superado, vacio, hay } = this.m.o.desafio.avisos;
    sonar('cofre');
    // Hasta que el premio se resuelve el guardado dice «premio pendiente»; entonces se guarda sin nada pendiente.
    this.m.sacarBotin(`${superado} ${vacio}`, `${superado} ${hay}`, superado, () =>
      this.m.guardar(),
    );
  }

  /**
   * Combate `paso` (desde 0) del desafío; con `paso` igual al número de combates, el premio. Los grupos salen de la
   * semilla de la zona y la sala, así que son los mismos si se cierra el navegador y se vuelve. Ganado, sigue lo
   * siguiente (que se guarda como pendiente hasta que empieza); huir deja el desafío sin premio.
   */
  private desafiar(paso: number): void {
    const { desafio, zona, grupos } = this.m.o;
    if (paso === desafio.combates) return this.premiarDesafio();
    const sala = this.m.actual();
    const azar = crearAzar(zona.semilla * 1019 + zona.salas.indexOf(sala));
    const grupo = gruposDesafio(grupos, desafio.combates, azar)[paso];
    if (!grupo) return;
    this.m.lanzarCombate(
      grupo,
      (resultado) => {
        this.m.descansar();
        if (resultado !== 'victoria') {
          this.m.avisar(desafio.avisos.huida);
        } else {
          // No se lanza ya: `crearZona` guarda la partida al volver aquí (con `combatePendiente`) y pisaría el
          // guardado del siguiente combate. Con el último, lo pendiente es el premio.
          this.desafioPendiente = paso + 1;
        }
      },
      null,
      { tipo: 'desafio', paso },
    );
  }
}
