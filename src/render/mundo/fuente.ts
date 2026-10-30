import * as THREE from 'three';
import type { Hd2dJson } from '../../core/types';
import { ajustarPixelArt } from './texturas';

type AjustesFuente = Hd2dJson['fuente'];

const BASE = import.meta.env.BASE_URL;
const CARAS = 28;

/** Textura de `public/assets/sprites/fuente/` (recortes de la imagen de referencia), que se repite sin costuras. */
function cargar(nombre: string, repetirX: number, repetirY: number): THREE.Texture {
  const tex = new THREE.TextureLoader().load(`${BASE}assets/sprites/fuente/${nombre}.png`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetirX, repetirY);
  ajustarPixelArt(tex);
  return tex;
}

/** Rayas verticales claras sobre transparente: el agua que cae de un piso a otro. */
function texturaCascada(): THREE.Texture {
  const lienzo = document.createElement('canvas');
  lienzo.width = 8;
  lienzo.height = 32;
  const ctx = lienzo.getContext('2d')!;
  for (let y = 0; y < 32; y++) {
    ctx.fillStyle = y % 8 < 4 ? '#e4f6ff' : '#7cc4f0';
    ctx.fillRect(2 + (y % 3 === 0 ? 1 : 0), y, 4, 1);
  }
  const tex = new THREE.CanvasTexture(lienzo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  ajustarPixelArt(tex);
  return tex;
}

const perfil = (puntos: number[][]): THREE.Vector2[] =>
  puntos.map(([r = 0, y = 0]) => new THREE.Vector2(r, y));

/**
 * Fuente de tres pisos de piedra, con agua que brilla y cae de uno a otro, nenúfares sobre el agua y chispas
 * que suben de la taza. Las texturas salen de la imagen de referencia (ver tools/generadores/entorno/fuente_texturas.py).
 * El origen es el centro de su base en el suelo; los pisos son elipses de semiejes `radioX` y `radioZ`.
 */
export function crearFuente(
  a: AjustesFuente,
  azar: () => number,
  tamPunto: number,
): { grupo: THREE.Group; actualizar: (tiempo: number) => void } {
  const grupo = new THREE.Group();
  // Los pisos se estiran a lo alto: vista desde arriba, la fuente se leía como una piscina baja.
  grupo.scale.y = 1.4;
  const piedra = new THREE.MeshLambertMaterial({
    map: cargar('piedra', 4, 1),
    side: THREE.DoubleSide,
  });
  const borde = new THREE.MeshLambertMaterial({
    map: cargar('piedra', 3, 3),
    side: THREE.DoubleSide,
  });
  const texAgua = cargar('agua', 3, 2);
  // Sin luz propia: el agua brilla siempre (el bloom la recoge) y no pide una luz más a la sala.
  const agua = new THREE.MeshBasicMaterial({ map: texAgua });
  const rx = a.radioX;
  const rz = a.radioZ;

  const poner = (malla: THREE.Mesh, x = 0, y = 0, z = 0, sombra = true): THREE.Mesh => {
    malla.position.set(x, y, z);
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    grupo.add(malla);
    return malla;
  };
  /** Un piso: pared por fuera y por dentro, borde plano arriba y agua. Devuelve la altura del agua. */
  const piso = (radio: number, suelo: number, techo: number, hondo: number): number => {
    const pared = poner(
      new THREE.Mesh(
        new THREE.LatheGeometry(
          perfil([
            [radio, suelo],
            [radio, techo],
          ]),
          CARAS,
        ),
        piedra,
      ),
    );
    const dentro = poner(
      new THREE.Mesh(
        new THREE.LatheGeometry(
          perfil([
            [radio * 0.86, techo],
            [radio * 0.86, techo - hondo],
          ]),
          CARAS,
        ),
        piedra,
      ),
    );
    const anillo = poner(
      new THREE.Mesh(new THREE.RingGeometry(radio * 0.86, radio, CARAS, 1), borde),
      0,
      techo,
    );
    anillo.rotation.x = -Math.PI / 2;
    const alturaAgua = techo - hondo * 0.8;
    const lamina = poner(
      new THREE.Mesh(new THREE.CircleGeometry(radio * 0.86, CARAS), agua),
      0,
      alturaAgua,
      0,
      false,
    );
    lamina.rotation.x = -Math.PI / 2;
    for (const m of [pared, dentro, anillo, lamina]) m.scale.set(rx, 1, rz);
    return alturaAgua;
  };
  // Cada piso arranca por debajo del agua del anterior (y la columna, del agua del piso), para que se vean unidos
  const aguaA = piso(1, 0, 0.36, 0.08);
  const aguaB = piso(0.58, 0.1, 0.64, 0.07);

  // Columna y taza de arriba
  const columna = poner(
    new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.52, 10), piedra),
    0,
    0.69,
    0,
  );
  columna.scale.set(rx * 0.9, 1, rz * 0.9);
  const taza = poner(
    new THREE.Mesh(
      new THREE.LatheGeometry(
        perfil([
          [0.08, 0],
          [0.28, 0.06],
          [0.33, 0.12],
          [0.28, 0.12],
          [0, 0.07],
        ]),
        CARAS,
      ),
      piedra,
    ),
    0,
    0.9,
    0,
  );
  taza.scale.set(rx * 0.85, 1, rz * 0.85);
  const aguaC = 0.99;
  const laminaC = poner(
    new THREE.Mesh(new THREE.CircleGeometry(0.27, 20), agua),
    0,
    aguaC,
    0,
    false,
  );
  laminaC.rotation.x = -Math.PI / 2;
  laminaC.scale.set(rx * 0.85, 1, rz * 0.85);

  // Cascadas: de la taza al piso de en medio y de este al de abajo; las rayas bajan sin parar.
  const texCascada = texturaCascada();
  texCascada.repeat.set(1, 3);
  const materialCascada = new THREE.MeshBasicMaterial({
    map: texCascada,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cascada = (radio: number, de: number, abajo: number, n: number, giro: number): void => {
    for (let i = 0; i < n; i++) {
      const ang = giro + (i / n) * Math.PI * 2;
      const alto = de - abajo;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, alto), materialCascada);
      m.position.set(Math.cos(ang) * radio * rx, abajo + alto / 2, Math.sin(ang) * radio * rz);
      m.rotation.y = -ang + Math.PI / 2;
      grupo.add(m);
    }
  };
  cascada(0.3, 1.0, aguaB, 4, Math.PI / 4);
  cascada(0.6, 0.64, aguaA, 6, 0.3);
  // Espuma donde un piso y la columna tocan el agua, y donde cae cada cascada: los pisos se ven unidos
  const materialEspuma = new THREE.MeshBasicMaterial({
    color: 0xcfefff,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const espuma = (dentro: number, fuera: number, y: number): void => {
    const m = new THREE.Mesh(new THREE.RingGeometry(dentro, fuera, CARAS, 1), materialEspuma);
    m.rotation.x = -Math.PI / 2;
    m.position.y = y + 0.006;
    m.scale.set(rx, 1, rz);
    grupo.add(m);
  };
  espuma(0.57, 0.66, aguaA);
  espuma(0.12, 0.2, aguaB);

  // Nenúfares tumbados sobre el agua de cada piso
  const materialNenufar = new THREE.MeshBasicMaterial({
    map: cargar('nenufar', 1, 1),
    transparent: true,
    alphaTest: 0.35,
  });
  const nenufar = (radio: number, ang: number, y: number, tam: number): void => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(tam, tam * 0.56), materialNenufar);
    m.rotation.set(-Math.PI / 2, 0, azar() * 6);
    m.position.set(Math.cos(ang) * radio * rx, y + 0.012, Math.sin(ang) * radio * rz);
    grupo.add(m);
  };
  for (const [radio, ang] of [
    [0.62, 0.5],
    [0.6, 2.2],
    [0.58, 3.9],
    [0.6, 5.3],
    [0.2, 1.0],
  ] as const) {
    nenufar(radio, ang, aguaA, 0.46);
  }
  nenufar(0.3, 0.9, aguaB, 0.36);
  nenufar(0.3, 3.5, aguaB, 0.36);
  nenufar(0, 0, aguaC, 0.3);

  // Chispas azules que suben de la taza
  const posiciones = new Float32Array(a.gotas * 3);
  const geoGotas = new THREE.BufferGeometry();
  geoGotas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  grupo.add(
    new THREE.Points(
      geoGotas,
      new THREE.PointsMaterial({ color: 0xbfe8ff, size: tamPunto, sizeAttenuation: false }),
    ),
  );
  const angulos = Float32Array.from({ length: a.gotas }, () => azar() * Math.PI * 2);
  const fases = Float32Array.from({ length: a.gotas }, () => azar());

  return {
    grupo,
    actualizar: (tiempo) => {
      for (let i = 0; i < a.gotas; i++) {
        const t = (tiempo / (a.vidaGota * 4) + (fases[i] ?? 0)) % 1;
        const ang = angulos[i] ?? 0;
        posiciones[i * 3] = Math.cos(ang) * (0.1 + 0.35 * t) * rx;
        posiciones[i * 3 + 1] = 1.05 + 0.8 * t;
        posiciones[i * 3 + 2] = Math.sin(ang) * (0.1 + 0.35 * t) * rz;
      }
      geoGotas.attributes.position!.needsUpdate = true;
      texAgua.offset.set(tiempo * 0.03, tiempo * 0.02);
      texCascada.offset.y = -tiempo * 1.2;
    },
  };
}
