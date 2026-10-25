import * as THREE from 'three';

/**
 * Lo que queda entre la cámara y la heroína se vuelve transparente: los fragmentos más cerca de la cámara
 * que ella (Z del mundo mayor que la suya) y dentro de un círculo de pantalla alrededor de ella se descartan
 * con un tramado ordenado. Así no hace falta ordenar transparencias y vale igual para árboles, muros y sprites.
 */
export const uniformesTransparencia = {
  /** Posición de la heroína en el mundo (casillas) y en pantalla (píxeles del dibujo). */
  uHeroe: { value: new THREE.Vector3() },
  uHeroePx: { value: new THREE.Vector2() },
  uRadioPx: { value: 1 },
  /** Casillas por delante de la heroína desde las que empieza, y opacidad que se quita como mucho. */
  uMargen: { value: 0 },
  uMaximo: { value: 0 },
};

const VERTEX_DECL = /* glsl */ `varying vec3 vPosMundo;
void main() {`;
const VERTEX_POS = /* glsl */ `#include <project_vertex>
{
  vec4 pm = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    pm = instanceMatrix * pm;
  #endif
  vPosMundo = (modelMatrix * pm).xyz;
}`;
const FRAGMENT_DECL = /* glsl */ `varying vec3 vPosMundo;
uniform vec3 uHeroe;
uniform vec2 uHeroePx;
uniform float uRadioPx;
uniform float uMargen;
uniform float uMaximo;
const float BAYER[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
void main() {`;
const FRAGMENT_CORTE = /* glsl */ `#include <clipping_planes_fragment>
if (vPosMundo.z > uHeroe.z + uMargen) {
  vec2 d = (gl_FragCoord.xy - uHeroePx) / uRadioPx;
  float f = min(uMaximo, (1.0 - dot(d, d)) * 2.0);
  ivec2 p = ivec2(mod(gl_FragCoord.xy, 4.0));
  if (f > (BAYER[p.x + p.y * 4] + 0.5) / 16.0) discard;
}`;

function parche(shader: THREE.WebGLProgramParametersWithUniforms): void {
  Object.assign(shader.uniforms, uniformesTransparencia);
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', VERTEX_DECL)
    .replace('#include <project_vertex>', VERTEX_POS);
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', FRAGMENT_DECL)
    .replace('#include <clipping_planes_fragment>', FRAGMENT_CORTE);
}

/** Hace que el material se vuelva transparente cuando tapa a la heroína. Devuelve el mismo material. */
export function transparentar<M extends THREE.Material>(material: M): M {
  material.onBeforeCompile = parche;
  return material;
}
