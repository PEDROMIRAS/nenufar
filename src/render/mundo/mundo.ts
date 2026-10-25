import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { crearAzar } from '../../core/azar';
import type { ObjetoSala, Sala, Salida, Tile } from '../../core/sala';
import type { Direccion, Hd2dJson, LuzHd2d, ZonaHd2d } from '../../core/types';
import { N, S } from '../../core/zona';
import { ALTO, ANCHO } from '../pantalla';
import type { Sprite } from '../recursos';
import { dibujarTile } from '../sala';
import { crearBorde, materialesBosque, type MaterialesBosque } from './borde';
import { crearFuente } from './fuente';
import { crearHundidos } from './hundidos';
import { crearBarrera, crearModelo } from './modelos';
import { ajustarPixelArt, cuentaColores, pintar, textura } from './texturas';
import { transparentar, uniformesTransparencia } from './transparencia';

/** Luces puntuales que hay siempre en la escena: cambiar cuántas hay obliga a recompilar los materiales. */
const PUNTUALES = 4;
/** Píxeles de una casilla (el tileSize de todos los tilesets): una unidad del mundo. */
const TAM = 32;

/** Un sprite de pie (heroína o monstruo) con su hoja de animaciones; el fotograma se elige moviendo la textura. */
export interface Actor {
  malla: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  tex: THREE.Texture;
  sprite: Sprite;
  columnas: number;
  filas: number;
}

/** Tiles de un objeto apilados de arriba abajo en una textura, que se repinta al cambiar de fotograma. */
interface Pieza {
  tiles: Tile[];
  ctx: CanvasRenderingContext2D;
  tex: THREE.Texture;
  frame: number;
}

/** Una sala montada en 3D. */
export interface VistaSala {
  grupo: THREE.Group;
  sala: Sala;
  /** Lo que se ve de cada objeto (modelo o sprite), para rehacerlo si cambia (el cofre al abrirse, el portal). */
  objetos: Map<ObjetoSala, THREE.Object3D>;
  piezas: Map<ObjetoSala, Pieza>;
  fuente: { actualizar: (tiempo: number) => void } | null;
  hundidos: { actualizar: (tiempo: number) => void } | null;
  /** Luces puntuales de sus objetos (hoguera, candelabros, portal) y dónde están. */
  luces: { luz: LuzHd2d; x: number; z: number; fase: number }[];
  /** Barrera de cada salida, que se ve mientras está cerrada. */
  barreras: { lado: number; obj: THREE.Object3D }[];
  azar: () => number;
}

/** Lo que se necesita de la zona actual para montar sus salas. */
interface ZonaMontada {
  aspecto: ZonaHd2d;
  imagenes: readonly HTMLImageElement[];
  catalogo: ReadonlyMap<string, Tile>;
  tam: number;
  bosque: MaterialesBosque | null;
  /** Colores de lo hundido (agua, fosa) que no aparecen en los suelos: ahí se abre el agujero. */
  huecos: Set<number>;
  vistas: VistaSala[];
}

/**
 * El mapa en 3D (estilo HD-2D): un canvas WebGL debajo del canvas 2D, que queda para la interfaz. La X del juego
 * es la X del mundo, la Y en píxeles pasa a ser la Z, y la altura es la Y; una unidad es una casilla. `core/` no
 * cambia: la heroína se mueve y choca con la misma rejilla.
 */
export class Mundo {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly escena = new THREE.Scene();
  private readonly camara: THREE.PerspectiveCamera;
  private readonly tiltH: ShaderPass;
  private readonly tiltV: ShaderPass;
  private readonly cielo: THREE.HemisphereLight;
  private readonly principal: THREE.DirectionalLight;
  private readonly puntuales: THREE.PointLight[] = [];
  private heroe: Actor | null = null;
  private zona: ZonaMontada | null = null;
  private vista: VistaSala | null = null;
  private readonly giro: number;
  private readonly estirar: number;
  /** Vector de trabajo para proyectar a pantalla (sin crear nada en el bucle). */
  private readonly pantalla = new THREE.Vector3();

