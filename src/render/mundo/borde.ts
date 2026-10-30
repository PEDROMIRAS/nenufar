import * as THREE from 'three';
import type { Sala, Tile } from '../../core/sala';
import type { BordeHd2d } from '../../core/types';
import { materialRuido, textura, tileSuelto } from './texturas';

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
 * Muro con el dibujo del arte: cada casilla es una caja con el tile de remate (`muro_a`/`muro_b`) arriba y el
 * tile de cara (`muro_norte_*`) en los lados. Las casillas de la sala llevan la variante que les tocó (con su
 * hornacina, su veta o su aro); las demás, la cara lisa `muro_norte_a`. Una InstancedMesh por cada combinación.
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
  const lisa = catalogo.get('muro_norte_a');
  const tapas = ['muro_a', 'muro_b'].flatMap((n) => catalogo.get(n) ?? []);
  const grupos = new Map<string, { cara: Tile; tapa: Tile; lugares: { x: number; z: number }[] }>();
  for (const { x, z, t } of casillas) {
    const cara = t.name.startsWith('muro_norte') ? t : (lisa ?? t);
    const tapa = tapas[Math.floor(azar() * tapas.length)] ?? t;
    const clave = `${cara.name}|${tapa.name}`;
    const g = grupos.get(clave) ?? { cara, tapa, lugares: [] };
    g.lugares.push({ x, z });
    grupos.set(clave, g);
  }
  const material = (t: Tile): THREE.Material =>
    new THREE.MeshLambertMaterial({ map: textura(tileSuelto(imagenes, t, tam)) });
  const geometria = new THREE.BoxGeometry(1, c.alto, 1);
  const molde = new THREE.Object3D();
  const color = new THREE.Color();
  for (const { cara, tapa, lugares } of grupos.values()) {
    const lado = material(cara);
    // Orden de las caras de una caja: +x, -x, arriba, abajo, +z (la que ve la cámara) y -z.
    const malla = new THREE.InstancedMesh(
      geometria,
      [lado, lado, material(tapa), lado, lado, lado],
      lugares.length,
    );
    lugares.forEach(({ x, z }, i) => {
      molde.position.set(x + 0.5, c.alto / 2, z + 0.5);
      molde.updateMatrix();
      malla.setMatrixAt(i, molde.matrix);
      const v = 1 - c.tono + azar() * c.tono * 2;
      malla.setColorAt(i, color.setRGB(v, v, v));
    });
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupo.add(malla);
  }
  return { grupo, sombras: [] };
}
