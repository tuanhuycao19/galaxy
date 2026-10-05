import * as THREE from 'three';
import { createSaturnRingTexture } from './textures/factory';

/**
 * Flat ring in the planet's equatorial plane (local XZ), sized in planet
 * radii so it scales together with the planet.
 */
export function createRings(innerKm: number, outerKm: number, planetRadiusKm: number): THREE.Mesh {
  const inner = innerKm / planetRadiusKm;
  const outer = outerKm / planetRadiusKm;
  const geometry = new THREE.RingGeometry(inner, outer, 128, 1);

  // RingGeometry maps UVs as a square decal; remap so u runs from inner to outer edge.
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  geometry.rotateX(-Math.PI / 2);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: createSaturnRingTexture(innerKm, outerKm),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    }),
  );
  mesh.name = 'Vành đai';
  return mesh;
}
