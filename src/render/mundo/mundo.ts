import * as THREE from 'three';
import { crearDesenfoque } from './desenfoque';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { crearAzar } from '../../core/azar';
import type { ObjetoSala, Sala, Salida, Tile } from '../../core/sala';
import type { Direccion, Hd2dJson, LuzHd2d, ZonaHd2d } from '../../core/types';
import { N, S } from '../../core/zona';
import { cargarAjustes, guardarAjustes } from '../almacen';
import { alRedimensionar, aVentana, rectSala, SALA_ALTO, SALA_ANCHO } from '../pantalla';
import type { Sprite } from '../recursos';
import { dibujarTile } from '../sala';
import {
  crearBorde,
  crearExterior,
  materialesBosque,
  type MaterialesBosque,
  type SombraSuelo,
} from './borde';
import { crearFuente } from './fuente';
import { crearHundidos } from './hundidos';
import { crearBarrera, crearModelo } from './modelos';
import { ajustarPixelArt, cuentaColores, pintar, textura } from './texturas';
import { transparentar, uniformesTransparencia } from './transparencia';

// Calidad elegida en la pausa (como el sonido): el mundo la aplica al dibujar el siguiente fotograma.
let calidadAlta = !cargarAjustes().calidadBaja;

export const esCalidadAlta = (): boolean => calidadAlta;

/** Alta, con desenfoque y sombras; baja, sin ellos. Se guarda en los ajustes. */
export function ponerCalidadAlta(alta: boolean): void {
  calidadAlta = alta;
  guardarAjustes({ calidadBaja: !alta });
}

/** Luces puntuales que hay siempre en la escena: cambiar cuántas hay obliga a recompilar los materiales. */
const PUNTUALES = 4;
/** Píxeles de una casilla (el tileSize de todos los tilesets): una unidad del mundo. */
const TAM = 32;

