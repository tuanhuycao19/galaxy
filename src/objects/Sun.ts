import * as THREE from 'three';
import { PLANETS, SUN, SUN_SURFACE } from '../data/planets';
import { sunRadius, type ScaleMode } from '../data/scale';
import { formatDuration, formatKm, formatNumber } from '../ui/format';
import type { CelestialBody, InfoRow } from './CelestialBody';
import { applySurfaceTexture } from './textures/factory';

export class Sun implements CelestialBody {
  readonly name = SUN.name;
  readonly description = SUN.description;
  readonly object = new THREE.Group();
  readonly pickTarget: THREE.Mesh;
  radius = 0;

  constructor(mode: ScaleMode) {
    this.object.name = SUN.name;

    const material = new THREE.MeshBasicMaterial();
    applySurfaceTexture(material, SUN_SURFACE, 1);
    this.pickTarget = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
    this.pickTarget.name = SUN.name;
    this.object.add(this.pickTarget);

    // decay = 0 keeps outer planets lit despite the large compressed distances.
    this.object.add(new THREE.PointLight(0xffffff, 3, 0, 0));
    this.setScaleMode(mode);
  }

  get viewDistance(): number {
    return this.radius * 5;
  }

  setScaleMode(mode: ScaleMode): void {
    this.radius = sunRadius(mode);
    this.pickTarget.scale.setScalar(this.radius);
  }

  update(days: number): void {
    this.pickTarget.rotation.y = (days / SUN.rotationPeriodDays) * Math.PI * 2;
  }

  info(): InfoRow[] {
    return [
      { label: 'Bán kính', value: formatKm(SUN.radiusKm) },
      { label: 'Nhiệt độ bề mặt', value: `${formatNumber(SUN.surfaceTemperatureK)} K` },
      { label: 'Tự quay (xích đạo)', value: formatDuration(SUN.rotationPeriodDays) },
      { label: 'Số hành tinh', value: String(PLANETS.length) },
    ];
  }
}
