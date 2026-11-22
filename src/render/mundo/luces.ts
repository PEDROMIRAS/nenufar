import * as THREE from 'three';
import { compararLuces } from '../../core/luces';
import type { Hd2dJson, LuzHd2d } from '../../core/types';

/** Luces puntuales que hay siempre en la escena: cambiar cuántas hay obliga a recompilar los materiales. */
const PUNTUALES = 4;

/** Una luz puntual de una sala: cuál (de `hd2d.json`), dónde (en casillas) y su desfase de parpadeo. */
export interface LuzSala {
  luz: LuzHd2d;
  x: number;
  z: number;
  fase: number;
}

/** Añade una luz a las de una sala, ordenadas: las que hacen sombra primero y después las más fuertes. */
export function anadirLuz(luces: LuzSala[], l: LuzSala): void {
  luces.push(l);
  luces.sort((p, q) => compararLuces(p.luz, q.luz));
}

/**
 * Las luces puntuales de la escena, siempre las mismas: cada sala enciende las primeras con sus luces y deja las que
 * sobran apagadas. Solo la primera proyecta sombras (las puntuales con sombra son caras).
 */
export class Puntuales {
  private readonly luces: THREE.PointLight[] = [];

  constructor(escena: THREE.Scene, sombras: Hd2dJson['sombras']) {
    for (let i = 0; i < PUNTUALES; i++) {
      const luz = new THREE.PointLight(0xffffff, 0, 1, 1.5);
      luz.shadow.mapSize.set(sombras.puntual, sombras.puntual);
      luz.shadow.bias = -0.002;
      luz.castShadow = i === 0;
      this.luces.push(luz);
      escena.add(luz);
    }
  }

  /** Pone el color, el alcance y el sitio de las luces de una sala (`alta`: calidad alta, con sombras). */
  colocar(deSala: readonly LuzSala[], alta: boolean): void {
    this.luces.forEach((luz, i) => {
      // Las que sobran se quedan apagadas, no se quitan: cambiar cuántas hay recompila los materiales.
      const l = deSala[i];
      if (!l) return;
      luz.color.set(l.luz.color);
      luz.distance = l.luz.alcance;
      luz.position.set(l.x, l.luz.alto, l.z);
      luz.castShadow = i === 0 && l.luz.sombra && alta;
    });
  }

  /** Cada fotograma: las luces parpadean y alguna se mueve (el farol del ermitaño). */
  animar(deSala: readonly LuzSala[], tiempo: number): void {
    for (let i = 0; i < this.luces.length; i++) {
      const luz = this.luces[i]!;
      const l = deSala[i];
      if (!l) {
        luz.intensity = 0;
        continue;
      }
      luz.position.set(l.x, l.luz.alto, l.z);
      const p = l.luz.parpadeo;
      const t = tiempo + l.fase;
      luz.intensity =
        l.luz.intensidad * (1 + p * Math.sin(t * 13) + p * 0.6 * Math.sin(t * 7.3 + 1));
    }
  }
}