/** Un sprite de pie (heroína o monstruo) con su hoja de animaciones; el fotograma se elige moviendo la textura. */
/** Dibuja la sala de fondo del combate: tiempo de sus animaciones, temblor en píxeles y luz de un proyectil. */
export type FondoSala = (
  tiempo: number,
  temblor: number,
  luz: { nombre: string; x: number; y: number } | null,
) => void;

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
  /** Monstruos de la sala (sprites de pie), que no salen en el fondo del combate. */
  actores: Actor[];
  /** Punto al que mira la cámara y casillas de ancho que caben, en casillas (la sala entera, salvo en la portada). */
  encuadre: { x: number; z: number; ancho: number };
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
  /** Vectores de trabajo para proyectar a pantalla y al revés (sin crear nada en el bucle). */
  private readonly pantalla = new THREE.Vector3();
  private readonly rayo = new THREE.Vector3();
  /** Desenfoque normal del tilt-shift, en fracción de pantalla (depende del tamaño del dibujo). */
  private desenfoqueH = 0;
  private desenfoqueV = 0;
  /** X de la cámara en la sala que se ve, para volver a ella tras el temblor. */
  private camaraX = 0;
  /** Calidad aplicada ahora mismo (null = aún ninguna). */
  private alta: boolean | null = null;
  /** Luz del proyectil de la maga sobre la sala de fondo del combate; apagada el resto del tiempo. */
  private readonly luzCombate = new THREE.PointLight(0xffffff, 0, 1, 1.5);
  /** Dónde cae el canvas 2D (la sala) dentro de la ventana, en píxeles CSS. */
  private sala2d = { x: 0, y: 0, ancho: SALA_ANCHO, alto: SALA_ALTO };

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
    this.camara = new THREE.PerspectiveCamera(fov, SALA_ANCHO / SALA_ALTO, 0.1, 200);
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

    this.escena.add(this.luzCombate);
    const t = a.transparencia;
    uniformesTransparencia.uMargen.value = t.margen;
    uniformesTransparencia.uMaximo.value = t.maximo;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.escena, this.camara));
    this.tiltH = new ShaderPass(crearDesenfoque(true));
    this.tiltV = new ShaderPass(crearDesenfoque(false));
    for (const p of [this.tiltH, this.tiltV]) {
      p.uniforms.centro!.value = new THREE.Vector2();
      p.uniforms.mitad!.value = new THREE.Vector2();
      p.uniforms.fuerza!.value = a.bordes.fuerza;
    }
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(SALA_ANCHO, SALA_ALTO),
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
    alRedimensionar(() => this.ajustarTamano());
    this.ajustarTamano();
  }

  /**
   * Toda la ventana, a la resolución de la pantalla con un tope. La sala sigue cayendo justo bajo el canvas 2D
   * (centrado): la cámara se calcula para él y el encuadre se ensancha hasta los bordes con `setViewOffset`.
   */
  private ajustarTamano(): void {
    const { x, y, ancho, alto } = rectSala();
    const densidad = Math.min(window.devicePixelRatio || 1, this.a.resolucionMaxima);
    const w = Math.round(innerWidth * densidad);
    const h = Math.round(innerHeight * densidad);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${innerWidth}px`;
    this.renderer.domElement.style.height = `${innerHeight}px`;
    this.composer.setSize(w, h);
    this.camara.setViewOffset(ancho, alto, -x, -y, innerWidth, innerHeight);
    this.sala2d = { x, y, ancho, alto };
    this.desenfoqueH = this.a.desenfoque / w;
    this.desenfoqueV = this.a.desenfoque / h;
    uniformesTransparencia.uRadioPx.value =
      (this.a.transparencia.radio * ancho * densidad) / (SALA_ANCHO / 32);
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

  /** Muestra u oculta el lienzo 3D (los menús no lo usan). */
  verLienzo(visible: boolean): void {
    this.renderer.domElement.style.visibility = visible ? 'visible' : 'hidden';
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

  /** Monta una sala en 3D. `semilla` fija el azar de su decorado; `encuadre`, si no se ve entera. */
  montar(
    sala: Sala,
    salidas: readonly Salida[],
    semilla: number,
    encuadre = { x: sala.ancho / 2, z: sala.alto / 2, ancho: sala.ancho },
  ): VistaSala {
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
      encuadre,
      actores: [],
    };

    const borde = crearBorde(sala, aspecto.borde, imagenes, catalogo, tam, z.bosque, azar);
    grupo.add(borde.grupo);

    // Fuera de la sala, para llenar la pantalla: el mismo borde y suelo de la zona, con un hueco donde va la sala.
    const m = this.a.exterior;
    const exterior = crearExterior(sala, m, aspecto.borde, imagenes, catalogo, tam, z.bosque, azar);
    grupo.add(exterior.grupo);
    const suelos = [...catalogo.values()].filter((t) => t.layer === 'suelo' && t.weight);
    const peso = suelos.reduce((s, t) => s + (t.weight ?? 0), 0);
    const anchoFuera = sala.ancho + 2 * m.x;
    const altoFuera = sala.alto + m.arriba + m.abajo;
    const lienzoFuera = pintar(anchoFuera, altoFuera, tam, (ctx) => {
      for (let i = 0; i < anchoFuera * altoFuera; i++) {
        let r = azar() * peso;
        const t = suelos.find((s) => (r -= s.weight ?? 0) < 0) ?? suelos[0];
        if (t)
          dibujarTile(
            ctx,
            imagenes,
            t,
            tam,
            (i % anchoFuera) * tam,
            Math.floor(i / anchoFuera) * tam,
          );
      }
      pintarSombras(ctx, exterior.sombras, tam, m.x, m.arriba);
      ctx.clearRect(m.x * tam, m.arriba * tam, sala.ancho * tam, sala.alto * tam);
    });
    const planoFuera = new THREE.Mesh(
      new THREE.PlaneGeometry(anchoFuera, altoFuera),
      new THREE.MeshLambertMaterial({ map: textura(lienzoFuera), alphaTest: 0.5 }),
    );
    planoFuera.rotation.x = -Math.PI / 2;
    planoFuera.position.set(sala.ancho / 2, 0, altoFuera / 2 - m.arriba);
    planoFuera.receiveShadow = true;
    grupo.add(planoFuera);

    // Suelo: un plano con los tiles de fondo; bajo el borde, el suelo de la zona con las sombras de los árboles.
    const suelo = suelos[0];
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
      pintarSombras(ctx, borde.sombras, tam, 0, 0);
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
      if (o === plano || o === planoFuera || (hundidos && o.parent === hundidos.grupo)) return;
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

  /** Los objetos naturales del Bosque, con su modelo con relieve; los demás, sprite de pie con su dibujo y animación. Y su luz, si lleva. */
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
      // Píxeles del dibujo por píxel lógico de la sala.
      const escala = (this.sala2d.ancho * this.renderer.domElement.width) / innerWidth / SALA_ANCHO;
      const fuente = crearFuente(f, v.azar, escala);
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
    const actor = { malla, tex, sprite, columnas, filas };
    v?.actores.push(actor);
    return actor;
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
    this.aplicarCalidad();
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
    this.animar(v, tiempo);
    this.luzCombate.intensity = 0;
    this.camara.position.x = this.camaraX;

    // La franja enfocada y el hueco de transparencia siguen a la heroína.
    const u = uniformesTransparencia;
    u.uHeroe.value.set(x / TAM, 0, y / TAM);
    this.pantalla.set(x / TAM, 0.5, y / TAM).project(this.camara);
    const lienzo = this.renderer.domElement;
    u.uHeroePx.value.set(
      ((this.pantalla.x + 1) / 2) * lienzo.width,
      ((this.pantalla.y + 1) / 2) * lienzo.height,
    );
    this.enfocarBordes(v);
    this.composer.render();
  }

  /**
   * Dibuja la sala `v` de fondo del combate o de la presentación de un jefe: sin la heroína ni los monstruos
   * del mapa, más desenfocada y, si se pide, temblando `temblor` píxeles a los lados y con la luz de un
   * proyectil (de `luces`) en el punto (x, y) de la pantalla.
   */
  dibujarFondo(
    v: VistaSala,
    tiempo: number,
    temblor: number,
    luz: { nombre: string; x: number; y: number } | null,
  ): void {
    this.aplicarCalidad();
    if (v !== this.vista) this.mostrar(v);
    if (this.heroe) this.heroe.malla.visible = false;
    for (const a of v.actores) a.malla.visible = false;
    this.animar(v, tiempo);
    this.camara.position.x = this.camaraX + (temblor / SALA_ANCHO) * v.encuadre.ancho;
    const datos = luz ? this.a.luces[luz.nombre] : undefined;
    if (luz && datos) {
      // El punto del canvas 2D, llevado a la ventana y de ahí al mundo a la altura de la luz.
      const [cx, cy] = aVentana(luz.x, luz.y);
      const px = cx / innerWidth;
      const py = cy / innerHeight;
      this.pantalla.set(px * 2 - 1, 1 - py * 2, 0.5).unproject(this.camara);
      this.rayo.copy(this.pantalla).sub(this.camara.position).normalize();
      const t = (datos.alto - this.camara.position.y) / this.rayo.y;
      this.luzCombate.position.copy(this.camara.position).addScaledVector(this.rayo, t);
      this.luzCombate.color.set(datos.color);
      this.luzCombate.distance = datos.alcance;
      this.luzCombate.intensity = datos.intensidad;
    } else {
      this.luzCombate.intensity = 0;
    }
    // Nada se vuelve transparente: el hueco se va fuera de la pantalla.
    uniformesTransparencia.uHeroePx.value.set(-1e5, -1e5);
    this.enfocar(this.a.combate.foco, this.a.combate.desenfoque);
    this.composer.render();
  }

  /**
   * Si ha cambiado la calidad: en baja, sin desenfoque ni sombras. Quitar las sombras cambia las luces, y three.js
   * recompila los materiales una vez (luego los guarda).
   */
  private aplicarCalidad(): void {
    if (this.alta === calidadAlta) return;
    this.alta = calidadAlta;
    this.tiltH.enabled = this.tiltV.enabled = calidadAlta;
    this.principal.castShadow = calidadAlta;
    const v = this.vista;
    this.vista = null;
    if (v) this.mostrar(v);
  }

  /** Lo que se mueve solo: tiles animados, agua y luces que parpadean. */
  private animar(v: VistaSala, tiempo: number): void {
    const z = this.zona;
    if (z) for (const p of v.piezas.values()) pintarPieza(p, z.imagenes, z.tam, tiempo);
    v.fuente?.actualizar(tiempo);
    v.hundidos?.actualizar(tiempo);
    for (let i = 0; i < this.puntuales.length; i++) {
      const luz = this.puntuales[i]!;
      const l = v.luces[i];
      if (!l) {
        luz.intensity = 0;
        continue;
      }
      const p = l.luz.parpadeo;
      const t = tiempo + l.fase;
      luz.intensity =
        l.luz.intensidad * (1 + p * Math.sin(t * 13) + p * 0.6 * Math.sin(t * 7.3 + 1));
    }
  }

  /** Franja enfocada del tilt-shift (0 abajo, 1 arriba) y cuántas veces el desenfoque normal. */
  private enfocar(franja: number, veces: number): void {
    this.tiltH.uniforms.r!.value = franja;
    this.tiltV.uniforms.r!.value = franja;
    this.tiltH.uniforms.px!.value = this.desenfoqueH * veces;
    this.tiltV.uniforms.px!.value = this.desenfoqueV * veces;
    this.tiltH.uniforms.bordes!.value = this.tiltV.uniforms.bordes!.value = 0;
  }

  /**
   * Desenfoque del mapa: la zona jugable (el suelo de dentro de los muros, hasta la altura de los monstruos) se
   * ve nítida y solo se emborronan los árboles o muros de alrededor.
   */
  private enfocarBordes(v: VistaSala): void {
    const { muro, alto } = this.a.bordes;
    const { ancho, alto: largo } = v.sala;
    this.camara.updateMatrixWorld();
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const x of [muro, ancho - muro]) {
      for (const z of [muro, largo - muro]) {
        for (const y of [0, alto]) {
          this.pantalla.set(x, y, z).project(this.camara);
          x0 = Math.min(x0, this.pantalla.x);
          x1 = Math.max(x1, this.pantalla.x);
          y0 = Math.min(y0, this.pantalla.y);
          y1 = Math.max(y1, this.pantalla.y);
        }
      }
    }
    for (const p of [this.tiltH, this.tiltV]) {
      p.uniforms.centro!.value.set((x0 + x1) / 4 + 0.5, (y0 + y1) / 4 + 0.5);
      p.uniforms.mitad!.value.set((x1 - x0) / 4, (y1 - y0) / 4);
      p.uniforms.bordes!.value = 1;
    }
    this.tiltH.uniforms.px!.value = this.desenfoqueH;
    this.tiltV.uniforms.px!.value = this.desenfoqueV;
  }

  /** Cambia la sala que se ve: su grupo, la cámara centrada en ella y sus luces. */
  private mostrar(v: VistaSala): void {
    if (this.vista) this.escena.remove(this.vista.grupo);
    this.vista = v;
    this.escena.add(v.grupo);
    const { encuadre } = v;
    const centro = new THREE.Vector3(encuadre.x, 0, encuadre.z);
    const { inclinacion, fov, margen } = this.a.camara;
    const angulo = THREE.MathUtils.degToRad(inclinacion);
    // La distancia, para que quepan las casillas de ancho del encuadre.
    const verAncho = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * (SALA_ANCHO / SALA_ALTO);
    const distancia = encuadre.ancho / 2 / verAncho + margen;
    this.camara.position.set(
      centro.x,
      Math.sin(angulo) * distancia,
      centro.z + Math.cos(angulo) * distancia,
    );
    this.camara.lookAt(centro);
    this.camaraX = this.camara.position.x;
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
      luz.castShadow = i === 0 && l.luz.sombra && calidadAlta;
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

/** Sombras redondas en el suelo, corridas `dx`, `dz` casillas (el lienzo de fuera empieza antes que la sala). */
function pintarSombras(
  ctx: CanvasRenderingContext2D,
  sombras: readonly SombraSuelo[],
  tam: number,
  dx: number,
  dz: number,
): void {
  for (const s of sombras) {
    const x = (s.x + dx) * tam;
    const z = (s.z + dz) * tam;
    const r = s.radio * tam;
    const g = ctx.createRadialGradient(x, z, 0, x, z, r);
    g.addColorStop(0, `rgba(10, 18, 12, ${s.fuerza})`);
    g.addColorStop(1, 'rgba(10, 18, 12, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, z - r, r * 2, r * 2);
  }
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
