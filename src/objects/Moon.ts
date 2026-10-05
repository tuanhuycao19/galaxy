import * as THREE from 'three';
import { MOON } from '../data/planets';
import { bodyRadius, moonDistance, type ScaleMode } from '../data/scale';
import { formatDuration, formatKm } from '../ui/format';
import { loadTexture } from './assets';
import type { CelestialBody, InfoRow } from './CelestialBody';

const DEG = Math.PI / 180;

/**
 * The Moon on a circular orbit around its parent. It is a child of a
 * rotating pivot, which also keeps the same face pointing at Earth (tidal
 * locking). Add `orbit` to the parent planet's object.
 */
export class Moon implements CelestialBody {
  readonly name = MOON.name;
  readonly description = MOON.description;
  readonly orbit = new THREE.Group();
  readonly object: THREE.Mesh;
  radius = 0;
  private readonly pivot = new THREE.Group();

  constructor(
    private readonly parent: { radius: number },
    mode: ScaleMode,
  ) {
    this.orbit.name = `${MOON.name} (quỹ đạo)`;
    this.orbit.rotation.x = MOON.inclinationDeg * DEG;
    this.orbit.add(this.pivot);

    this.object = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.MeshStandardMaterial({ map: loadTexture(MOON.map), roughness: 1, metalness: 0 }),
    );
    this.object.name = MOON.name;
    // Turn the near side (texture centre) towards the parent.
    this.object.rotation.y = Math.PI / 2;
    this.pivot.add(this.object);
    this.setScaleMode(mode);
  }

  get pickTarget(): THREE.Object3D {
    return this.object;
  }

  get viewDistance(): number {
    return this.radius * 5;
  }

  /** Call after the parent planet has been rescaled. */
  setScaleMode(mode: ScaleMode): void {
    this.radius = bodyRadius(MOON.radiusKm, mode);
    this.object.scale.setScalar(this.radius);
    this.object.position.x = moonDistance(MOON.distanceKm, this.parent.radius, mode);
  }

  update(days: number): void {
    this.pivot.rotation.y = (days / MOON.orbitalPeriodDays) * Math.PI * 2;
  }

  info(): InfoRow[] {
    return [
      { label: 'Bán kính', value: formatKm(MOON.radiusKm) },
      { label: 'Cách Trái Đất', value: formatKm(MOON.distanceKm) },
      { label: 'Chu kỳ quỹ đạo', value: formatDuration(MOON.orbitalPeriodDays) },
      { label: 'Tự quay', value: 'Đồng bộ với quỹ đạo' },
    ];
  }
}
