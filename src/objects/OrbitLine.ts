import * as THREE from 'three';
import { toScenePosition, type ScaleMode } from '../data/scale';
import { orbitPath, type OrbitalElements } from '../physics/orbit';

const SEGMENTS = 512;

export function createOrbitLine(elements: OrbitalElements, mode: ScaleMode): THREE.LineLoop {
  return new THREE.LineLoop(
    buildGeometry(elements, mode),
    new THREE.LineBasicMaterial({
      color: 0x5577aa,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
}

export function updateOrbitLine(
  line: THREE.LineLoop,
  elements: OrbitalElements,
  mode: ScaleMode,
): void {
  line.geometry.dispose();
  line.geometry = buildGeometry(elements, mode);
}

function buildGeometry(elements: OrbitalElements, mode: ScaleMode): THREE.BufferGeometry {
  const points = orbitPath(elements, SEGMENTS).map((p) =>
    toScenePosition(p, mode, new THREE.Vector3()),
  );
  return new THREE.BufferGeometry().setFromPoints(points);
}
