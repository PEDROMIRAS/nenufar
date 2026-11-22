import * as THREE from 'three';
import { escalaHoja } from '../../core/hoja';
import type { Direccion, Hd2dJson } from '../../core/types';
import { PALETA } from '../marco';
import type { Sprite } from '../recursos';
import { FAMILIA } from '../texto';
import { ajustarPixelArt, texturaNormales } from './texturas';

/** Píxeles de una casilla (el tileSize de todos los tilesets): una unidad del mundo. */
export const TAM = 32;

/** Un sprite de pie (heroína o monstruo) con su hoja de animaciones; el fotograma se elige moviendo la textura. */
export interface Actor {
  malla: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  tex: THREE.Texture;
  sprite: Sprite;
  columnas: number;
  filas: number;
  /** El «¡!» o el «?» sobre la cabeza (hijo de la malla); null si este actor no lleva signos. */
  signo: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null;
}

/** Cómo se ponen de pie los sprites: cuánto se echan atrás (radianes) y cuánto se estiran para conservar su alto. */
export interface Pie {
  giro: number;
  estirar: number;
}

/** Texturas del «¡!» y el «?», hechas una vez y compartidas por todos los signos. */
export interface TexturasSigno {
  alerta: THREE.Texture;
  perdido: THREE.Texture;
}

/** Lado del signo, en casillas, y cuánto queda por encima de la cabeza. */
const SIGNO = { lado: 0.5, sobre: 0.15 };

export const crearTexturasSigno = (): TexturasSigno => ({
  alerta: texturaSigno('¡!', PALETA.peligro),
  perdido: texturaSigno('?', PALETA.claro),
});

