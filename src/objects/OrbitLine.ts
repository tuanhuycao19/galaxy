import * as THREE from 'three';
import { toScenePosition } from '../data/scale';
import { orbitPath, type OrbitalElements } from '../physics/orbit';

const SEGMENTS = 512;

export function createOrbitLine(elements: OrbitalElements): THREE.LineLoop {
  const points = orbitPath(elements, SEGMENTS).map((p) => toScenePosition(p, new THREE.Vector3()));
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0x5577aa,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
}
