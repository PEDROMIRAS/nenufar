// shortcut: prototipo del aspecto HD-2D (estilo Octopath) para decidir la v2; vive aparte (prototipo.html), no entra en el juego ni en el build.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { crearAcciones } from '../core/acciones';
import { crearAzar } from '../core/azar';
import { actualizarHeroina, crearHeroina } from '../core/heroina';
import { construirSala, crearCatalogo, type Tile } from '../core/sala';
import controles from '../data/controles.json';
import { HEROES } from '../data/datos';
import plantillas from '../data/salas/plantillas_bosque.json';
import { leerFuentes } from '../input/fuente';
import { crearJoystick } from '../input/joystick';
import { crearTeclado } from '../input/teclado';
import { iniciarBucle } from '../render/bucle';
import { cargarSprite, cargarTilesets } from '../render/recursos';
import { dibujarTile } from '../render/sala';
import { crearFuente, ruido } from './fuente';
import { crearCharcos } from './charcos';
import { crearModelo } from './modelos';

// shortcut: números de prueba en el código; si la v2 sigue adelante, pasan a src/data/.
const AJUSTES = {
  plantilla: 'bosque_descanso_01',
  /** Grados que mira hacia abajo la cámara, y su campo de visión vertical. */
  inclinacion: 52,
  fov: 28,
  /** Alto de los troncos del borde del bosque, en casillas. */
  altoTronco: 0.6,
  /** Copas del borde del bosque: bolas por casilla, radio mínimo y máximo, cuánto se separan del centro, a qué altura sobre el tronco y cuánto se aplastan. */
  copas: {
    porCasilla: 3,
    radioMin: 0.42,
    radioMax: 0.6,
    desvio: 0.5,
    alto: 0.1,
    aplastar: 0.8,
    /** Radio de los troncos, en casillas. */
    troncoMin: 0.06,
    troncoMax: 0.1,
    /** Sombra en el suelo bajo cada copa: radio (por el de la copa) y opacidad en el centro. */
    sombra: { radio: 1.3, fuerza: 0.7 },
  },
  /** Charcos hundidos: alto del agua y del fondo bajo el suelo (casillas), píxeles de orilla, color del fondo y brillo. */
  charcos: { nivel: 0.05, fondo: 0.12, orilla: 2, colorFondo: '#1d2a22', brillo: 0.6 },
  /** Colores de la corteza (clara, media, oscura). */
  corteza: [0x9a6a42, 0x7a5233, 0x5a3b26],
  /** Fracción de la inclinación de la cámara que se echan atrás los sprites (1 = de cara; menos, para no meterse en los muros). */
  inclinacionSprites: 0.5,
  /** La fuente es un modelo 3D en vez de sprites; `centroZ` la baja dentro de su casilla central. */
  fuente: {
    centroZ: 0.15,
    radioX: 1.4,
    radioZ: 0.8,
    altoBorde: 0.24,
    altoAgua: 0.15,
    altoColumna: 0.62,
    piedra: [0xdfe1ea, 0xb4b8c6, 0x7a7e92] as [number, number, number],
    agua: [0x3d7fd6, 0x9fd0f5] as [number, number],
    gotas: 40,
    vidaGota: 0.55,
  },
  luzCielo: 1.6,
  luzLuna: 0.9,
  hoguera: { color: 0xff9a4a, intensidad: 14, alcance: 6, alto: 0.55, parpadeo: 0.18 },
  /** Desenfoque tilt-shift: cuánto se emborrona lejos de la franja enfocada (que sigue a la rana). */
  desenfoque: 2.4,
  bloom: { fuerza: 0.55, radio: 0.5, umbral: 0.72 },
  vineta: { offset: 1.0, oscuridad: 1.15 },
};

// ?desenfoque=N en la URL cambia el tilt-shift (0 lo quita), para comparar.
const pedido = new URLSearchParams(location.search).get('desenfoque');
if (pedido !== null) AJUSTES.desenfoque = Number(pedido);

const ANCHO = 480;
const ALTO = 352;

