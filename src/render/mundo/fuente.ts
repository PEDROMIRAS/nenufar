import * as THREE from 'three';
import type { Hd2dJson } from '../../core/types';
import { ajustarPixelArt } from './texturas';

type AjustesFuente = Hd2dJson['fuente'];

const BASE = import.meta.env.BASE_URL;
const CARAS = 28;
/** Luz propia de la piedra: sin ella, la pared que da a la sombra se ve negra. */
const LUZ_PIEDRA = 0x2a3048;
/** Altura de la taza de arriba, y de su agua. */
const ALTO_TAZA = 1.08;

/** Textura de `public/assets/sprites/fuente/` (recortes de la imagen de referencia), que se repite sin costuras. */
function cargar(nombre: string, repetirX: number, repetirY: number): THREE.Texture {
  const tex = new THREE.TextureLoader().load(`${BASE}assets/sprites/fuente/${nombre}.png`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetirX, repetirY);
  // Como ajustarPixelArt, pero sin marcarla para actualizar: la imagen todavía no ha cargado
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
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
    map: cargar('piedra', 8, 1),
    emissive: LUZ_PIEDRA,
    side: THREE.DoubleSide,
  });
  const borde = new THREE.MeshLambertMaterial({
    map: cargar('piedra', 0.5, 0.5),
    emissive: LUZ_PIEDRA,
  });
  const juntas = new THREE.MeshLambertMaterial({ color: 0x1c1e2c });
  const piedraTaza = new THREE.MeshLambertMaterial({
    map: cargar('piedra', 10, 0.3),
    emissive: LUZ_PIEDRA,
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
  /** El borde de un piso: piedras sueltas alrededor, cada una de su alto y su tono, como en la imagen de referencia. */
  const bordeDePiedras = (radio: number, techo: number): void => {
    const n = Math.round(14 + radio * 16);
    const piedras = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), borde, n);
    const molde = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const ang = ((i + 0.5) / n) * Math.PI * 2;
      const tx = -rx * Math.sin(ang);
      const tz = rz * Math.cos(ang);
      const largo = (Math.hypot(tx, tz) * Math.PI * 2 * radio * 0.93) / n;
      const grueso = 0.15 * radio * Math.hypot(rx * Math.cos(ang), rz * Math.sin(ang));
      const alto = 0.05 + azar() * 0.035;
      molde.position.set(
        Math.cos(ang) * radio * 0.93 * rx,
        techo + alto / 2,
        Math.sin(ang) * radio * 0.93 * rz,
      );
      molde.rotation.set(0, -Math.atan2(tz, tx), 0);
      molde.scale.set(largo * 0.92, alto, grueso);
      molde.updateMatrix();
      piedras.setMatrixAt(i, molde.matrix);
      const tono = 0.78 + azar() * 0.4;
      piedras.setColorAt(i, color.setRGB(tono, tono, tono));
    }
    piedras.receiveShadow = true;
    grupo.add(piedras);
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
      new THREE.Mesh(new THREE.RingGeometry(radio * 0.86, radio, CARAS, 1), juntas),
      0,
      techo,
    );
    anillo.rotation.x = -Math.PI / 2;
    bordeDePiedras(radio, techo);
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
  const aguaB = piso(0.63, 0.1, 0.64, 0.07);

  // Columna y taza de arriba
  const columna = poner(
    new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, ALTO_TAZA - 0.43, 10), piedra),
    0,
    0.43 + (ALTO_TAZA - 0.43) / 2,
    0,
  );
  columna.scale.set(rx * 0.9, 1, rz * 0.9);
  const taza = poner(
    new THREE.Mesh(
      new THREE.LatheGeometry(
        perfil([
          [0.06, 0],
          [0.2, 0.05],
          [0.25, 0.1],
          [0.21, 0.1],
          [0, 0.06],
        ]),
        CARAS,
      ),
      piedraTaza,
    ),
    0,
    ALTO_TAZA,
    0,
  );
  taza.scale.set(rx, 1, rz);
  const aguaC = ALTO_TAZA + 0.085;
  const laminaC = poner(
    new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), agua),
    0,
    aguaC,
    0,
    false,
  );
  laminaC.rotation.x = -Math.PI / 2;
  laminaC.scale.set(rx, 1, rz);

  // Cascadas: de la taza al piso de en medio y de este al de abajo; las rayas bajan sin parar.
  const texCascada = texturaCascada();
  texCascada.repeat.set(1, 3);
  const materialCascada = new THREE.MeshBasicMaterial({
    map: texCascada,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cascada = (
    radio: number,
    de: number,
    abajo: number,
    n: number,
    giro: number,
    ancho: number,
  ): void => {
    for (let i = 0; i < n; i++) {
      const ang = giro + (i / n) * Math.PI * 2;
      const alto = de - abajo;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), materialCascada);
      m.position.set(Math.cos(ang) * radio * rx, abajo + alto / 2, Math.sin(ang) * radio * rz);
      m.rotation.y = -ang + Math.PI / 2;
      grupo.add(m);
    }
  };
  cascada(0.25, ALTO_TAZA + 0.1, aguaB, 4, Math.PI / 4, 0.06);
  cascada(0.64, 0.64, aguaA, 8, 0.2, 0.07);

  // Nenúfares con volumen: hojas planas sobre el agua y, encima, dos coronas de pétalos y los pistilos
  const hoja = new THREE.MeshLambertMaterial({
    color: 0x3b44b8,
    emissive: 0x161c60,
    side: THREE.DoubleSide,
  });
  const petalo = new THREE.MeshLambertMaterial({
    color: 0x9a52e0,
    emissive: 0x3a1478,
    side: THREE.DoubleSide,
  });
  const petaloInterior = new THREE.MeshLambertMaterial({
    color: 0xc47af0,
    emissive: 0x581c98,
    side: THREE.DoubleSide,
  });
  const pistilo = new THREE.MeshBasicMaterial({ color: 0xffa878 });
  const forma = new THREE.SphereGeometry(1, 10, 6);
  const pieza = (
    padre: THREE.Group,
    material: THREE.Material,
    ang: number,
    [largo, ancho, alto]: [number, number, number],
    dist: number,
    subida: number,
    inclina: number,
  ): void => {
    const pivote = new THREE.Group();
    pivote.rotation.y = ang;
    pivote.position.y = subida;
    const m = new THREE.Mesh(forma, material);
    m.scale.set(largo, alto, ancho);
    m.position.x = dist;
    m.rotation.z = inclina;
    pivote.add(m);
    padre.add(pivote);
  };
  const nenufar = (radio: number, ang: number, y: number, tam: number): void => {
    const flor = new THREE.Group();
    flor.position.set(Math.cos(ang) * radio * rx, y + 0.01, Math.sin(ang) * radio * rz);
    flor.scale.setScalar(tam);
    const giro = azar() * 6;
    for (let i = 0; i < 6; i++) {
      pieza(flor, hoja, giro + (i * Math.PI) / 3, [0.2, 0.075, 0.012], 0.19, 0.005, 0.06);
    }
    for (let i = 0; i < 7; i++) {
      pieza(
        flor,
        petalo,
        giro + 0.4 + (i * Math.PI * 2) / 7,
        [0.1, 0.042, 0.03],
        0.07,
        0.035,
        0.75,
      );
    }
    for (let i = 0; i < 5; i++) {
      pieza(
        flor,
        petaloInterior,
        giro + (i * Math.PI * 2) / 5,
        [0.08, 0.034, 0.026],
        0.035,
        0.07,
        1.2,
      );
    }
    for (const [x, z] of [
      [0, 0],
      [0.022, 0.01],
      [-0.018, -0.014],
    ] as const) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 4), pistilo);
      m.position.set(x, 0.16, z);
      flor.add(m);
    }
    grupo.add(flor);
  };
  for (const [radio, ang] of [
    [0.76, 0.5],
    [0.76, 2.2],
    [0.76, 3.9],
    [0.76, 5.3],
  ] as const) {
    nenufar(radio, ang, aguaA, 0.62);
  }
  nenufar(0.22, 0.9, aguaB, 0.46);
  nenufar(0.22, 3.5, aguaB, 0.46);
  nenufar(0, 0, aguaC, 0.34);

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
        posiciones[i * 3 + 1] = ALTO_TAZA + 0.2 + 0.8 * t;
        posiciones[i * 3 + 2] = Math.sin(ang) * (0.1 + 0.35 * t) * rz;
      }
      geoGotas.attributes.position!.needsUpdate = true;
      texAgua.offset.set(tiempo * 0.03, tiempo * 0.02);
      texCascada.offset.y = -tiempo * 1.2;
    },
  };
}
