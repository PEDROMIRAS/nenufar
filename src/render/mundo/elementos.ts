import * as THREE from 'three';
import { ajustarPixelArt } from './texturas';

/** Un objeto común a todas las zonas hecho en 3D: su grupo (origen en el centro de su casilla, en el suelo) y su animación. */
export interface Elemento {
  grupo: THREE.Group;
  actualizar?: (tiempo: number) => void;
}

type Azar = () => number;

/** Textura de píxeles dibujada por `pintor` en un lienzo de `ancho`×`alto`, sin suavizado y repetible. */
function dibujar(
  ancho: number,
  alto: number,
  pintor: (ctx: CanvasRenderingContext2D) => void,
  repetirX = 1,
  repetirY = 1,
): THREE.CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  pintor(lienzo.getContext('2d')!);
  const tex = new THREE.CanvasTexture(lienzo);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repetirX, repetirY);
  ajustarPixelArt(tex);
  return tex;
}

const MADERA = ['#4e3020', '#764c2e', '#a06e40', '#c4925a'];
const METAL = ['#262a36', '#3e4454', '#6a7388', '#a8b2c8'];
const ORO = ['#8c6226', '#cea23e', '#f6d678'];
const PIEDRA = ['#3a3e4c', '#5a5f70', '#80869a', '#aab0c0'];
const MORADO = ['#2e124c', '#6028a0', '#a460ec', '#e6ccff'];

/** Tablones de madera con vetas, juntas oscuras y clavos. */
function texturaMadera(azar: Azar): THREE.CanvasTexture {
  return dibujar(64, 32, (ctx) => {
    ctx.fillStyle = MADERA[1]!;
    ctx.fillRect(0, 0, 64, 32);
    for (let t = 0; t < 4; t++) {
      const x0 = t * 16;
      ctx.fillStyle = t % 2 ? MADERA[1]! : MADERA[2]!;
      ctx.fillRect(x0, 0, 15, 32);
      for (let v = 0; v < 9; v++) {
        ctx.fillStyle = azar() < 0.5 ? MADERA[0]! : MADERA[3]!;
        ctx.fillRect(
          x0 + 1 + Math.floor(azar() * 13),
          Math.floor(azar() * 28),
          1,
          2 + Math.floor(azar() * 5),
        );
      }
      ctx.fillStyle = MADERA[0]!;
      ctx.fillRect(x0 + 15, 0, 1, 32);
      ctx.fillStyle = ORO[1]!;
      ctx.fillRect(x0 + 2, 2, 1, 1);
      ctx.fillRect(x0 + 12, 29, 1, 1);
    }
  });
}

/** Bloques de piedra con juntas, grietas y motas. */
function texturaPiedra(azar: Azar): THREE.CanvasTexture {
  return dibujar(64, 32, (ctx) => {
    ctx.fillStyle = PIEDRA[1]!;
    ctx.fillRect(0, 0, 64, 32);
    for (let fila = 0; fila < 4; fila++) {
      const y = fila * 8;
      for (let b = 0; b < 4; b++) {
        const x = b * 16 + (fila % 2) * 8 - 8;
        ctx.fillStyle = [PIEDRA[1]!, PIEDRA[2]!, PIEDRA[0]!][Math.floor(azar() * 3)]!;
        ctx.fillRect(x + 1, y + 1, 14, 6);
        ctx.fillStyle = PIEDRA[3]!;
        ctx.fillRect(x + 1, y + 1, 14, 1);
        ctx.fillStyle = PIEDRA[0]!;
        ctx.fillRect(x, y, 1, 8);
        ctx.fillRect(x, y + 7, 16, 1);
      }
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = azar() < 0.5 ? PIEDRA[0]! : PIEDRA[3]!;
      ctx.fillRect(Math.floor(azar() * 64), Math.floor(azar() * 32), 1, 1);
    }
  });
}