/** Un sprite de pie con la hoja `sprite`, sin colocar en ninguna sala; con `relieve`, mapa de normales en calidad alta. */
export function crearActor(
  sprite: Sprite,
  pie: Pie,
  relieve: Hd2dJson['relieve'],
  alta: boolean,
): Actor {
  const tam = TAM * escalaHoja(sprite.datos); // píxeles de la hoja por casilla
  const { frameWidth, frameHeight, anchor } = sprite.datos;
  const tex = new THREE.Texture(sprite.imagen as HTMLImageElement);
  ajustarPixelArt(tex);
  const img = sprite.imagen as HTMLImageElement;
  const columnas = (img.naturalWidth || img.width) / frameWidth;
  const filas = (img.naturalHeight || img.height) / frameHeight;
  tex.repeat.set(1 / columnas, 1 / filas);
  const material = new THREE.MeshLambertMaterial({
    map: tex,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  if (relieve) {
    // El mapa de normales se calcula solo cuando hace falta (en calidad baja, nunca) y de la hoja que lleve el
    // actor en ese momento (la heroína cambia de hoja al vestirse).
    material.userData.hacerRelieve = (): THREE.Texture => {
      const normales = texturaNormales(sprite.imagen as HTMLImageElement, relieve);
      normales.repeat.set(1 / columnas, 1 / filas);
      return normales;
    };
    material.normalScale.set(relieve.escala, relieve.escala);
    ponerRelieve(material, alta);
  }
  const malla = carton(
    material,
    frameWidth / tam,
    frameHeight / tam,
    (frameHeight - anchor.y) / tam,
    (frameWidth / 2 - anchor.x) / tam,
  );
  malla.rotation.x = -pie.giro;
  malla.scale.y = pie.estirar;
  return { malla, tex, sprite, columnas, filas, signo: null };
}

/** Da al actor un signo («¡!» o «?») sobre la cabeza, oculto hasta que se pida con `colocarSigno`. */
export function crearSigno(a: Actor, texturas: TexturasSigno): void {
  if (a.signo) return;
  const { anchor } = a.sprite.datos;
  const tam = TAM * escalaHoja(a.sprite.datos);
  const signo = new THREE.Mesh(
    new THREE.PlaneGeometry(SIGNO.lado, SIGNO.lado),
    new THREE.MeshBasicMaterial({
      map: texturas.alerta,
      transparent: true,
      depthWrite: false,
    }),
  );
  // La malla del actor tiene el origen en los pies: la cabeza queda `anchor.y` píxeles de hoja más arriba.
  signo.position.y = anchor.y / tam + SIGNO.sobre + SIGNO.lado / 2;
  signo.visible = false;
  a.malla.add(signo);
  a.signo = signo;
}

/** Enseña (o esconde, con `tipo` null) el signo del actor con ese tamaño y opacidad. */
export function colocarSigno(
  a: Actor,
  texturas: TexturasSigno,
  tipo: 'alerta' | 'perdido' | null,
  escala: number,
  opacidad: number,
): void {
  const s = a.signo;
  if (!s) return;
  s.visible = tipo !== null && opacidad > 0;
  if (!tipo || !s.visible) return;
  const tex = texturas[tipo];
  if (s.material.map !== tex) s.material.map = tex;
  s.material.opacity = opacidad;
  s.scale.set(escala, escala, 1);
}

/** Coloca un actor con los pies en (x, y) píxeles del juego y el fotograma de `animacion` a los `tiempo` segundos. */
export function colocarActor(
  a: Actor,
  x: number,
  y: number,
  animacion: string,
  direccion: Direccion,
  tiempo: number,
): void {
  a.malla.position.set(x / TAM, 0, y / TAM);
  const anim = a.sprite.datos.animations[animacion];
  if (!anim) return;
  const n = Math.floor(tiempo * anim.fps);
  const columna = anim.startColumn + (anim.loop ? n % anim.frames : Math.min(n, anim.frames - 1));
  a.tex.offset.set(columna / a.columnas, 1 - (a.sprite.datos.directions[direccion] + 1) / a.filas);
  a.malla.material.normalMap?.offset.copy(a.tex.offset);
}

/** Plano de `ancho` × `alto` casillas con el origen `pie` casillas por encima de su borde inferior; `dx` lo corre a la derecha. */
export function carton<M extends THREE.MeshLambertMaterial | THREE.MeshBasicMaterial>(
  material: M,
  ancho: number,
  alto: number,
  pie: number,
  dx = 0,
): THREE.Mesh<THREE.PlaneGeometry, M> {
  const geometria = new THREE.PlaneGeometry(ancho, alto);
  geometria.translate(dx, alto / 2 - pie, 0);
  const plano = new THREE.Mesh(geometria, material);
  plano.castShadow = true;
  return plano;
}

/** Textura de un signo («¡!» o «?»): letra gruesa del color pedido con contorno oscuro, en píxeles nítidos. */
function texturaSigno(texto: string, color: string): THREE.Texture {
  const lienzo = document.createElement('canvas');
  lienzo.width = 32;
  lienzo.height = 32;
  const ctx = lienzo.getContext('2d')!;
  ctx.font = `bold 26px ${FAMILIA}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#08040c';
  ctx.strokeText(texto, 16, 17);
  ctx.fillStyle = color;
  ctx.fillText(texto, 16, 17);
  const tex = new THREE.CanvasTexture(lienzo);
  ajustarPixelArt(tex);
  return tex;
}

/**
 * Pone o quita el relieve de un material: el bump del suelo (`userData.relieve`, su propio dibujo) o el mapa de
 * normales de un sprite, que se calcula la primera vez que se pone (`userData.hacerRelieve`). Sin ninguno, nada.
 */
export function ponerRelieve(m: THREE.MeshLambertMaterial, alta: boolean): void {
  let relieve = m.userData.relieve as THREE.Texture | undefined;
  const hacer = m.userData.hacerRelieve as (() => THREE.Texture) | undefined;
  if (!relieve && alta && hacer) relieve = m.userData.relieve = hacer();
  if (!relieve) return;
  const esSuelo = relieve === m.map;
  const actual = esSuelo ? m.bumpMap : m.normalMap;
  const nuevo = alta ? relieve : null;
  if (actual === nuevo) return;
  if (esSuelo) m.bumpMap = nuevo;
  else m.normalMap = nuevo;
  m.needsUpdate = true;
}

/** Suelta el mapa de normales calculado de un sprite (se rehará si hace falta); el bump del suelo es su dibujo. */
export function quitarRelieve(m: THREE.MeshLambertMaterial): void {
  const relieve = m.userData.relieve as THREE.Texture | undefined;
  if (!relieve || relieve === m.map) return;
  relieve.dispose();
  delete m.userData.relieve;
  if (m.normalMap) {
    m.normalMap = null;
    m.needsUpdate = true;
  }
}
