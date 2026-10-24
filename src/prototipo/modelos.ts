// shortcut: modelos 3D de los objetos sueltos del Bosque para el prototipo HD-2D; en la v2, uno por objeto de cada zona.
import * as THREE from 'three';
import type { Tile } from '../core/sala';
import { dibujarTile } from '../render/sala';
import { ruido } from './fuente';

/** Materiales que comparten con el borde del bosque, para que los árboles sueltos casen con él. */
export interface MaterialesBosque {
  copa: THREE.Material;
  tronco: THREE.Material;
}

/**
 * Modelo con relieve para el objeto cuyo tile de abajo es `t`, con los colores sacados de su propio sprite,
 * o null si no hay modelo para él (se queda como sprite). El origen es el centro de su base.
 */
export function crearModelo(
  t: Tile,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  bosque: MaterialesBosque,
  azar: () => number,
): THREE.Object3D | null {
  const grupo = new THREE.Group();
  const piezas: THREE.Mesh[] = [];
  const poner = (
    geometria: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    escala: [number, number, number] = [1, 1, 1],
  ): void => {
    const m = new THREE.Mesh(geometria, material);
    m.position.set(x, y, z);
    m.rotation.y = azar() * 6;
    m.scale.set(...escala);
    piezas.push(m);
  };
  const conRuido = (colores: number[], pesos: number[]): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ map: ruido(colores, pesos, azar, 1, 1), flatShading: true });
  const bola = new THREE.IcosahedronGeometry(1, 1);

  switch (t.name) {
    case 'arbol_inf': {
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
      // Conos apilados con los verdes del pino.
      const agujas = conRuido(paleta(imagenes, t, tam, 3, verde), [0.3, 0.45, 0.25]);
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
      const piedra = conRuido(paleta(imagenes, t, tam, 3), [0.3, 0.45, 0.25]);
      poner(new THREE.IcosahedronGeometry(1, 0), piedra, 0, 0.13, 0, [0.4, 0.27, 0.32]);
      poner(new THREE.IcosahedronGeometry(1, 0), piedra, 0.22, 0.07, 0.08, [0.18, 0.13, 0.16]);
      break;
    }
    case 'arbusto': {
      // Bolas pequeñas con los verdes del arbusto y alguna de sus flores.
      const [flor = 0xe08aa8] = paleta(imagenes, t, tam, 1, rosa);
      const hojas = conRuido([...paleta(imagenes, t, tam, 3, verde), flor], [0.4, 0.33, 0.17, 0.1]);
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
      // Cilindro de corteza con la madera clara arriba (grupos de CylinderGeometry: lado, tapa, base).
      const [clara = 0xc89a64, media = 0xa0744a] = paleta(imagenes, t, tam, 2, calido);
      const madera = conRuido([clara, media], [0.6, 0.4]);
      poner(new THREE.CylinderGeometry(0.22, 0.27, 0.26, 8), bosque.tronco, 0, 0.13, 0);
      const tapa = piezas[piezas.length - 1];
      if (tapa) tapa.material = [bosque.tronco, madera, bosque.tronco];
      break;
    }
    default:
      return null;
  }
  for (const m of piezas) {
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
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
 * Los `n` colores más usados del sprite (sin contar la sombra gris del suelo), de claro a oscuro.
 * `filtro` deja solo los que interesan (los verdes de las hojas de un pino, no su tronco).
 */
function paleta(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
  n: number,
  filtro: (r: number, g: number, b: number) => boolean = () => true,
): number[] {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = tam;
  const ctx = lienzo.getContext('2d')!;
  dibujarTile(ctx, imagenes, t, tam, 0, 0);
  const px = ctx.getImageData(0, 0, tam, tam).data;
  const cuenta = new Map<number, number>();
  for (let i = 0; i < px.length; i += 4) {
    const [r = 0, g = 0, b = 0, a = 0] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 250) continue; // la sombra del suelo es semitransparente
    if (!filtro(r, g, b)) continue;
    const color = (r << 16) | (g << 8) | b;
    cuenta.set(color, (cuenta.get(color) ?? 0) + 1);
  }
  const brillo = (c: number): number => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  return [...cuenta.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, n)
    .map(([c]) => c)
    .sort((x, y) => brillo(y) - brillo(x));
}
