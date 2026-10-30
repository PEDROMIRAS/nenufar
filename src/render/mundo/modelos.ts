import * as THREE from 'three';
import type { Tile } from '../../core/sala';
import type { MaterialesBosque } from './borde';
import { materialRuido, paleta } from './texturas';

/**
 * Modelo con relieve para el objeto cuyo tile de abajo es `t`, con los colores sacados de su propio sprite,
 * o null si no hay modelo para él (se queda como sprite de pie). El origen es el centro de su base.
 * Son formas sencillas (bolas facetadas, conos, cilindros, cajas, tornos) con grano de pixel art: lo que el
 * arte dibuja visto desde arriba no funciona como sprite en 3D.
 */
export function crearModelo(
  t: Tile,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  bosque: MaterialesBosque | null,
  azar: () => number,
): THREE.Object3D | null {
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
  const caja = new THREE.BoxGeometry(1, 1, 1);

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
    case 'columna_inf': {
      // Basa, fuste de ocho caras y capitel.
      const m = piedra();
      poner(caja, m, 0, 0.06, 0, [0.62, 0.12, 0.5], 0);
      poner(new THREE.CylinderGeometry(0.17, 0.2, 1, 8), m, 0, 0.12 + 0.62, 0, [1, 1.24, 1]);
      poner(caja, m, 0, 1.42, 0, [0.6, 0.12, 0.48], 0);
      break;
    }
    case 'columna_rota': {
      // Basa con un trozo de fuste roto y otro tirado al lado.
      const m = piedra();
      poner(caja, m, 0, 0.06, 0, [0.62, 0.12, 0.5], 0);
      const fuste = poner(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 8), m, -0.06, 0.33, 0);
      fuste.rotation.z = 0.08;
      const tirado = poner(
        new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8),
        m,
        0.3,
        0.15,
        0.12,
        [1, 1, 1],
        0,
      );
      tirado.rotation.set(0.3, 0.5, Math.PI / 2);
      break;
    }
    case 'escombros': {
      // Unos cuantos cascotes de piedra.
      const m = piedra();
      for (let k = 0; k < 5; k++) {
        const r = 0.08 + azar() * 0.1;
        poner(
          new THREE.IcosahedronGeometry(1, 0),
          m,
          (azar() - 0.5) * 0.6,
          r * 0.6,
          (azar() - 0.5) * 0.4,
          [r * 1.3, r, r],
        );
      }
      break;
    }
    case 'vasija': {
      // Torno de barro: base estrecha, panza y boca.
      const barro = materialRuido(colores(3, calido), [0.35, 0.45, 0.2], azar);
      const perfil = [
        [0, 0],
        [0.12, 0],
        [0.22, 0.12],
        [0.24, 0.24],
        [0.15, 0.38],
        [0.1, 0.44],
        [0.13, 0.5],
      ].map(([r = 0, y = 0]) => new THREE.Vector2(r, y));
      poner(new THREE.LatheGeometry(perfil, 10), barro, 0, 0, 0);
      break;
    }
    case 'pilar_inf': {
      // Pilar cuadrado con basa y capitel más anchos.
      const m = piedra();
      poner(caja, m, 0, 0.08, 0, [0.62, 0.16, 0.5], 0);
      poner(caja, m, 0, 0.8, 0, [0.42, 1.3, 0.34], 0);
      poner(caja, m, 0, 1.52, 0, [0.6, 0.14, 0.48], 0);
      break;
    }
    case 'lapida': {
      // Losa con la parte de arriba redonda, algo torcida, y un poco de tierra delante.
      const m = piedra();
      const giro = (azar() - 0.5) * 0.3;
      const losa = new THREE.Group();
      const cuerpo = new THREE.Mesh(caja, m);
      cuerpo.scale.set(0.46, 0.42, 0.12);
      cuerpo.position.y = 0.21;
      const arco = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.12, 10, 1, false, 0, Math.PI),
        m,
      );
      arco.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      arco.position.y = 0.42;
      for (const p of [cuerpo, arco]) {
        p.castShadow = p.receiveShadow = true;
        losa.add(p);
      }
      losa.rotation.set(-0.08 + azar() * 0.16, giro, (azar() - 0.5) * 0.12);
      grupo.add(losa);
      break;
    }
    case 'sarcofago': {
      // Caja con la tapa algo más grande.
      const m = piedra();
      poner(caja, m, 0, 0.16, 0, [0.72, 0.32, 0.46], 0);
      poner(caja, m, 0, 0.36, 0, [0.78, 0.08, 0.52], 0);
      poner(caja, m, 0, 0.42, 0, [0.6, 0.04, 0.36], 0);
      break;
    }
    case 'candelabro': {
      // Pie, brazo y tres velas con su llama, que brilla (el bloom la recoge).
      const [metal = 0xe2b448] = colores(1, calido);
      const oro = materialRuido([metal, 0xa0782c], [0.7, 0.3], azar);
      poner(new THREE.CylinderGeometry(0.03, 0.12, 0.7, 6), oro, 0, 0.35, 0, [1, 1, 1], 0);
      poner(caja, oro, 0, 0.7, 0, [0.46, 0.04, 0.05], 0);
      const cera = new THREE.MeshLambertMaterial({ color: 0xf1e6cf });
      const llama = new THREE.MeshBasicMaterial({ color: 0xffd27a });
      for (const x of [-0.21, 0, 0.21]) {
        const alto = x === 0 ? 0.16 : 0.12;
        poner(new THREE.CylinderGeometry(0.035, 0.035, alto, 6), cera, x, 0.72 + alto / 2, 0);
        const fuego = poner(
          new THREE.SphereGeometry(0.04, 6, 4),
          llama,
          x,
          0.76 + alto,
          0,
          [1, 1.6, 1],
        );
        fuego.castShadow = false;
      }
      break;
    }
    case 'brasero': {
      // Cuenco de hierro sobre tres patas, con un lecho de brasas y una llama que brilla (el bloom la recoge).
      const hierro = new THREE.MeshLambertMaterial({ color: 0x2a2634, flatShading: true });
      const brasa = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
      const llama = new THREE.MeshBasicMaterial({ color: 0xffc860 });
      poner(new THREE.CylinderGeometry(0.2, 0.12, 0.16, 8), hierro, 0, 0.36, 0);
      for (const ang of [0, 2.1, 4.2]) {
        const x = Math.cos(ang) * 0.1;
        const z = Math.sin(ang) * 0.1;
        poner(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 5), hierro, x, 0.15, z);
      }
      poner(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 8), brasa, 0, 0.44, 0).castShadow = false;
      poner(new THREE.SphereGeometry(0.07, 6, 4), llama, 0, 0.53, 0, [1, 1.8, 1]).castShadow =
        false;
      break;
    }
    case 'cofre_cerrado':
    case 'cofre_abierto': {
      // Caja de madera con tapa y herrajes; abierto, la tapa echada hacia atrás.
      const [madera1 = 0x9a6a42, madera2 = 0x6e4a2c] = colores(2, calido);
      const madera = materialRuido([madera1, madera2], [0.6, 0.4], azar);
      const [herraje = 0xe2b448] = colores(1, (r, g, b) => r > 180 && g > 140 && b < 120);
      const oro = new THREE.MeshLambertMaterial({ color: herraje, flatShading: true });
      poner(caja, madera, 0, 0.17, 0, [0.6, 0.34, 0.4], 0);
      poner(caja, oro, 0, 0.17, 0.205, [0.1, 0.12, 0.02], 0);
      const tapa = new THREE.Group();
      const tabla = new THREE.Mesh(caja, madera);
      tabla.scale.set(0.62, 0.12, 0.42);
      tabla.position.set(0, 0.06, 0.21);
      const banda = new THREE.Mesh(caja, oro);
      banda.scale.set(0.64, 0.04, 0.08);
      banda.position.set(0, 0.06, 0.21);
      for (const p of [tabla, banda]) {
        p.castShadow = p.receiveShadow = true;
        tapa.add(p);
      }
      // La tapa gira por su borde de atrás.
      tapa.position.set(0, 0.34, -0.21);
      if (t.name === 'cofre_abierto') tapa.rotation.x = -1.9;
      grupo.add(tapa);
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