async function iniciar(): Promise<void> {
  const [{ tilesets, imagenes }, sprite] = await Promise.all([
    cargarTilesets('bosque'),
    cargarSprite(HEROES.ronin.sprite),
  ]);
  const tam = tilesets[0]?.tileSize ?? 32;
  const catalogo = crearCatalogo(tilesets);
  const plantilla = plantillas.plantillas.find((p) => p.id === AJUSTES.plantilla);
  if (!plantilla) throw new Error(`No existe la plantilla ${AJUSTES.plantilla}`);
  const sala = construirSala(plantilla.mapa, plantillas, catalogo, crearAzar(7));

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.append(renderer.domElement);

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x0b120e);

  // Cámara fija por sala, inclinada y con poco campo de visión: casi isométrica pero con profundidad.
  const camara = new THREE.PerspectiveCamera(AJUSTES.fov, ANCHO / ALTO, 0.1, 200);
  const centro = new THREE.Vector3(sala.ancho / 2, 0, sala.alto / 2);
  const angulo = THREE.MathUtils.degToRad(AJUSTES.inclinacion);
  // Echados atrás solo en parte y estirados para que, vistos desde la cámara, conserven su alto.
  const giro = angulo * AJUSTES.inclinacionSprites;
  const estirar = 1 / Math.cos(angulo - giro);
  const verAncho = Math.tan(THREE.MathUtils.degToRad(AJUSTES.fov / 2)) * (ANCHO / ALTO);
  const distancia = sala.ancho / 2 / verAncho + 1;
  camara.position.set(
    centro.x,
    Math.sin(angulo) * distancia,
    centro.z + Math.cos(angulo) * distancia,
  );
  camara.lookAt(centro);

  // Muros: árboles de verdad. Copas redondas con la textura de muro_a, cada una sobre su tronco,
  // de tamaño y sitio algo al azar para que el borde del bosque no salga recto.
  const c = AJUSTES.copas;
  const azarCopas = crearAzar(23);
  const arboles = sala.base.flatMap((t, i) => {
    if (t.layer !== 'muro') return [];
    const x = i % sala.ancho;
    const z = Math.floor(i / sala.ancho);
    return Array.from({ length: c.porCasilla }, () => ({
      x: x + 0.5 + (azarCopas() - 0.5) * c.desvio,
      z: z + 0.5 + (azarCopas() - 0.5) * c.desvio,
      radio: c.radioMin + azarCopas() * (c.radioMax - c.radioMin),
      alto: AJUSTES.altoTronco + c.alto + azarCopas() * c.desvio,
      grosor: c.troncoMin + azarCopas() * (c.troncoMax - c.troncoMin),
      giro: azarCopas() * 6,
    }));
  });

  // Suelo: un plano con los tiles de fondo de la sala. Bajo el bosque, hierba con una sombra
  // redonda por árbol, para que el borde sea irregular y no un rectángulo oscuro.
  const hierba = [...catalogo.values()].find((t) => t.layer === 'suelo' && t.weight);
  const lienzoSuelo = pintar(sala.ancho, sala.alto, tam, (ctx) => {
    sala.base.forEach((t, i) => {
      const fondo = t.layer === 'muro' ? (hierba ?? t) : t;
      dibujarTile(
        ctx,
        imagenes,
        fondo,
        tam,
        (i % sala.ancho) * tam,
        Math.floor(i / sala.ancho) * tam,
      );
    });
    for (const a of arboles) {
      const r = a.radio * c.sombra.radio * tam;
      const sombra = ctx.createRadialGradient(a.x * tam, a.z * tam, 0, a.x * tam, a.z * tam, r);
      sombra.addColorStop(0, `rgba(10, 18, 12, ${c.sombra.fuerza})`);
      sombra.addColorStop(1, 'rgba(10, 18, 12, 0)');
      ctx.fillStyle = sombra;
      ctx.fillRect(a.x * tam - r, a.z * tam - r, r * 2, r * 2);
    }
  });
  // Charcos: agujeros en el suelo con el agua hundida debajo.
  const charcos = crearCharcos(
    lienzoSuelo,
    sala.base.map((t) => t.name.startsWith('agua_')),
    sala.ancho,
    tam,
    AJUSTES.charcos,
    crearAzar(41),
  );
  if (charcos) {
    charcos.grupo.position.set(centro.x, 0, centro.z);
    escena.add(charcos.grupo);
  }
  const suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(sala.ancho, sala.alto),
    new THREE.MeshLambertMaterial({ map: textura(lienzoSuelo), alphaTest: 0.5 }),
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.set(centro.x, 0, centro.z);
  suelo.receiveShadow = true;
  escena.add(suelo);

  const tronco = new THREE.MeshLambertMaterial({
    map: ruido(AJUSTES.corteza, [0.45, 0.4, 0.15], crearAzar(5), 1, 2),
    flatShading: true,
  });
  const copa = new THREE.MeshLambertMaterial({
    map: textura(tileSuelto(imagenes, tile(catalogo, 'muro_a'), tam)),
    flatShading: true,
  });
  // Cilindro de alto 1 con la base en el suelo; cada instancia lo estira hasta su copa.
  const cilindro = new THREE.CylinderGeometry(0.8, 1, 1, 6);
  cilindro.translate(0, 0.5, 0);
  const troncos = new THREE.InstancedMesh(cilindro, tronco, arboles.length);
  const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), copa, arboles.length);
  const molde = new THREE.Object3D();
  arboles.forEach((a, i) => {
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
    escena.add(m);
  }

  // Objetos y rana: planos de pie que miran a la cámara, para que se vean como el pixel art original.
  // La fuente, dibujada vista desde arriba, no funciona de pie: va como modelo 3D con relieve.
  const animados: Pieza[] = [];
  let fuente: ReturnType<typeof crearFuente> | null = null;
  const nuevaPieza = (tiles: Tile[]): Pieza => {
    const lienzo = pintar(1, tiles.length, tam, () => {});
    const pieza = { tiles, ctx: lienzo.getContext('2d')!, tex: textura(lienzo), frame: -1 };
    pintarPieza(pieza, imagenes, tam, 0);
    if (tiles.some((t) => t.frames)) animados.push(pieza);
    return pieza;
  };
  const materialDe = (p: Pieza): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ map: p.tex, alphaTest: 0.5, side: THREE.DoubleSide });
  const hoguera = new THREE.Vector3();
  const azarModelos = crearAzar(31);
  for (const o of sala.objetos) {
    if (o.inf.name.startsWith('fuente_')) {
      if (o.inf.name !== 'fuente_cen_inf') continue;
      const f = AJUSTES.fuente;
      fuente = crearFuente(f, crearAzar(11), 2 * renderer.getPixelRatio());
      fuente.grupo.position.set(o.x + 0.5, 0, o.y + f.centroZ);
      escena.add(fuente.grupo);
      // shortcut: la fuente choca con su elipse (la caja del tileset es para el dibujo en 2D); en la v2, en los datos.
      for (let fila = o.y - 1; fila <= o.y; fila++) {
        for (let col = o.x - 1; col <= o.x + 1; col++) {
          const caja = cajaElipse(o.x + 0.5, o.y + f.centroZ, f.radioX, f.radioZ, col, fila, tam);
          sala.solido[fila * sala.ancho + col] = caja !== null;
          sala.cajas[fila * sala.ancho + col] = caja;
        }
      }
      continue;
    }
    // Rocas, arbustos, tocones y árboles sueltos: modelos con relieve, plantados en el centro de su caja de choque.
    const modelo = crearModelo(o.inf, imagenes, tam, { copa, tronco }, azarModelos);
    if (modelo) {
      const [x0, y0, x1, y1] = o.inf.caja ?? [0, 0, tam, tam];
      modelo.position.set(o.x + (x0 + x1) / 2 / tam, 0, o.y + (y0 + y1) / 2 / tam);
      escena.add(modelo);
      continue;
    }
    const dePie = [o.sup, o.inf].filter((t): t is Tile => t !== null);
    const plano = carton(materialDe(nuevaPieza(dePie)), dePie.length, 0);
    plano.position.set(o.x + 0.5, 0, o.y + 0.85);
    plano.rotation.x = -giro;
    plano.scale.y = estirar;
    escena.add(plano);
    if (o.inf.name === 'hoguera') hoguera.set(o.x + 0.5, AJUSTES.hoguera.alto, o.y + 0.6);
  }

  const hoja = new THREE.Texture(sprite.imagen as HTMLImageElement);
  ajustarPixelArt(hoja);
  const columnas = (sprite.imagen as HTMLImageElement).width / sprite.datos.frameWidth;
  const filas = (sprite.imagen as HTMLImageElement).height / sprite.datos.frameHeight;
  hoja.repeat.set(1 / columnas, 1 / filas);
  const rana = carton(
    new THREE.MeshLambertMaterial({ map: hoja, alphaTest: 0.5, side: THREE.DoubleSide }),
    sprite.datos.frameHeight / tam,
    (sprite.datos.frameHeight - sprite.datos.anchor.y) / tam,
  );
  rana.rotation.x = -giro;
  rana.scale.y = estirar;
  escena.add(rana);

  // Luces: cielo de anochecer, luna fría con sombras y la hoguera, que parpadea y proyecta las sombras de cerca.
  escena.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a3a24, AJUSTES.luzCielo));
  const luna = new THREE.DirectionalLight(0xc8d6ff, AJUSTES.luzLuna);
  // Desde arriba a la izquierda y del lado de la cámara, como la luz pintada en el arte: así ilumina la cara de los sprites.
  luna.position.set(centro.x - 6, 12, centro.z + 5);
  luna.target.position.copy(centro);
  luna.castShadow = true;
  luna.shadow.mapSize.set(1024, 1024);
  Object.assign(luna.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  escena.add(luna, luna.target);
  const fuego = new THREE.PointLight(
    AJUSTES.hoguera.color,
    AJUSTES.hoguera.intensidad,
    AJUSTES.hoguera.alcance,
    1.5,
  );
  fuego.position.copy(hoguera);
  fuego.castShadow = true;
  fuego.shadow.mapSize.set(512, 512);
  fuego.shadow.bias = -0.002;
  escena.add(fuego);

  // Posprocesado: tilt-shift (horizontal y vertical), bloom para el fuego y viñeta.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(escena, camara));
  const tiltH = new ShaderPass(HorizontalTiltShiftShader);
  const tiltV = new ShaderPass(VerticalTiltShiftShader);
  composer.addPass(tiltH);
  composer.addPass(tiltV);
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(ANCHO, ALTO),
    AJUSTES.bloom.fuerza,
    AJUSTES.bloom.radio,
    AJUSTES.bloom.umbral,
  );
  composer.addPass(bloom);
  const vineta = new ShaderPass(VignetteShader);
  vineta.uniforms.offset!.value = AJUSTES.vineta.offset;
  vineta.uniforms.darkness!.value = AJUSTES.vineta.oscuridad;
  composer.addPass(vineta);
  composer.addPass(new OutputPass());

  const ajustarTamano = (): void => {
    const escala = Math.min(innerWidth / ANCHO, innerHeight / ALTO);
    const w = Math.floor(ANCHO * escala);
    const h = Math.floor(ALTO * escala);
    renderer.setSize(w, h);
    composer.setSize(w, h);
    tiltH.uniforms.h!.value = AJUSTES.desenfoque / w;
    tiltV.uniforms.v!.value = AJUSTES.desenfoque / h;
  };
  addEventListener('resize', ajustarTamano);
  ajustarTamano();

  const heroina = crearHeroina(HEROES.ronin, 7 * tam + 16, 8 * tam + 20);
  const acciones = crearAcciones();
  const fuentes = [crearTeclado(), crearJoystick(document.body, controles.joystick)];
  const pantalla = new THREE.Vector3();
  let tiempo = 0;

  iniciarBucle(
    (dt) => {
      tiempo += dt;
      leerFuentes(fuentes, acciones);
      actualizarHeroina(heroina, acciones, dt, sala, tam, acciones.correr);
    },
    (alpha) => {
      const x = heroina.xAnterior + (heroina.cuerpo.x - heroina.xAnterior) * alpha;
      const y = heroina.yAnterior + (heroina.cuerpo.y - heroina.yAnterior) * alpha;
      rana.position.set(x / tam, 0, y / tam);
      const anim = sprite.datos.animations[heroina.animacion];
      if (anim) {
        const n = Math.floor(heroina.tiempoAnimacion * anim.fps) % anim.frames;
        hoja.offset.set(
          (anim.startColumn + n) / columnas,
          1 - (sprite.datos.directions[heroina.direccion] + 1) / filas,
        );
      }
      for (const a of animados) pintarPieza(a, imagenes, tam, tiempo);
      fuente?.actualizar(tiempo);
      charcos?.actualizar(tiempo);
      const p = AJUSTES.hoguera.parpadeo;
      fuego.intensity =
        AJUSTES.hoguera.intensidad *
        (1 + p * Math.sin(tiempo * 13) + p * 0.6 * Math.sin(tiempo * 7.3 + 1));

      // La franja enfocada sigue a la rana.
      pantalla.set(rana.position.x, 0.5, rana.position.z).project(camara);
      tiltH.uniforms.r!.value = (pantalla.y + 1) / 2;
      tiltV.uniforms.r!.value = (pantalla.y + 1) / 2;
      composer.render();
    },
  );
}

