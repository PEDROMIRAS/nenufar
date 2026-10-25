import * as THREE from 'three';
import type { HundidoHd2d } from '../../core/types';
import { ruido } from './texturas';

/**
 * Hunde el agua o la fosa: abre agujeros en el lienzo del suelo donde las casillas `hundida` pintan alguno de
 * los colores `huecos`, y pone debajo una lámina con esos colores que se mueve (y brilla, si es agua) y, más
 * abajo, un fondo oscuro que se ve como orilla. Devuelve null si la sala no tiene nada hundido.
 */
export function crearHundidos(
  suelo: HTMLCanvasElement,
  hundida: readonly boolean[],
  huecos: ReadonlySet<number>,
  columnas: number,
  tam: number,
  a: HundidoHd2d,
  azar: () => number,
): { grupo: THREE.Group; actualizar: (tiempo: number) => void } | null {
  const ancho = suelo.width;
  const alto = suelo.height;
  const ctx = suelo.getContext('2d')!;
  const datos = ctx.getImageData(0, 0, ancho, alto);
  const px = datos.data;
  const hueco = new Uint8Array(ancho * alto);
  const cuenta = new Map<number, number>();
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (!hundida[Math.floor(y / tam) * columnas + Math.floor(x / tam)]) continue;
      const i = (y * ancho + x) * 4;
      const color = ((px[i] ?? 0) << 16) | ((px[i + 1] ?? 0) << 8) | (px[i + 2] ?? 0);
      if (!huecos.has(color)) continue; // el borde no es agua ni fosa: se queda como orilla del suelo
      hueco[y * ancho + x] = 1;
      px[i + 3] = 0;
      cuenta.set(color, (cuenta.get(color) ?? 0) + 1);
    }
  }
  if (cuenta.size === 0) return null;
  ctx.putImageData(datos, 0, 0);

  // La lámina es algo más pequeña que el agujero: lo que queda entre los dos es la orilla oscura.
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
          dentro = xx >= 0 && yy >= 0 && xx < ancho && yy < alto && hueco[yy * ancho + xx] === 1;
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

  // Los colores más usados de lo hundido, en la proporción en que aparecen.
  const usados = [...cuenta.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
  const total = usados.reduce((s, [, n]) => s + n, 0);
  const tex = ruido(
    usados.map(([c]) => c),
    usados.map(([, n]) => n / total),
    azar,
    (ancho / tam) * 2,
    (alto / tam) * 2,
  );

  const grupo = new THREE.Group();
  const lamina = new THREE.Mesh(
    new THREE.PlaneGeometry(ancho / tam, alto / tam),
    new THREE.MeshPhongMaterial({
      map: tex,
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
    actualizar: (tiempo) => tex.offset.set(tiempo * 0.02, tiempo * 0.013),
  };
}