/** Remolino morado de píxeles (como el del sprite del portal): espiral de tres brazos con el centro claro. */
function texturaRemolino(): THREE.CanvasTexture {
  const lado = 64;
  return dibujar(lado, lado, (ctx) => {
    const datos = ctx.createImageData(lado, lado);
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        const dx = (x + 0.5 - lado / 2) / (lado / 2);
        const dy = (y + 0.5 - lado / 2) / (lado / 2);
        const r = Math.hypot(dx, dy);
        const brazo = (Math.sin(Math.atan2(dy, dx) * 3 + r * 9) + 1) / 2;
        const color =
          r < 0.07
            ? MORADO[3]!
            : r > 0.8
              ? MORADO[0]!
              : brazo < 0.45
                ? MORADO[1]!
                : brazo < 0.8
                  ? MORADO[2]!
                  : MORADO[3]!;
        const c = new THREE.Color(color);
        const i = (y * lado + x) * 4;
        datos.data[i] = Math.round(c.r * 255);
        datos.data[i + 1] = Math.round(c.g * 255);
        datos.data[i + 2] = Math.round(c.b * 255);
        datos.data[i + 3] = r <= 1 ? 255 : 0;
      }
    }
    ctx.putImageData(datos, 0, 0);
  });
}

/** Resplandor redondo que se apaga hacia fuera. */
function texturaResplandor(color: string): THREE.CanvasTexture {
  return dibujar(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

function malla(
  grupo: THREE.Object3D,
  geometria: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
  sombra = true,
): THREE.Mesh {
  const m = new THREE.Mesh(geometria, material);
  m.position.set(x, y, z);
  m.castShadow = sombra;
  m.receiveShadow = true;
  grupo.add(m);
  return m;
}

/**
 * Cofre de madera con la tapa abombada, tres flejes de hierro, esquineros y cerradura de oro. Abierto, la tapa
 * se echa hacia atrás y dentro se ve el tesoro.
 */
function cofre(abierto: boolean, azar: Azar): Elemento {
  const grupo = new THREE.Group();
  const madera = new THREE.MeshLambertMaterial({
    map: texturaMadera(azar),
    side: THREE.DoubleSide,
  });
  const hierro = new THREE.MeshLambertMaterial({ color: METAL[1], emissive: 0x10131c });
  const oro = new THREE.MeshLambertMaterial({ color: ORO[1], emissive: 0x4a3410 });
  const caja = new THREE.BoxGeometry(1, 1, 1);
  const ancho = 0.66;
  const hondo = 0.42;
  const alto = 0.3;

  malla(grupo, caja, madera, 0, alto / 2, 0).scale.set(ancho, alto, hondo);
  // Flejes alrededor del cuerpo y esquineros
  for (const x of [-0.22, 0.22])
    malla(grupo, caja, hierro, x, alto / 2, 0).scale.set(0.07, alto + 0.01, hondo + 0.02);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    malla(grupo, caja, hierro, (x * ancho) / 2, alto / 2, (z * hondo) / 2).scale.set(
      0.06,
      alto + 0.02,
      0.06,
    );
  }
  malla(grupo, caja, hierro, 0, 0.012, 0).scale.set(ancho + 0.03, 0.025, hondo + 0.03);

  // Tapa: medio cilindro tumbado a lo largo de X, que gira por su borde de atrás
  const tapa = new THREE.Group();
  tapa.position.set(0, alto, -hondo / 2);
  const radio = hondo / 2;
  const medio = new THREE.CylinderGeometry(radio, radio, ancho, 16, 1, false, 0, Math.PI);
  medio.rotateZ(Math.PI / 2);
  malla(tapa, medio, madera, 0, 0, radio);
  for (const x of [-0.22, 0.22]) {
    const fleje = new THREE.CylinderGeometry(
      radio + 0.012,
      radio + 0.012,
      0.07,
      16,
      1,
      true,
      0,
      Math.PI,
    );
    fleje.rotateZ(Math.PI / 2);
    const m = malla(tapa, fleje, hierro, x, 0, radio);
    (m.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
  }
  // Cerradura de oro en el frente de la tapa
  malla(tapa, caja, oro, 0, 0.1, hondo + 0.005).scale.set(0.1, 0.12, 0.03);
  malla(
    tapa,
    caja,
    new THREE.MeshBasicMaterial({ color: 0x1a1208 }),
    0,
    0.1,
    hondo + 0.022,
  ).scale.set(0.02, 0.05, 0.01);
  grupo.add(tapa);

  if (abierto) {
    tapa.rotation.x = -1.85;
    // Dentro: el fondo oscuro y un montón de monedas de oro que brillan
    malla(
      grupo,
      caja,
      new THREE.MeshBasicMaterial({ color: 0x1a1008 }),
      0,
      alto + 0.002,
      0,
      false,
    ).scale.set(ancho - 0.06, 0.004, hondo - 0.06);
    const moneda = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10);
    const brillo = new THREE.MeshBasicMaterial({ color: 0xffe28a });
    for (let i = 0; i < 14; i++) {
      const m = malla(
        grupo,
        moneda,
        i % 3 === 0 ? brillo : oro,
        (azar() - 0.5) * (ancho - 0.2),
        alto + 0.01 + azar() * 0.03,
        (azar() - 0.5) * (hondo - 0.16),
        false,
      );
      m.rotation.set((azar() - 0.5) * 0.7, azar() * 3, (azar() - 0.5) * 0.7);
    }
  }
  return { grupo };
}

/** Hoguera: anillo de piedras, brasas con troncos chamuscados y llama de tres capas que se agita, con chispas. */
function hoguera(azar: Azar, tamPunto: number): Elemento {
  const grupo = new THREE.Group();
  const piedra = new THREE.MeshLambertMaterial({ map: texturaPiedra(azar), color: 0x6a6a72 });
  const tronco = new THREE.MeshLambertMaterial({ color: 0x2a190e });
  const carbon = new THREE.MeshLambertMaterial({ color: 0x1e1612 });
  const brasa = new THREE.MeshBasicMaterial({ color: 0xff6a20 });
  const bola = new THREE.IcosahedronGeometry(1, 1);

  // Anillo de piedras de distinto tamaño
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + azar() * 0.2;
    const r = 0.1 + azar() * 0.05;
    const m = malla(grupo, bola, piedra, Math.cos(ang) * 0.3, r * 0.7, Math.sin(ang) * 0.3);
    m.scale.set(r * 1.2, r * 0.8, r);
    m.rotation.y = azar() * 6;
  }
  // Lecho de ceniza y brasas
  malla(grupo, new THREE.CylinderGeometry(0.26, 0.26, 0.03, 16), carbon, 0, 0.02, 0, false);
  for (let i = 0; i < 9; i++) {
    const ang = azar() * Math.PI * 2;
    const r = azar() * 0.2;
    malla(
      grupo,
      new THREE.SphereGeometry(0.018, 5, 4),
      brasa,
      Math.cos(ang) * r,
      0.045,
      Math.sin(ang) * r,
      false,
    );
  }
  // Troncos apoyados unos en otros
  const lena = new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.4;
    const m = malla(grupo, lena, tronco, Math.cos(ang) * 0.09, 0.14, Math.sin(ang) * 0.09);
    m.rotation.set(Math.sin(ang) * 0.7, 0, -Math.cos(ang) * 0.7);
  }

  // Llama: tres conos que se cuelan unos en otros, del naranja al blanco amarillento
  const colores = [0xff4a0c, 0xff9a2a, 0xfff2a8];
  const llamas = colores.map((color, i) => {
    const m = malla(
      grupo,
      new THREE.ConeGeometry(0.2 - i * 0.05, 0.72 - i * 0.16, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95 - i * 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      0,
      0.4 + i * 0.02,
      0,
      false,
    );
    return m;
  });

  // Chispas que suben y se apagan
  const n = 18;
  const posiciones = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  grupo.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffb040, size: tamPunto, sizeAttenuation: false }),
    ),
  );
  const fases = Float32Array.from({ length: n }, () => azar());
  const angulos = Float32Array.from({ length: n }, () => azar() * Math.PI * 2);

  return {
    grupo,
    actualizar: (t) => {
      llamas.forEach((m, i) => {
        const v = Math.sin(t * (9 + i * 3) + i * 2) * 0.12 + Math.sin(t * 17 + i) * 0.06;
        m.scale.set(1 - v * 0.6, 1 + v, 1 - v * 0.6);
        m.rotation.y = t * (0.8 + i * 0.5);
      });
      for (let i = 0; i < n; i++) {
        const p = (t * 0.45 + (fases[i] ?? 0)) % 1;
        const ang = angulos[i] ?? 0;
        posiciones[i * 3] = Math.cos(ang) * (0.05 + 0.12 * p) + Math.sin(t * 5 + i) * 0.03;
        posiciones[i * 3 + 1] = 0.35 + p * 0.7;
        posiciones[i * 3 + 2] = Math.sin(ang) * (0.05 + 0.12 * p);
      }
      geo.attributes.position!.needsUpdate = true;
    },
  };
}

