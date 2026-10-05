import * as THREE from 'three';
import type { PlanetData } from '../data/planets';
import { scaledDistance, scaledRadius } from '../data/scale';

export function createPlanet(data: PlanetData, orbitAngle: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(scaledRadius(data.radiusKm), 48, 24),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 1, metalness: 0 }),
  );
  mesh.name = data.name;

  const distance = scaledDistance(data.semiMajorAxisAu);
  mesh.position.set(Math.cos(orbitAngle) * distance, 0, -Math.sin(orbitAngle) * distance);
  mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg);

  return mesh;
}
