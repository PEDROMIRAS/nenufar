import * as THREE from 'three';
import type { Tile } from '../../core/sala';
import type { MaterialesBosque } from './borde';
import { materialRuido, paleta } from './texturas';

/** Objetos del Bosque que llevan modelo con relieve; los demás objetos de todas las zonas son sprites de pie. */
const NATURALES = new Set(['arbol_inf', 'pino_inf', 'roca', 'arbusto', 'tocon']);

/**
 * Modelo con relieve para el objeto natural del Bosque cuyo tile de abajo es `t`, con los colores sacados de su
 * propio sprite, o null si no lo lleva (se queda como sprite de pie). El origen es el centro de su base.
 * Son formas sencillas (bolas facetadas, conos, cilindros) con grano de pixel art: lo que el arte del Bosque
 * dibuja visto desde arriba no funciona como sprite en 3D.
 */
export function crearModelo(
  t: Tile,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  bosque: MaterialesBosque | null,
  azar: () => number,
): THREE.Object3D | null {
  if (!bosque || !NATURALES.has(t.name)) return null;
  const grupo = new THREE.Group();
  const poner = (
    geometria: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
    escala: [number, number, number] = [1, 1, 1],
    giro = azar() * 6,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(geometria, material);
    m.position.set(x, y, z);
    m.rotation.y = giro;
    m.scale.set(...escala);
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
    return m;
  };
  const colores = (n: number, filtro?: (r: number, g: number, b: number) => boolean): number[] =>
    paleta(imagenes, t, tam, n, filtro);
  const piedra = (): THREE.Material => materialRuido(colores(3), [0.3, 0.45, 0.25], azar);
  const bola = new THREE.IcosahedronGeometry(1, 1);

  switch (t.name) {
    case 'arbol_inf': {
      if (!bosque) return null;
      // Tronco y tres copas, como los del borde pero algo más grandes.
      const alto = 0.95;
      poner(troncoGeo(), bosque.tronco, 0, 0, 0, [0.11, alto, 0.11]);
      for (let k = 0; k < 3; k++) {
        const r = 0.36 + azar() * 0.12;
        const a = (k / 3) * Math.PI * 2 + azar();
        poner(bola, bosque.copa, Math.cos(a) * 0.18, alto + azar() * 0.25, Math.sin(a) * 0.15, [
          r,
          r * 0.85,
          r,
        ]);
      }
      break;
    }
    case 'pino_inf': {
      if (!bosque) return null;
      // Conos apilados con los verdes del pino.
      const agujas = materialRuido(colores(3, verde), [0.3, 0.45, 0.25], azar);
      poner(troncoGeo(), bosque.tronco, 0, 0, 0, [0.08, 0.5, 0.08]);
      [
        [0.42, 0.62, 0.3],
        [0.34, 0.55, 0.68],
        [0.24, 0.5, 1.02],
      ].forEach(([r = 0, h = 0, y = 0]) => {
        poner(new THREE.ConeGeometry(1, 1, 7), agujas, 0, y + h / 2, 0, [r, h, r]);
      });
      break;
    }
    case 'roca': {
      const m = piedra();
      poner(new THREE.IcosahedronGeometry(1, 0), m, 0, 0.13, 0, [0.4, 0.27, 0.32]);
      poner(new THREE.IcosahedronGeometry(1, 0), m, 0.22, 0.07, 0.08, [0.18, 0.13, 0.16]);
      break;
    }
    case 'arbusto': {
      // Bolas pequeñas con los verdes del arbusto y alguna de sus flores.
      const [flor = 0xe08aa8] = colores(1, rosa);
      const hojas = materialRuido([...colores(3, verde), flor], [0.4, 0.33, 0.17, 0.1], azar);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + azar();
        const r = 0.2 + azar() * 0.09;
        poner(bola, hojas, Math.cos(a) * 0.17, 0.18 + azar() * 0.08, Math.sin(a) * 0.12, [
          r,
          r * 0.85,
          r,
        ]);
      }
      break;
    }
    case 'tocon': {
      if (!bosque) return null;
      // Cilindro de corteza con la madera clara arriba (grupos de CylinderGeometry: lado, tapa, base).
      const [clara = 0xc89a64, media = 0xa0744a] = colores(2, calido);
      const madera = materialRuido([clara, media], [0.6, 0.4], azar);
      poner(
        new THREE.CylinderGeometry(0.22, 0.27, 0.26, 8),
        [bosque.tronco, madera, bosque.tronco],
        0,
        0.13,
        0,
      );
      break;
    }
    default:
      return null;
  }
  return grupo;
}

const verde = (r: number, g: number, b: number): boolean => g > r && g >= b;
const calido = (r: number, g: number, b: number): boolean => r > g && r > b;
const rosa = (r: number, g: number, b: number): boolean => r > g + 30 && b > g;

/** Cilindro de alto 1 con la base en el suelo. */
function troncoGeo(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.8, 1, 1, 6);
  g.translate(0, 0.5, 0);
  return g;
}

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
