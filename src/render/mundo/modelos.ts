import * as THREE from 'three';
import type { Tile } from '../../core/sala';
import { materialRuido, paleta } from './texturas';

/**
 * Barrera de una salida cerrada: barrotes de hierro de lado a lado de la casilla, a lo largo de X (salidas norte
 * y sur) o de Z (este y oeste), con los colores del sprite de la barrera.
 */
export function crearBarrera(
  t: Tile,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  aLoLargoDeX: boolean,
  azar: () => number,
): THREE.Group {
  const grupo = new THREE.Group();
  const hierro = materialRuido(paleta(imagenes, t, tam, 3), [0.3, 0.45, 0.25], azar);
  const barrote = new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6);
  barrote.translate(0, 0.4, 0);
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(barrote, hierro);
    m.position.x = -0.4 + k * 0.2;
    m.castShadow = true;
    grupo.add(m);
  }
  for (const y of [0.25, 0.65]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.06), hierro);
    m.position.y = y;
    m.castShadow = true;
    grupo.add(m);
  }
  if (!aLoLargoDeX) grupo.rotation.y = Math.PI / 2;
  return grupo;
}
