import * as THREE from 'three';
import { SUN_SURFACE } from '../data/planets';
import { SUN_RADIUS } from '../data/scale';
import { applySurfaceTexture } from './textures/factory';

/** Sidereal rotation at the solar equator. */
const ROTATION_PERIOD_DAYS = 25.38;

export class Sun {
  readonly object = new THREE.Group();
  private readonly sphere: THREE.Mesh;

  constructor() {
    this.object.name = 'Mặt Trời';

    const material = new THREE.MeshBasicMaterial();
    applySurfaceTexture(material, SUN_SURFACE, 1);
    this.sphere = new THREE.Mesh(new THREE.SphereGeometry(SUN_RADIUS, 64, 32), material);
    this.object.add(this.sphere);

    // decay = 0 keeps outer planets lit despite the large compressed distances.
    this.object.add(new THREE.PointLight(0xffffff, 3, 0, 0));
  }

  update(days: number): void {
    this.sphere.rotation.y = (days / ROTATION_PERIOD_DAYS) * Math.PI * 2;
  }
}
