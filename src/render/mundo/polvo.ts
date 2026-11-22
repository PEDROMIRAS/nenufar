import * as THREE from 'three';
import { crearAnillo, progresoNube, soltarNube, vaciarAnillo } from '../../core/polvo';
import { MAPA_VIVO } from '../../data/datos';
import { TAM } from './actores';

/** Lado de una nube de polvo en casillas, cuánto sube y cuánto crece al deshacerse, y su opacidad al salir. */
const NUBE = { lado: 0.28, sube: 0.15, crece: 1, opacidad: 0.55 };

/** El polvo de los pasos: un plano por hueco del anillo (la siguiente nube que sale es la más vieja). */
export class Polvo {
  private readonly nubes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private readonly anillo = crearAnillo(MAPA_VIVO.polvo.cantidad);

  /** `giro`: cuánto se echan atrás los sprites (las nubes, igual). */
  constructor(giro: number) {
    const textura = texturaNube();
    for (let i = 0; i < MAPA_VIVO.polvo.cantidad; i++) {
      const malla = new THREE.Mesh(
        new THREE.PlaneGeometry(NUBE.lado, NUBE.lado),
        new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthWrite: false }),
      );
      malla.rotation.x = -giro;
      malla.visible = false;
      this.nubes.push(malla);
    }
  }

  /** Color del polvo (el del suelo de la zona). */
  ponerColor(hex: string): void {
    for (const n of this.nubes) n.material.color.set(hex);
  }

  /** Suelta una nube en los pies, en (x, y) píxeles del juego, dentro de `escena`; reutiliza la más vieja. */
  soltar(escena: THREE.Scene, x: number, y: number, tiempo: number): void {
    const n = this.nubes[soltarNube(this.anillo, tiempo)]!;
    n.position.set(x / TAM, NUBE.lado / 2, y / TAM);
    if (n.parent !== escena) escena.add(n);
  }

  /** Quita todo el polvo (al cambiar de sala o de zona, cuando el reloj de la escena cambia). */
  vaciar(): void {
    vaciarAnillo(this.anillo);
    for (const n of this.nubes) n.visible = false;
  }

  /** Las nubes suben un poco, crecen y se desvanecen; `visibles` = false las esconde (fondo del combate). */
  animar(tiempo: number, visibles: boolean): void {
    const vida = MAPA_VIVO.polvo.vida;
    for (let i = 0; i < this.nubes.length; i++) {
      const n = this.nubes[i]!;
      const p = visibles ? progresoNube(this.anillo, i, tiempo, vida) : -1;
      n.visible = p >= 0;
      if (p < 0) continue;
      n.position.y = NUBE.lado / 2 + NUBE.sube * p;
      const e = 1 + NUBE.crece * p;
      n.scale.set(e, e, 1);
      n.material.opacity = NUBE.opacidad * (1 - p);
    }
  }
}

/** Textura de una nube de polvo: un círculo blanco de borde suave (el color lo pone el material). */
function texturaNube(): THREE.Texture {
  const lienzo = document.createElement('canvas');
  lienzo.width = 16;
  lienzo.height = 16;
  const ctx = lienzo.getContext('2d')!;
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
  return new THREE.CanvasTexture(lienzo);
}
