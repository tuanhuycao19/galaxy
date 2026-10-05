import * as THREE from 'three';
import { SIMPLEX_NOISE_3D } from './simplexNoise';

/**
 * Animated solar surface: drifting granulation from layered simplex noise
 * plus limb darkening. Output is HDR (brighter than 1.0) so the bloom pass,
 * whose threshold sits at 1.0, makes only the Sun glow.
 */
export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.35 },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vObjectPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      void main() {
        vObjectPos = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vObjectPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      ${SIMPLEX_NOISE_3D}
      void main() {
        #include <logdepthbuf_fragment>
        vec3 p = normalize(vObjectPos);
        float n = 0.5 * snoise(p * 3.0 + vec3(0.0, 0.0, uTime * 0.04))
                + 0.3 * snoise(p * 8.0 - vec3(uTime * 0.07))
                + 0.2 * snoise(p * 22.0 + vec3(uTime * 0.12, 0.0, 0.0));
        float t = clamp(0.5 + 0.6 * n, 0.0, 1.0);
        vec3 deep = vec3(0.85, 0.22, 0.02);
        vec3 mid = vec3(1.0, 0.58, 0.14);
        vec3 hot = vec3(1.0, 0.86, 0.52);
        vec3 color = mix(mix(deep, mid, smoothstep(0.0, 0.55, t)), hot, smoothstep(0.55, 1.0, t));
        // Limb darkening: the disc edge is cooler and dimmer.
        float mu = clamp(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0, 1.0);
        float limb = 0.4 + 0.6 * pow(mu, 0.45);
        gl_FragColor = vec4(color * limb * uIntensity, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
