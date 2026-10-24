// shortcut: charcos hundidos para el prototipo HD-2D; en la v2, igual para el agua y las fosas de cada zona.
import * as THREE from 'three';
import { ruido } from './fuente';

export interface AjustesCharcos {
  /** Cuánto bajan, en casillas, el agua y el fondo oscuro que se ve en la orilla. */
  nivel: number;
  fondo: number;
  /** Píxeles de orilla oscura entre el borde del suelo y el agua. */
  orilla: number;
  colorFondo: string;
  brillo: number;
}

/**
 * Hunde el agua: abre agujeros en el lienzo del suelo donde los tiles de agua pintan agua (sus píxeles azules)
 * y pone debajo una lámina que brilla y se mueve y, más abajo, un fondo oscuro que se ve como orilla.
 * Los colores salen de los propios píxeles del agua. Devuelve null si la sala no tiene agua.
 */
export function crearCharcos(
  suelo: HTMLCanvasElement,
  esAgua: readonly boolean[],
  columnas: number,
  tam: number,
  a: AjustesCharcos,
  azar: () => number,
): { grupo: THREE.Group; actualizar: (tiempo: number) => void } | null {
  const ancho = suelo.width;
  const alto = suelo.height;
  const ctx = suelo.getContext('2d')!;
  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;
  const agua = new Uint8Array(ancho * alto);
  const cuenta = new Map<number, number>();
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!esAgua[Math.floor(y / tam) * columnas + Math.floor(x / tam)]) continue;
      const i = (y * ancho + x) * 4;
      const [r = 0, g = 0, b = 0] = [px[i], px[i + 1], px[i + 2]];
      if (!(b > r + 20 && b > g)) continue; // el borde del charco no es azul: se queda como orilla del suelo
      agua[y * ancho + x] = 1;
      px[i + 3] = 0;
      const color = (r << 16) | (g << 8) | b;
      cuenta.set(color, (cuenta.get(color) ?? 0) + 1);
    }
  }
  if (cuenta.size === 0) return null;
  ctx.putImageData(datos, 0, 0);

  // La lámina de agua es algo más pequeña que el agujero: lo que queda entre los dos es la orilla oscura.
  const mascara = document.createElement('canvas');
  mascara.width = ancho;
  mascara.height = alto;
  const mctx = mascara.getContext('2d')!;
  const mdatos = mctx.createImageData(ancho, alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      let dentro = true;
      for (let dy = -a.orilla; dy <= a.orilla && dentro; dy++) {
        for (let dx = -a.orilla; dx <= a.orilla && dentro; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          dentro = xx >= 0 && yy >= 0 && xx < ancho && yy < alto && agua[yy * ancho + xx] === 1;
        }
      }
      const i = (y * ancho + x) * 4;
      const v = dentro ? 255 : 0;
      mdatos.data[i] = mdatos.data[i + 1] = mdatos.data[i + 2] = v;
      mdatos.data[i + 3] = 255;
    }
  }
  mctx.putImageData(mdatos, 0, 0);
  const texMascara = new THREE.CanvasTexture(mascara);
  texMascara.magFilter = texMascara.minFilter = THREE.NearestFilter;
  texMascara.generateMipmaps = false;

  // Los dos azules más usados del agua, oscuro y claro, con mucho más del oscuro.
  const brillo = (c: number): number => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  const azules = [...cuenta.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, 2)
    .map(([c]) => c)
    .sort((x, y) => brillo(x) - brillo(y));
  const texAgua = ruido(azules, [0.88, 0.12], azar, (ancho / tam) * 2, (alto / tam) * 2);

  const grupo = new THREE.Group();
  const lamina = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho / tam, alto / tam),
    new THREE.MeshPhongMaterial({
      map: texAgua,
      alphaMap: texMascara,
      alphaTest: 0.5,
      shininess: 90,
      specular: new THREE.Color(a.brillo, a.brillo, a.brillo),
    }),
  );
  lamina.position.y = -a.nivel;
  const fondo = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho / tam, alto / tam),
    new THREE.MeshLambertMaterial({ color: a.colorFondo }),
  );
  fondo.position.y = -a.fondo;
  for (const m of [lamina, fondo]) {
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    grupo.add(m);
  }
  return {
    grupo,
    actualizar: (tiempo) => texAgua.offset.set(tiempo * 0.02, tiempo * 0.013),
  };
}
