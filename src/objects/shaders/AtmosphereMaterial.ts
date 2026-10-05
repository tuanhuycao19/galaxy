import * as THREE from 'three';

/**
 * Thin glowing shell around a planet: a Fresnel rim, only on the side
 * facing the Sun (which sits at the world origin). Additive, so it
 * brightens whatever is behind it.
 */
export function createAtmosphereMaterial(color: number, intensity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        #include <logdepthbuf_fragment>
        vec3 n = normalize(vWorldNormal);
        vec3 v = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
        float lit = smoothstep(-0.25, 0.5, dot(n, normalize(-vWorldPos)));
        gl_FragColor = vec4(uColor * fresnel * lit * uIntensity, 1.0);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}
