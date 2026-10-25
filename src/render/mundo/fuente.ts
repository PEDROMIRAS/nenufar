import * as THREE from 'three';
import type { Hd2dJson } from '../../core/types';
import { ruido } from './texturas';

type AjustesFuente = Hd2dJson['fuente'];

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
    new THREE.PointsMaterial({
      color: a.agua[1] ?? a.agua[0],
      size: tamPunto,
      sizeAttenuation: false,
    }),
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
