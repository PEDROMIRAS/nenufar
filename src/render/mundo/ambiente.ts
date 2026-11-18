import * as THREE from 'three';
import type { Elemento } from './elementos';

/**
 * Fuentes de luz de ambiente para las salas que no tienen ninguna: algo visible que justifique la luz puntual que
 * las acompaña (sus datos, en `luces` de hd2d.json con el mismo nombre). Una por zona: luciérnagas en el Bosque, un
 * haz de luz en las Ruinas, un fuego fatuo en la Cripta y una grieta de brasa en el Cauce Seco.
 */
export type TipoAmbiente = 'luciernagas' | 'haz' | 'fuego_fatuo' | 'grieta';

type Azar = () => number;

/** El modelo de una fuente de ambiente, centrado en su casilla; `tamPunto` es el tamaño de las motas en píxeles. */
export function crearAmbiente(tipo: TipoAmbiente, azar: Azar, tamPunto: number): Elemento {
  switch (tipo) {
    case 'luciernagas':
      return luciernagas(azar, tamPunto);
    case 'haz':
      return haz(azar, tamPunto);
    case 'fuego_fatuo':
      return fuegoFatuo(azar);
    case 'grieta':
      return grieta(azar, tamPunto);
  }
}

/** Motas que flotan alrededor de un punto: posiciones en un BufferAttribute que se reescribe sin crear nada. */
function motas(
  n: number,
  color: number,
  tamPunto: number,
  azar: Azar,
  mover: (i: number, t: number, fase: number, salida: Float32Array) => void,
): { puntos: THREE.Points; actualizar: (t: number) => void } {
  const pos = new Float32Array(n * 3);
  const fases = Float32Array.from({ length: n }, () => azar() * Math.PI * 2);
  const geo = new THREE.BufferGeometry();
  const atributo = new THREE.BufferAttribute(pos, 3);
  geo.setAttribute('position', atributo);
  const puntos = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size: tamPunto,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const actualizar = (t: number): void => {
    for (let i = 0; i < n; i++) mover(i, t, fases[i]!, pos);
    atributo.needsUpdate = true;
  };
  actualizar(0);
  return { puntos, actualizar };
}

/** Lienzo con un degradado radial (resplandor) del color dado. */
function resplandor(color: string): THREE.Texture {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(lienzo);
}

function luciernagas(azar: Azar, tamPunto: number): Elemento {
  const grupo = new THREE.Group();
  const { puntos, actualizar } = motas(12, 0xd8ff6a, tamPunto * 1.5, azar, (i, t, f, p) => {
    const r = 0.35 + 0.25 * Math.sin(f * 3);
    p[i * 3] = Math.sin(t * 0.6 + f) * r;
    p[i * 3 + 1] = 0.45 + 0.3 * Math.sin(t * 0.9 + f * 2);
    p[i * 3 + 2] = Math.cos(t * 0.5 + f * 1.3) * r;
  });
  grupo.add(puntos);
  const material = puntos.material as THREE.PointsMaterial;
  return {
    grupo,
    actualizar: (t) => {
      actualizar(t);
      material.opacity = 0.65 + 0.35 * Math.sin(t * 3.1);
    },
  };
}

function haz(azar: Azar, tamPunto: number): Elemento {
  const grupo = new THREE.Group();
  // Un cono de luz abierto que baja desde arriba, algo inclinado, y su mancha en el suelo.
  const cono = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.75, 3.2, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffe2a8,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  cono.position.y = 1.6;
  cono.rotation.z = 0.18;
  const mancha = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 24),
    new THREE.MeshBasicMaterial({
      map: resplandor('rgba(255,226,168,0.55)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mancha.rotation.x = -Math.PI / 2;
  mancha.position.y = 0.02;
  // Polvo que cae despacio dentro del haz.
  const { puntos, actualizar } = motas(16, 0xfff0c8, tamPunto, azar, (i, t, f, p) => {
    const y = 2.4 - ((t * 0.15 + f / (Math.PI * 2)) % 1) * 2.4;
    p[i * 3] = Math.sin(f * 5) * 0.35 + y * 0.18;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = Math.cos(f * 7) * 0.3;
  });
  grupo.add(cono, mancha, puntos);
  const conoMaterial = cono.material;
  return {
    grupo,
    actualizar: (t) => {
      actualizar(t);
      conoMaterial.opacity = 0.09 + 0.02 * Math.sin(t * 0.7);
    },
  };
}

function fuegoFatuo(azar: Azar): Elemento {
  const grupo = new THREE.Group();
  const nucleo = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xe8d0ff }),
  );
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: resplandor('rgba(180,120,255,0.9)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  halo.scale.set(0.7, 0.7, 1);
  const llama = new THREE.Group();
  llama.add(nucleo, halo);
  grupo.add(llama);
  const fase = azar() * Math.PI * 2;
  return {
    grupo,
    actualizar: (t) => {
      llama.position.set(
        Math.sin(t * 0.5 + fase) * 0.3,
        0.7 + Math.sin(t * 1.3 + fase) * 0.12,
        Math.cos(t * 0.4 + fase) * 0.2,
      );
      const s = 0.65 + 0.1 * Math.sin(t * 4 + fase);
      halo.scale.set(s, s, 1);
    },
  };
}

function grieta(azar: Azar, tamPunto: number): Elemento {
  const grupo = new THREE.Group();
  // Grietas dibujadas a mano alzada desde el centro, en naranja de brasa.
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d')!;
  ctx.strokeStyle = '#ff8a3a';
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    let x = 32;
    let y = 32;
    let ang = azar() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      ang += (azar() - 0.5) * 1.2;
      x += Math.cos(ang) * 5;
      y += Math.sin(ang) * 5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(lienzo);
  tex.magFilter = THREE.NearestFilter;
  const placa = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.1),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  placa.rotation.x = -Math.PI / 2;
  placa.position.y = 0.02;
  // Brasas que suben y se apagan.
  const { puntos, actualizar } = motas(8, 0xffa040, tamPunto, azar, (i, t, f, p) => {
    const k = (t * 0.4 + f / (Math.PI * 2)) % 1;
    p[i * 3] = Math.sin(f * 3) * 0.3;
    p[i * 3 + 1] = 0.05 + k * 0.9;
    p[i * 3 + 2] = Math.cos(f * 5) * 0.3;
  });
  grupo.add(placa, puntos);
  const material = placa.material;
  return {
    grupo,
    actualizar: (t) => {
      actualizar(t);
      material.opacity = 0.7 + 0.3 * Math.sin(t * 2.3);
    },
  };
}