  constructor(
    private readonly lienzo: HTMLCanvasElement,
    private readonly a: Hd2dJson,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const el = this.renderer.domElement;
    el.id = 'mundo';
    el.setAttribute('aria-hidden', 'true');
    lienzo.before(el);

    const { inclinacion, fov } = a.camara;
    this.camara = new THREE.PerspectiveCamera(fov, ANCHO / ALTO, 0.1, 200);
    const angulo = THREE.MathUtils.degToRad(inclinacion);
    // Los sprites se echan atrás solo en parte (de cara, los pegados a un muro se metían dentro de él) y
    // se estiran para que, vistos desde la cámara, conserven su alto.
    this.giro = angulo * a.inclinacionSprites;
    this.estirar = 1 / Math.cos(angulo - this.giro);

    this.cielo = new THREE.HemisphereLight();
    this.principal = new THREE.DirectionalLight();
    this.principal.castShadow = true;
    this.principal.shadow.mapSize.set(a.sombras.principal, a.sombras.principal);
    Object.assign(this.principal.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
    this.escena.add(this.cielo, this.principal, this.principal.target);
    for (let i = 0; i < PUNTUALES; i++) {
      const luz = new THREE.PointLight(0xffffff, 0, 1, 1.5);
      luz.shadow.mapSize.set(a.sombras.puntual, a.sombras.puntual);
      luz.shadow.bias = -0.002;
      // Solo la primera puede proyectar sombras: las puntuales con sombra son caras.
      luz.castShadow = i === 0;
      this.puntuales.push(luz);
      this.escena.add(luz);
    }

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
    this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(ANCHO, ALTO),
        a.bloom.fuerza,
        a.bloom.radio,
        a.bloom.umbral,
      ),
    );
    const vineta = new ShaderPass(VignetteShader);
    vineta.uniforms.offset!.value = a.vineta.offset;
    vineta.uniforms.darkness!.value = a.vineta.oscuridad;
    this.composer.addPass(vineta);
    this.composer.addPass(new OutputPass());

