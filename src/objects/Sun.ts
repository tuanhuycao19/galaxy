import * as THREE from 'three';
import { SUN_RADIUS } from '../data/scale';

export function createSun(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Mặt Trời';

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS, 64, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc33 }),
  );
  group.add(sphere);

  // decay = 0 keeps outer planets lit despite the large compressed distances.
  const light = new THREE.PointLight(0xffffff, 3, 0, 0);
  group.add(light);

  return group;
}
