// shortcut: modelo 3D de la fuente para el prototipo HD-2D; en la v2, cada objeto con relieve tendría el suyo.
import * as THREE from 'three';

export interface AjustesFuente {
  /** Semiejes del pilón (elíptico, como en el dibujo), en casillas. */
  radioX: number;
  radioZ: number;
  altoBorde: number;
  altoAgua: number;
  altoColumna: number;
  /** Colores de la paleta del arte: piedra (clara, media, oscura) y agua (honda, clara). */
  piedra: [number, number, number];
  agua: [number, number];
  /** Gotas que caen de la taza al pilón y segundos que tarda cada una. */
  gotas: number;
  vidaGota: number;
}

// Perfil del pilón (radio, alto) de dentro afuera, con radio 1; luego se estira en X y Z.
const BORDE = 0.82;

/** Pilón con borde, agua, columna, taza y gotas, con texturas pixeladas para que case con el resto. */
export function crearFuente(
  a: AjustesFuente,
  azar: () => number,
  tamPunto: number,
): { grupo: THREE.Group; actualizar: (tiempo: number) => void } {
  const grupo = new THREE.Group();
  const piedra = new THREE.MeshLambertMaterial({
    map: ruido(a.piedra, [0.25, 0.55, 0.2], azar, 8, 2),
    flatShading: true,
    // Las dos caras: el perfil del torno deja la de fuera del pilón mirando hacia dentro.
    side: THREE.DoubleSide,
  });
  const texAgua = ruido(a.agua, [0.92, 0.08], azar, 2, 2);
  const agua = new THREE.MeshPhongMaterial({
    map: texAgua,
    shininess: 60,
    specular: 0x88aadd,
    flatShading: true,
  });

  const pilon = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [BORDE - 0.02, 0],
        [BORDE, a.altoBorde],
        [0.91, a.altoBorde + 0.03],
        [1, a.altoBorde],
        [1.02, 0],
      ].map(([r = 0, y = 0]) => new THREE.Vector2(r, y)),
      20,
    ),
    piedra,
  );
  const lamina = new THREE.Mesh(new THREE.CircleGeometry(BORDE, 20), agua);
  lamina.rotation.x = -Math.PI / 2;
  lamina.position.y = a.altoAgua;
  for (const m of [pilon, lamina]) {
    m.scale.set(a.radioX, 1, a.radioZ);
    grupo.add(m);
  }

  const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, a.altoColumna, 8), piedra);
  columna.position.y = a.altoAgua + a.altoColumna / 2;
  const arriba = a.altoAgua + a.altoColumna;
  const taza = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [0.08, 0],
        [0.26, 0.07],
        [0.31, 0.13],
        [0.27, 0.12],
        [0, 0.08],
      ].map(([r = 0, y = 0]) => new THREE.Vector2(r, y)),
      14,
    ),
    piedra,
  );
  taza.position.y = arriba;
  const surtidor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), piedra);
  surtidor.position.y = arriba + 0.14;
  const aguaTaza = new THREE.Mesh(new THREE.CircleGeometry(0.26, 14), agua);
  aguaTaza.rotation.x = -Math.PI / 2;
  aguaTaza.position.y = arriba + 0.11;
  for (const m of [pilon, columna, taza, surtidor]) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
  grupo.add(columna, taza, aguaTaza, surtidor);

  // Gotas: salen del borde de la taza, se abren y caen al agua del pilón.
  const posiciones = new Float32Array(a.gotas * 3);
  const geoGotas = new THREE.BufferGeometry();
  geoGotas.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const gotas = new THREE.Points(
    geoGotas,
    new THREE.PointsMaterial({ color: a.agua[1], size: tamPunto, sizeAttenuation: false }),
  );
  grupo.add(gotas);
  const angulos = Float32Array.from({ length: a.gotas }, (_, i) => (i / a.gotas) * Math.PI * 2);
  const fases = Float32Array.from({ length: a.gotas }, () => azar());
  const salida = arriba + 0.13;
  const caida = (2 * (salida - a.altoAgua)) / (a.vidaGota * a.vidaGota);
  const abre = (BORDE * 0.75 - 0.31) / a.vidaGota;

  return {
    grupo,
    actualizar: (tiempo) => {
      for (let i = 0; i < a.gotas; i++) {
        const t = ((tiempo / a.vidaGota + (fases[i] ?? 0)) % 1) * a.vidaGota;
        const r = 0.31 + abre * t;
        const ang = angulos[i] ?? 0;
        posiciones[i * 3] = Math.cos(ang) * r;
        posiciones[i * 3 + 1] = salida - (caida * t * t) / 2;
        posiciones[i * 3 + 2] = Math.sin(ang) * r;
      }
      geoGotas.attributes.position!.needsUpdate = true;
      // El agua se mueve despacio para que brille distinto.
      texAgua.offset.set(tiempo * 0.03, tiempo * 0.02);
    },
  };
}

/** Textura pequeña de píxeles de la paleta, al azar con los pesos dados, para dar grano de pixel art. */
function ruido(
  colores: readonly number[],
  pesos: readonly number[],
  azar: () => number,
  repetirX: number,
  repetirY: number,
): THREE.CanvasTexture {
  const lado = 16;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      let r = azar();
      let i = 0;
      while (i < pesos.length - 1 && r >= (pesos[i] ?? 0)) r -= pesos[i++] ?? 0;
      ctx.fillStyle = `#${(colores[i] ?? 0).toString(16).padStart(6, '0')}`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(lienzo);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetirX, repetirY);
  return tex;
}
