import * as THREE from 'three';
import { PLANETS, SUN } from '../data/planets';
import { sunRadius, type ScaleMode } from '../data/scale';
import { formatDuration, formatKm, formatNumber } from '../ui/format';
import type { CelestialBody, InfoRow } from './CelestialBody';
import { createSunMaterial } from './shaders/SunMaterial';

export class Sun implements CelestialBody {
  readonly name = SUN.name;
  readonly description = SUN.description;
  readonly object = new THREE.Group();
  readonly pickTarget: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  radius = 0;

  constructor(mode: ScaleMode) {
    this.object.name = SUN.name;

    this.pickTarget = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), createSunMaterial());
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

  /** `realSeconds` drives the surface animation, independent of simulation speed. */
  update(days: number, realSeconds: number): void {
    this.pickTarget.rotation.y = (days / SUN.rotationPeriodDays) * Math.PI * 2;
    this.pickTarget.material.uniforms.uTime.value = realSeconds;
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