function tile(catalogo: ReadonlyMap<string, Tile>, nombre: string): Tile {
  const t = catalogo.get(nombre);
  if (!t) throw new Error(`Falta el tile ${nombre}`);
  return t;
}

/** Lienzo de una casilla con el tile `t`. */
function tileSuelto(
  imagenes: readonly HTMLImageElement[],
  t: Tile,
  tam: number,
): HTMLCanvasElement {
  return pintar(1, 1, tam, (ctx) => dibujarTile(ctx, imagenes, t, tam, 0, 0));
}

/** Lienzo de `ancho`×`alto` casillas pintado por `pintor`. */
function pintar(
  ancho: number,
  alto: number,
  tam: number,
  pintor: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho * tam;
  lienzo.height = alto * tam;
  pintor(lienzo.getContext('2d')!);
  return lienzo;
}

function textura(lienzo: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(lienzo);
  ajustarPixelArt(tex);
  return tex;
}

/** Sin suavizado ni mipmaps: los píxeles se ven nítidos a cualquier distancia. */
function ajustarPixelArt(tex: THREE.Texture): void {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

/** Plano de 1 de ancho y `alto` casillas con el origen `pie` casillas por encima de su borde inferior. */
function carton(material: THREE.Material, alto: number, pie: number): THREE.Mesh {
  const geometria = new THREE.PlaneGeometry(1, alto);
  geometria.translate(0, alto / 2 - pie, 0);
  const plano = new THREE.Mesh(geometria, material);
  plano.castShadow = true;
  return plano;
}

/** Rectángulo `[x0, y0, x1, y1)` de la casilla (`col`, `fila`) que cae dentro de la elipse, o null si nada. */
function cajaElipse(
  cx: number,
  cz: number,
  rx: number,
  rz: number,
  col: number,
  fila: number,
  tam: number,
): readonly [number, number, number, number] | null {
  let [x0, y0, x1, y1] = [tam, tam, 0, 0];
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const dx = (col + (x + 0.5) / tam - cx) / rx;
      const dz = (fila + (y + 0.5) / tam - cz) / rz;
      if (dx * dx + dz * dz > 1) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
  }
  return x1 > 0 ? [x0, y0, x1, y1] : null;
}

/** Tiles de un objeto apilados de arriba abajo en una textura, que se repinta al cambiar de fotograma. */
interface Pieza {
  tiles: Tile[];
  ctx: CanvasRenderingContext2D;
  tex: THREE.Texture;
  frame: number;
}

/** Vuelve a pintar una pieza si su fotograma ha cambiado (todos sus tiles animados van a la vez). */
function pintarPieza(
  p: Pieza,
  imagenes: readonly HTMLImageElement[],
  tam: number,
  tiempo: number,
): void {
  const guia = p.tiles.find((t) => t.frames) ?? p.tiles[0];
  const frame = guia?.frames ? Math.floor(tiempo * (guia.fps ?? 0)) % guia.frames : 0;
  if (frame === p.frame) return;
  p.frame = frame;
  p.ctx.clearRect(0, 0, p.ctx.canvas.width, p.ctx.canvas.height);
  p.tiles.forEach((t, fila) =>
    dibujarTile(p.ctx, imagenes, t, tam, 0, fila * tam, t.frames ? frame % t.frames : 0),
  );
  p.tex.needsUpdate = true;
}

iniciar().catch((error: unknown) => {
  document.body.style.color = '#fff';
  document.body.textContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
});
