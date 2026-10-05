import * as THREE from 'three';
import { MOON } from '../data/planets';
import { scaledRadius } from '../data/scale';
import { loadTexture } from './assets';

const DEG = Math.PI / 180;

/**
 * The Moon on a circular orbit around its parent. Distance is compressed
 * like everything else; it is a child of a rotating pivot, which also keeps
 * the same face pointing at Earth (tidal locking).
 */
export class Moon {
  readonly object = new THREE.Group();
  private readonly pivot = new THREE.Group();

  constructor(parentRadius: number) {
    this.object.name = MOON.name;
    this.object.rotation.x = MOON.inclinationDeg * DEG;
    this.object.add(this.pivot);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(scaledRadius(MOON.radiusKm), 32, 16),
      new THREE.MeshStandardMaterial({ map: loadTexture(MOON.map), roughness: 1, metalness: 0 }),
    );
    mesh.name = MOON.name;
    mesh.position.x = parentRadius * 2.6;
    // Turn the near side (texture centre) towards the parent.
    mesh.rotation.y = Math.PI / 2;
    this.pivot.add(mesh);
  }

  update(days: number): void {
    this.pivot.rotation.y = (days / MOON.orbitalPeriodDays) * Math.PI * 2;
  }
}
