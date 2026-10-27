import type { Vector2 } from 'three';

/**
 * Desenfoque de dos pasadas (horizontal y vertical, 9 muestras) con dos modos:
 * - `bordes` 0: tilt-shift, más desenfoque cuanto más lejos de la línea `r` (el del fondo del combate);
 * - `bordes` 1: nada dentro del rectángulo (`centro`, `mitad`, en coordenadas de pantalla 0 a 1) y cada vez
 *   más fuera de él, `fuerza` veces la distancia (el del mapa: solo se emborrona lo de alrededor de la sala).
 */
export function crearDesenfoque(horizontal: boolean): {
  name: string;
  uniforms: {
    tDiffuse: { value: unknown };
    px: { value: number };
    r: { value: number };
    bordes: { value: number };
    centro: { value: Vector2 | null };
    mitad: { value: Vector2 | null };
    fuerza: { value: number };
  };
  vertexShader: string;
  fragmentShader: string;
} {
  const dir = horizontal ? 'vec2( 1.0, 0.0 )' : 'vec2( 0.0, 1.0 )';
  return {
    name: horizontal ? 'DesenfoqueH' : 'DesenfoqueV',
    uniforms: {
      tDiffuse: { value: null },
      px: { value: 0 },
      r: { value: 0.5 },
      bordes: { value: 0 },
      centro: { value: null },
      mitad: { value: null },
      fuerza: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float px;
      uniform float r;
      uniform float bordes;
      uniform vec2 centro;
      uniform vec2 mitad;
      uniform float fuerza;
      varying vec2 vUv;
      void main() {
        float tilt = abs( r - vUv.y );
        float fuera = length( max( abs( vUv - centro ) - mitad, 0.0 ) ) * fuerza;
        float paso = px * mix( tilt, fuera, bordes );
        vec2 d = ${dir} * paso;
        vec4 sum = vec4( 0.0 );
        sum += texture2D( tDiffuse, vUv - 4.0 * d ) * 0.051;
        sum += texture2D( tDiffuse, vUv - 3.0 * d ) * 0.0918;
        sum += texture2D( tDiffuse, vUv - 2.0 * d ) * 0.12245;
        sum += texture2D( tDiffuse, vUv - 1.0 * d ) * 0.1531;
        sum += texture2D( tDiffuse, vUv ) * 0.1633;
        sum += texture2D( tDiffuse, vUv + 1.0 * d ) * 0.1531;
        sum += texture2D( tDiffuse, vUv + 2.0 * d ) * 0.12245;
        sum += texture2D( tDiffuse, vUv + 3.0 * d ) * 0.0918;
        sum += texture2D( tDiffuse, vUv + 4.0 * d ) * 0.051;
        gl_FragColor = sum;
      }`,
  };
}
