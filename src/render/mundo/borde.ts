import * as THREE from 'three';
import type { Sala, Tile } from '../../core/sala';
import type { BordeHd2d } from '../../core/types';
import { cuentaColores, materialRuido, textura, tileSuelto } from './texturas';

/** Una sombra redonda que pintar en el suelo, en casillas. */
export interface SombraSuelo {
  x: number;
  z: number;
  radio: number;
  fuerza: number;
}

/** Materiales del Bosque que comparten el borde y los árboles sueltos, para que casen. */
export interface MaterialesBosque {
  copa: THREE.Material;
  tronco: THREE.Material;
}

const esMuro = (t: Tile): boolean => t.layer === 'muro' && t.solid;

/**
 * Borde de la sala con volumen: árboles en el Bosque, sillares de piedra en las Ruinas y la Cripta.
 * Devuelve también las sombras que hay que pintar en el suelo bajo los árboles.
 */
export function crearBorde(
  sala: Sala,
  borde: BordeHd2d,
  imagenes: readonly HTMLImageElement[],
  catalogo: ReadonlyMap<string, Tile>,
  tam: number,
  bosque: MaterialesBosque | null,
  azar: () => number,
): { grupo: THREE.Group; sombras: SombraSuelo[] } {
  const casillas = sala.base.flatMap((t, i) =>
    esMuro(t) ? [{ x: i % sala.ancho, z: Math.floor(i / sala.ancho), t }] : [],
  );
  return bordeEn(casillas, borde, imagenes, catalogo, tam, bosque, azar);
}

/** Casillas de alrededor de la sala, hasta `margen` (x a los lados, z arriba y abajo). */
export interface Margen {
  x: number;
  arriba: number;
  abajo: number;
}

/**
 * Decorado de fuera de la sala, para llenar la pantalla a los lados: el mismo borde en todas las casillas de
 * alrededor, salvo delante de las salidas (por donde sigue el camino).
 */
export function crearExterior(
  sala: Sala,
  margen: Margen,
  borde: BordeHd2d,
  imagenes: readonly HTMLImageElement[],
  catalogo: ReadonlyMap<string, Tile>,
  tam: number,
  bosque: MaterialesBosque | null,
  azar: () => number,
): { grupo: THREE.Group; sombras: SombraSuelo[] } {
  const { ancho, alto } = sala;
  const muro = sala.base.find(esMuro);
  // Una casilla de fuera sigue una salida si la casilla de la sala más cercana no es muro y está cerca.
  const camino = (x: number, z: number): boolean => {
    const cx = Math.min(ancho - 1, Math.max(0, x));
    const cz = Math.min(alto - 1, Math.max(0, z));
    const t = sala.base[cz * ancho + cx];
    return !!t && !esMuro(t) && Math.max(Math.abs(x - cx), Math.abs(z - cz)) <= 3;
  };
  const casillas: { x: number; z: number; t: Tile }[] = [];
  if (muro)
    for (let z = -margen.arriba; z < alto + margen.abajo; z++)
      for (let x = -margen.x; x < ancho + margen.x; x++) {
        const dentro = x >= 0 && x < ancho && z >= 0 && z < alto;
        if (!dentro && !camino(x, z)) casillas.push({ x, z, t: muro });
      }
  return bordeEn(casillas, borde, imagenes, catalogo, tam, bosque, azar);
}

function bordeEn(
  casillas: { x: number; z: number; t: Tile }[],
  borde: BordeHd2d,
  imagenes: readonly HTMLImageElement[],
  catalogo: ReadonlyMap<string, Tile>,
  tam: number,
  bosque: MaterialesBosque | null,
  azar: () => number,
): { grupo: THREE.Group; sombras: SombraSuelo[] } {
  return borde.tipo === 'arboles'
    ? arboles(casillas, borde, bosque, azar)
    : sillares(casillas, borde, imagenes, catalogo, tam, azar);
}

/** Materiales de los árboles: copa con la textura de `muro_a` y corteza pixelada. */
export function materialesBosque(
  borde: BordeHd2d,
  imagenes: readonly HTMLImageElement[],
  catalogo: ReadonlyMap<string, Tile>,
  tam: number,
  azar: () => number,
): MaterialesBosque | null {
  const muro = catalogo.get('muro_a');
  if (borde.tipo !== 'arboles' || !muro) return null;
  return {
    tronco: materialRuido(borde.corteza, [0.45, 0.4, 0.15], azar, 2),
    copa: new THREE.MeshLambertMaterial({
      map: textura(tileSuelto(imagenes, muro, tam)),
      flatShading: true,
    }),
  };
}