/**
 * Portal: arco ovalado de piedra con runas sobre una peana, con un remolino morado que gira, un resplandor que
 * respira y chispas que giran alrededor.
 */
function portal(azar: Azar, tamPunto: number): Elemento {
  const grupo = new THREE.Group();
  const piedra = new THREE.MeshLambertMaterial({ map: texturaPiedra(azar), emissive: 0x181a26 });
  const runa = new THREE.MeshBasicMaterial({ color: 0xb480ff });
  const caja = new THREE.BoxGeometry(1, 1, 1);
  const alto = 0.66;
  const estirar = 1.2;

  // Peana de dos escalones
  malla(grupo, caja, piedra, 0, 0.04, 0).scale.set(1.0, 0.08, 0.46);
  malla(grupo, caja, piedra, 0, 0.11, 0).scale.set(0.84, 0.07, 0.38);
  // Arco: un toro vertical estirado, y dos pilares cortos a los lados que lo apoyan
  const arco = malla(grupo, new THREE.TorusGeometry(0.42, 0.09, 12, 36), piedra, 0, alto + 0.08, 0);
  arco.scale.set(1, estirar, 1.3);
  // Runas sobre el arco
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + 0.31;
    const m = malla(
      grupo,
      caja,
      runa,
      Math.cos(ang) * 0.42,
      alto + 0.08 + Math.sin(ang) * 0.42 * estirar,
      0.123,
      false,
    );
    m.scale.set(0.035, 0.07, 0.01);
    m.rotation.z = ang;
  }
  // Disco con el remolino
  const remolino = texturaRemolino();
  const disco = malla(
    grupo,
    new THREE.CircleGeometry(0.37, 36),
    new THREE.MeshBasicMaterial({ map: remolino, side: THREE.DoubleSide }),
    0,
    alto + 0.08,
    0,
    false,
  );
  disco.scale.set(1, estirar, 1);
  // Resplandor detrás del arco
  const resplandor = malla(
    grupo,
    new THREE.PlaneGeometry(1.6, 1.9),
    new THREE.MeshBasicMaterial({
      map: texturaResplandor('rgba(170,100,255,0.75)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    0,
    alto + 0.1,
    -0.12,
    false,
  );

  // Chispas moradas que giran alrededor del disco
  const n = 16;
  const posiciones = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  grupo.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xd8b8ff, size: tamPunto, sizeAttenuation: false }),
    ),
  );
  const fases = Float32Array.from({ length: n }, () => azar());

  return {
    grupo,
    actualizar: (t) => {
      disco.rotation.z = -t * 0.9;
      (resplandor.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 2.2) * 0.2;
      for (let i = 0; i < n; i++) {
        const ang = t * 0.7 + (fases[i] ?? 0) * Math.PI * 2;
        const r = 0.5 + Math.sin(t * 1.3 + i) * 0.06;
        posiciones[i * 3] = Math.cos(ang) * r;
        posiciones[i * 3 + 1] = alto + 0.08 + Math.sin(ang) * r * estirar;
        posiciones[i * 3 + 2] = 0.14;
      }
      geo.attributes.position!.needsUpdate = true;
    },
  };
}

/** El objeto común `nombre` (cofre, hoguera o portal) hecho en 3D, o null si no es uno de ellos. */
export function crearElemento(nombre: string, azar: Azar, tamPunto: number): Elemento | null {
  switch (nombre) {
    case 'cofre_cerrado':
      return cofre(false, azar);
    case 'cofre_abierto':
      return cofre(true, azar);
    case 'hoguera':
      return hoguera(azar, tamPunto);
    case 'portal':
      return portal(azar, tamPunto);
    default:
      return null;
  }
}