    // Va después del listener de prepararPantalla: el canvas 2D ya tiene su tamaño nuevo.
    addEventListener('resize', () => this.ajustarTamano());
    this.ajustarTamano();
  }

  /** Mismo sitio y tamaño que el canvas 2D; se dibuja a la resolución de la pantalla, con un tope. */
  private ajustarTamano(): void {
    const ancho = parseFloat(this.lienzo.style.width) || ANCHO;
    const alto = parseFloat(this.lienzo.style.height) || ALTO;
    const densidad = Math.min(window.devicePixelRatio || 1, this.a.resolucionMaxima);
    const w = Math.round(ancho * densidad);
    const h = Math.round(alto * densidad);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${ancho}px`;
    this.renderer.domElement.style.height = `${alto}px`;
    this.composer.setSize(w, h);
    this.tiltH.uniforms.h!.value = this.a.desenfoque / w;
    this.tiltV.uniforms.v!.value = this.a.desenfoque / h;
    uniformesTransparencia.uRadioPx.value = (this.a.transparencia.radio * w) / 15;
  }

  /** Luces y materiales de una zona. Se llama al entrar en su mapa. */
  prepararZona(
    aspecto: ZonaHd2d,
    imagenes: readonly HTMLImageElement[],
    catalogo: ReadonlyMap<string, Tile>,
    tam: number,
  ): void {
    this.vaciar();
    this.escena.background = new THREE.Color(aspecto.fondo);
    this.cielo.color.set(aspecto.cielo.arriba);
    this.cielo.groundColor.set(aspecto.cielo.abajo);
    this.cielo.intensity = aspecto.cielo.intensidad;
    this.principal.color.set(aspecto.principal.color);
    this.principal.intensity = aspecto.principal.intensidad;
    const suelos = [...catalogo.values()].filter((t) => t.layer === 'suelo' && !t.solid);
    const deSuelo = new Set(suelos.flatMap((t) => [...cuentaColores(imagenes, t, tam).keys()]));
    const lleno = catalogo.get(`${aspecto.hundido.autotile}_15`);
    const huecos = new Set(
      lleno ? [...cuentaColores(imagenes, lleno, tam).keys()].filter((c) => !deSuelo.has(c)) : [],
    );
    this.zona = {
      aspecto,
      imagenes,
      catalogo,
      tam,
      bosque: materialesBosque(aspecto.borde, imagenes, catalogo, tam, crearAzar(5)),
      huecos,
      vistas: [],
    };
  }

  /** Suelta todo lo de la zona anterior (geometrías, materiales y texturas). */
  vaciar(): void {
    if (!this.zona) return;
    for (const v of this.zona.vistas) {
      if (v.grupo.parent) v.grupo.parent.remove(v.grupo);
      v.grupo.traverse((o) => {
        if (!(o instanceof THREE.Mesh || o instanceof THREE.Points)) return;
        o.geometry.dispose();
        for (const m of [o.material as THREE.Material | THREE.Material[]].flat()) {
          (m as THREE.MeshLambertMaterial).map?.dispose();
          m.dispose();
        }
      });
    }
    this.zona = null;
    this.vista = null;
  }

  /** Monta una sala en 3D. `semilla` fija el azar de su decorado. */
  montar(sala: Sala, salidas: readonly Salida[], semilla: number): VistaSala {
    const z = this.zona;
    if (!z) throw new Error('Falta prepararZona antes de montar una sala');
    const { aspecto, imagenes, catalogo, tam } = z;
    const azar = crearAzar(semilla);
    const grupo = new THREE.Group();
    const v: VistaSala = {
      grupo,
      sala,
      objetos: new Map(),
      piezas: new Map(),
      fuente: null,
      hundidos: null,
      luces: [],
      barreras: [],
      azar,
    };

    const borde = crearBorde(sala, aspecto.borde, imagenes, catalogo, tam, z.bosque, azar);
    grupo.add(borde.grupo);

    // Suelo: un plano con los tiles de fondo; bajo el borde, el suelo de la zona con las sombras de los árboles.
    const suelo = [...catalogo.values()].find((t) => t.layer === 'suelo' && t.weight);
    const lienzo = pintar(sala.ancho, sala.alto, tam, (ctx) => {
      sala.base.forEach((t, i) => {
        const fondo = t.layer === 'muro' ? (suelo ?? t) : t;
        dibujarTile(
          ctx,
          imagenes,
          fondo,
          tam,
          (i % sala.ancho) * tam,
          Math.floor(i / sala.ancho) * tam,
        );
      });
      for (const s of borde.sombras) {
        const r = s.radio * tam;
        const g = ctx.createRadialGradient(s.x * tam, s.z * tam, 0, s.x * tam, s.z * tam, r);
        g.addColorStop(0, `rgba(10, 18, 12, ${s.fuerza})`);
        g.addColorStop(1, 'rgba(10, 18, 12, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(s.x * tam - r, s.z * tam - r, r * 2, r * 2);
      }
    });
    const centro = new THREE.Vector3(sala.ancho / 2, 0, sala.alto / 2);
    const autotile = `${aspecto.hundido.autotile}_`;
    const hundidos = crearHundidos(
      lienzo,
      sala.base.map((t) => t.name.startsWith(autotile)),
      z.huecos,
      sala.ancho,
      tam,
      aspecto.hundido,
      azar,
    );
    if (hundidos) {
      hundidos.grupo.position.copy(centro);
      grupo.add(hundidos.grupo);
      v.hundidos = hundidos;
    }
    const plano = new THREE.Mesh(
      new THREE.PlaneGeometry(sala.ancho, sala.alto),
      new THREE.MeshLambertMaterial({ map: textura(lienzo), alphaTest: 0.5 }),
    );
    plano.rotation.x = -Math.PI / 2;
    plano.position.copy(centro);
    plano.receiveShadow = true;
    grupo.add(plano);

    for (const o of sala.objetos) this.ponerObjeto(v, o);

    // Barreras de las salidas, escondidas hasta que se cierran. La norte, en la fila de dentro del muro.
    for (const s of salidas) {
      const norte = s.lado === N;
      const aLoLargoDeX = norte || s.lado === S;
      const tile = catalogo.get(aLoLargoDeX ? 'barrera_h' : 'barrera_v');
      const celda = s.celdas[norte ? 1 : 0];
      if (!tile || !celda) continue;
      const obj = crearBarrera(tile, imagenes, tam, aLoLargoDeX, azar);
      obj.position.set(celda[0] + 0.5, 0, celda[1] + 0.5);
      obj.visible = false;
      grupo.add(obj);
      v.barreras.push({ lado: s.lado, obj });
    }
    // Lo que tapa a la heroína se vuelve transparente: el borde, los modelos y los sprites de los objetos.
    grupo.traverse((o) => {
      if (o === plano || (hundidos && o.parent === hundidos.grupo)) return;
      if (o instanceof THREE.Mesh)
        [o.material as THREE.Material | THREE.Material[]].flat().forEach(transparentar);
    });
    z.vistas.push(v);
    return v;
  }

  /** Rehace lo que se ve de un objeto (el cofre al abrirse) o lo añade (el portal al vencer al jefe). */
  rehacerObjeto(v: VistaSala, o: ObjetoSala): void {
    const viejo = v.objetos.get(o);
    if (viejo) v.grupo.remove(viejo);
    v.piezas.delete(o);
    this.ponerObjeto(v, o);
    v.objetos.get(o)?.traverse((m) => {
      if (m instanceof THREE.Mesh)
        [m.material as THREE.Material | THREE.Material[]].flat().forEach(transparentar);
    });
  }

  /** Modelo con relieve si lo hay; si no, sprite de pie con sus tiles. Y su luz, si lleva. */
  private ponerObjeto(v: VistaSala, o: ObjetoSala): void {
    const z = this.zona;
    if (!z) return;
    const { imagenes, tam } = z;
    const nombre = o.inf.name;
    let obj: THREE.Object3D;
    if (nombre.startsWith('fuente_')) {
      // La fuente ocupa tres casillas; el modelo va con la del centro y choca con su elipse (ver chocarConElipse).
      if (nombre !== 'fuente_cen_inf') return;
      const f = this.a.fuente;
      const fuente = crearFuente(f, v.azar, this.renderer.domElement.width / ANCHO);
      fuente.grupo.position.set(o.x + 0.5, 0, o.y + f.centroZ);
      v.fuente = fuente;
      obj = fuente.grupo;
    } else {
      const modelo = crearModelo(o.inf, imagenes, tam, z.bosque, v.azar);
      if (modelo) {
        // Plantado en el centro de su caja de choque, así la colisión no cambia.
        const [x0, y0, x1, y1] = o.inf.caja ?? [0, 0, tam, tam];
        modelo.position.set(o.x + (x0 + x1) / 2 / tam, 0, o.y + (y0 + y1) / 2 / tam);
        obj = modelo;
      } else {
        const tiles = [o.sup, o.inf].filter((t): t is Tile => t !== null);
        const lienzo = pintar(1, tiles.length, tam, () => {});
        const pieza = { tiles, ctx: lienzo.getContext('2d')!, tex: textura(lienzo), frame: -1 };
        pintarPieza(pieza, imagenes, tam, 0);
        if (tiles.some((t) => t.frames)) v.piezas.set(o, pieza);
        const plano = carton(
          new THREE.MeshLambertMaterial({ map: pieza.tex, alphaTest: 0.5, side: THREE.DoubleSide }),
          1,
          tiles.length,
          0,
        );
        plano.position.set(o.x + 0.5, 0, o.y + 0.85);
        plano.rotation.x = -this.giro;
        plano.scale.y = this.estirar;
        obj = plano;
      }
    }
    v.objetos.set(o, obj);
    v.grupo.add(obj);
    const luz = this.a.luces[nombre];
    v.luces = v.luces.filter((l) => l.x !== o.x + 0.5 || l.z !== o.y + 0.6);
    if (luz) {
      v.luces.push({ luz, x: o.x + 0.5, z: o.y + 0.6, fase: v.azar() * 10 });
      // Las que hacen sombra, primero: solo la primera luz puntual puede proyectarlas.
      v.luces.sort((p, q) => Number(q.luz.sombra) - Number(p.luz.sombra));
    }
  }

  /** Un sprite de pie con la hoja `sprite`, en la sala `v` (o fuera de las salas, como la heroína). */
  crearActor(v: VistaSala | null, sprite: Sprite): Actor {
    const tam = TAM;
    const { frameWidth, frameHeight, anchor } = sprite.datos;
    const tex = new THREE.Texture(sprite.imagen as HTMLImageElement);
    ajustarPixelArt(tex);
    const img = sprite.imagen as HTMLImageElement;
    const columnas = (img.naturalWidth || img.width) / frameWidth;
    const filas = (img.naturalHeight || img.height) / frameHeight;
    tex.repeat.set(1 / columnas, 1 / filas);
    const malla = carton(
      new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }),
      frameWidth / tam,
      frameHeight / tam,
      (frameHeight - anchor.y) / tam,
      (frameWidth / 2 - anchor.x) / tam,
    );
    malla.rotation.x = -this.giro;
    malla.scale.y = this.estirar;
    (v?.grupo ?? this.escena).add(malla);
    return { malla, tex, sprite, columnas, filas };
  }

  /** Coloca un actor con los pies en (x, y) píxeles del juego y el fotograma de `animacion` a los `tiempo` segundos. */
  colocarActor(
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
    a.tex.offset.set(
      columna / a.columnas,
      1 - (a.sprite.datos.directions[direccion] + 1) / a.filas,
    );
  }

  /**
   * Dibuja la sala `v` con la heroína en (x, y) píxeles. `opacidad` la deja medio transparente o la esconde
   * (parpadeo tras un combate) y `cerradas` dice qué salidas tienen la barrera puesta.
   */
  dibujar(
    v: VistaSala,
    sprite: Sprite,
    x: number,
    y: number,
    animacion: string,
    direccion: Direccion,
    tiempoAnimacion: number,
    opacidad: number,
    cerradas: number,
    tiempo: number,
  ): void {
    if (v !== this.vista) this.mostrar(v);
    if (this.heroe?.sprite !== sprite) this.cambiarHeroina(sprite);
    const h = this.heroe!;
    // Al cambiar de equipo, la hoja de la heroína es otra (recoloreada): se cambia la imagen de la textura.
    if (h.tex.image !== h.sprite.imagen) {
      h.tex.image = h.sprite.imagen;
      h.tex.needsUpdate = true;
    }
    this.colocarActor(h, x, y, animacion, direccion, tiempoAnimacion);
    h.malla.visible = opacidad > 0;
    h.malla.material.opacity = opacidad;
    for (const b of v.barreras) b.obj.visible = (cerradas & b.lado) !== 0;
    const z = this.zona;
    if (z) for (const p of v.piezas.values()) pintarPieza(p, z.imagenes, z.tam, tiempo);
    v.fuente?.actualizar(tiempo);
    v.hundidos?.actualizar(tiempo);
    this.puntuales.forEach((luz, i) => {
      const l = v.luces[i];
      if (!l) {
        luz.intensity = 0;
        return;
      }
      const p = l.luz.parpadeo;
      const t = tiempo + l.fase;
      luz.intensity =
        l.luz.intensidad * (1 + p * Math.sin(t * 13) + p * 0.6 * Math.sin(t * 7.3 + 1));
    });

    // La franja enfocada y el hueco de transparencia siguen a la heroína.
    const u = uniformesTransparencia;
    u.uHeroe.value.set(x / TAM, 0, y / TAM);
    this.pantalla.set(x / TAM, 0.5, y / TAM).project(this.camara);
    const lienzo = this.renderer.domElement;
    u.uHeroePx.value.set(
      ((this.pantalla.x + 1) / 2) * lienzo.width,
      ((this.pantalla.y + 1) / 2) * lienzo.height,
    );
    this.tiltH.uniforms.r!.value = (this.pantalla.y + 1) / 2;
    this.tiltV.uniforms.r!.value = (this.pantalla.y + 1) / 2;
    this.composer.render();
  }

  /** Cambia la sala que se ve: su grupo, la cámara centrada en ella y sus luces. */
  private mostrar(v: VistaSala): void {
    if (this.vista) this.escena.remove(this.vista.grupo);
    this.vista = v;
    this.escena.add(v.grupo);
    const { sala } = v;
    const centro = new THREE.Vector3(sala.ancho / 2, 0, sala.alto / 2);
    const { inclinacion, fov, margen } = this.a.camara;
    const angulo = THREE.MathUtils.degToRad(inclinacion);
    // La distancia, para que quepan las casillas de ancho de la sala.
    const verAncho = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (ANCHO / ALTO);
    const distancia = sala.ancho / 2 / verAncho + margen;
    this.camara.position.set(
      centro.x,
      Math.sin(angulo) * distancia,
      centro.z + Math.cos(angulo) * distancia,
    );
    this.camara.lookAt(centro);
    // La luz principal, desde arriba a la izquierda y del lado de la cámara, como la luz pintada en el arte:
    // desde detrás dejaba a oscuras la cara de los sprites.
    this.principal.position.set(centro.x - 6, 12, centro.z + 5);
    this.principal.target.position.copy(centro);
    this.puntuales.forEach((luz, i) => {
      // Las que sobran se quedan apagadas, no se quitan: cambiar cuántas hay recompila los materiales.
      const l = v.luces[i];
      if (!l) return;
      luz.color.set(l.luz.color);
      luz.distance = l.luz.alcance;
      luz.position.set(l.x, l.luz.alto, l.z);
      luz.castShadow = i === 0 && l.luz.sombra;
    });
  }

  /** La heroína de otra partida: su actor, con la hoja nueva. */
  private cambiarHeroina(sprite: Sprite): void {
    if (this.heroe) {
      this.escena.remove(this.heroe.malla);
      this.heroe.malla.geometry.dispose();
      this.heroe.malla.material.dispose();
      this.heroe.tex.dispose();
    }
    this.heroe = this.crearActor(null, sprite);
    // Transparente para poder dejarla a media opacidad (con menos movimiento, tras un combate).
    this.heroe.malla.material.transparent = true;
  }

  /** Vuelve a montar las luces de la sala que se ve (al aparecer el portal). */
  refrescarLuces(): void {
    const v = this.vista;
    this.vista = null;
    if (v) this.mostrar(v);
  }
}

/** Plano de `ancho` × `alto` casillas con el origen `pie` casillas por encima de su borde inferior; `dx` lo corre a la derecha. */
function carton(
  material: THREE.MeshLambertMaterial,
  ancho: number,
  alto: number,
  pie: number,
  dx = 0,
): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial> {
  const geometria = new THREE.PlaneGeometry(ancho, alto);
  geometria.translate(dx, alto / 2 - pie, 0);
  const plano = new THREE.Mesh(geometria, material);
  plano.castShadow = true;
  return plano;
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