/** Cada casilla de muro lleva varios árboles: tronco y copa redonda, de tamaño y sitio al azar. */
function arboles(
  casillas: { x: number; z: number }[],
  c: Extract<BordeHd2d, { tipo: 'arboles' }>,
  bosque: MaterialesBosque | null,
  azar: () => number,
): { grupo: THREE.Group; sombras: SombraSuelo[] } {
  const grupo = new THREE.Group();
  if (!bosque) return { grupo, sombras: [] };
  const lista = casillas.flatMap(({ x, z }) =>
    Array.from({ length: c.porCasilla }, () => ({
      x: x + 0.5 + (azar() - 0.5) * c.desvio,
      z: z + 0.5 + (azar() - 0.5) * c.desvio,
      radio: c.radioMin + azar() * (c.radioMax - c.radioMin),
      alto: c.alto + c.altoCopa + azar() * c.desvio,
      grosor: c.troncoMin + azar() * (c.troncoMax - c.troncoMin),
      giro: azar() * 6,
    })),
  );
  // Cilindro de alto 1 con la base en el suelo; cada instancia lo estira hasta su copa.
  const cilindro = new THREE.CylinderGeometry(0.8, 1, 1, 6);
  cilindro.translate(0, 0.5, 0);
  const troncos = new THREE.InstancedMesh(cilindro, bosque.tronco, lista.length);
  const copas = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    bosque.copa,
    lista.length,
  );
  const molde = new THREE.Object3D();
  lista.forEach((a, i) => {
    molde.position.set(a.x, a.alto, a.z);
    molde.rotation.set(0, a.giro, 0);
    molde.scale.set(a.radio, a.radio * c.aplastar, a.radio);
    molde.updateMatrix();
    copas.setMatrixAt(i, molde.matrix);
    molde.position.set(a.x, 0, a.z);
    molde.scale.set(a.grosor, a.alto, a.grosor);
    molde.updateMatrix();
    troncos.setMatrixAt(i, molde.matrix);
  });
  for (const m of [troncos, copas]) {
    m.castShadow = true;
    m.receiveShadow = true;
    grupo.add(m);
  }
  const sombras = lista.map((a) => ({
    x: a.x,
    z: a.z,
    radio: a.radio * c.sombra.radio,
    fuerza: c.sombra.fuerza,
  }));
  return { grupo, sombras };
}

/**
 * Muro de sillares: cada casilla, `hiladas` filas de `porCasilla` piedras, cada una algo más o menos salida
 * y de un tono distinto, con un hueco entre ellas. La última hilada varía de alto (muro derruido en las Ruinas).
 * Los colores salen de los muros del arte. Una sola InstancedMesh para todas las piedras.
 */
function sillares(
  casillas: { x: number; z: number; t: Tile }[],
  c: Extract<BordeHd2d, { tipo: 'sillares' }>,
  imagenes: readonly HTMLImageElement[],
  catalogo: ReadonlyMap<string, Tile>,
  tam: number,
  azar: () => number,
): { grupo: THREE.Group; sombras: SombraSuelo[] } {
  const grupo = new THREE.Group();
  const muro = catalogo.get('muro_norte_a') ?? casillas[0]?.t;
  if (!muro) return { grupo, sombras: [] };
  // Los tres colores más usados de la cara del muro, en su proporción.
  const usados = [...cuentaColores(imagenes, muro, tam).entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 3);
  const total = usados.reduce((s, [, n]) => s + n, 0);
  const material = materialRuido(
    usados.map(([col]) => col),
    usados.map(([, n]) => n / total),
    azar,
  );
  const ocupado = new Set(casillas.map(({ x, z }) => z * 1000 + x));
  const piedras: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
  const alto = c.alto / c.hiladas;
  for (const { x, z } of casillas) {
    for (let k = 0; k < c.hiladas; k++) {
      // Las hiladas alternas, desplazadas media piedra, como un aparejo de verdad.
      const desfase = k % 2 === 0 ? 0 : 0.5 / c.porCasilla;
      const ultima = k === c.hiladas - 1;
      for (let p = 0; p < c.porCasilla; p++) {
        const ancho = 1 / c.porCasilla;
        let x0 = x + p * ancho + desfase;
        let x1 = x0 + ancho;
        // La piedra que se sale de la casilla tapa el hueco de la vecina; sin vecina, se recorta,
        // y la primera crece hasta el borde.
        if (x1 > x + 1 && !ocupado.has(z * 1000 + x + 1)) x1 = x + 1;
        if (p === 0 && desfase > 0 && !ocupado.has(z * 1000 + x - 1)) x0 = x;
        const h = ultima ? alto * (1 - azar() * c.irregular) : alto;
        if (h <= c.hueco) continue;
        const sale = (azar() - 0.5) * 2 * c.salida;
        piedras.push({
          x: (x0 + x1) / 2,
          y: k * alto + h / 2,
          z: z + 0.5,
          w: x1 - x0 - c.hueco,
          h: h - c.hueco,
          d: 1 + sale - c.hueco,
        });
      }
    }
  }
  const malla = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, piedras.length);
  const molde = new THREE.Object3D();
  const color = new THREE.Color();
  piedras.forEach((p, i) => {
    molde.position.set(p.x, p.y, p.z);
    molde.scale.set(p.w, p.h, p.d);
    molde.updateMatrix();
    malla.setMatrixAt(i, molde.matrix);
    const v = 1 - c.tono + azar() * c.tono * 2;
    malla.setColorAt(i, color.setRGB(v, v, v));
  });
  malla.castShadow = true;
  malla.receiveShadow = true;
  grupo.add(malla);
  return { grupo, sombras: [] };
}
