import * as THREE from 'three';
import type { PlanetData } from '../data/planets';
import { bodyRadius, toScenePosition, type ScaleMode } from '../data/scale';
import { heliocentricPosition } from '../physics/orbit';
import { formatAu, formatDegrees, formatDuration, formatKm } from '../ui/format';
import { loadTexture } from './assets';
import type { CelestialBody, InfoRow } from './CelestialBody';
import { createOrbitLine, updateOrbitLine } from './OrbitLine';
import { createRings } from './Rings';
import { applySurfaceTexture } from './textures/factory';

const DEG = Math.PI / 180;
/** Clouds drift slightly faster than the ground so they visibly move. */
const CLOUD_DRIFT = 1.08;
const UNIT_SPHERE = new THREE.SphereGeometry(1, 64, 32);

/**
 * Scene graph:
 *   object (follows the orbit, axes fixed in space)
 *   └─ tilt (axial tilt, scaled to the planet's radius; rings live here)
 *      └─ body (unit sphere spinning about its local Y axis)
 */
export class Planet implements CelestialBody {
  readonly object = new THREE.Group();
  readonly orbitLine: THREE.LineLoop;
  readonly pickTarget: THREE.Mesh;
  radius = 0;
  private mode: ScaleMode;
  private readonly tilt = new THREE.Group();
  private readonly clouds?: THREE.Mesh;

  constructor(
    readonly data: PlanetData,
    seed: number,
    mode: ScaleMode,
  ) {
    this.object.name = data.name;
    this.tilt.rotation.z = data.axialTiltDeg * DEG;
    this.object.add(this.tilt);

    this.pickTarget = new THREE.Mesh(UNIT_SPHERE, createMaterial(data, seed));
    this.pickTarget.name = data.name;
    this.tilt.add(this.pickTarget);

    if (data.surface.kind === 'image' && data.surface.cloudsMap) {
      this.clouds = new THREE.Mesh(
        UNIT_SPHERE,
        new THREE.MeshStandardMaterial({
          map: loadTexture(data.surface.cloudsMap),
          transparent: true,
          depthWrite: false,
          roughness: 1,
          metalness: 0,
        }),
      );
      this.clouds.scale.setScalar(1.012);
      this.tilt.add(this.clouds);
    }

    if (data.rings) {
      this.tilt.add(createRings(data.rings.innerRadiusKm, data.rings.outerRadiusKm, data.radiusKm));
    }

    this.mode = mode;
    this.orbitLine = createOrbitLine(data.orbit, mode);
    this.setScaleMode(mode);
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string {
    return this.data.description;
  }

  get viewDistance(): number {
    return this.radius * (this.data.rings ? 7 : 4.5);
  }

  setScaleMode(mode: ScaleMode): void {
    if (mode !== this.mode) updateOrbitLine(this.orbitLine, this.data.orbit, mode);
    this.mode = mode;
    this.radius = bodyRadius(this.data.radiusKm, mode);
    this.tilt.scale.setScalar(this.radius);
  }

  update(days: number): void {
    toScenePosition(heliocentricPosition(this.data.orbit, days), this.mode, this.object.position);
    const spin = ((days * 24) / this.data.rotationPeriodHours) * Math.PI * 2;
    this.pickTarget.rotation.y = spin;
    if (this.clouds) this.clouds.rotation.y = spin * CLOUD_DRIFT;
  }

  info(days: number): InfoRow[] {
    const d = this.data;
    const p = heliocentricPosition(d.orbit, days);
    const retrograde = d.axialTiltDeg > 90 ? ' (ngược chiều)' : '';
    return [
      { label: 'Bán kính', value: formatKm(d.radiusKm) },
      { label: 'Cách Mặt Trời', value: formatAu(Math.hypot(p.x, p.y, p.z)) },
      { label: 'Một năm (quỹ đạo)', value: formatDuration(d.orbit.periodDays) },
      { label: 'Tự quay', value: formatDuration(d.rotationPeriodHours / 24) + retrograde },
      { label: 'Độ nghiêng trục', value: formatDegrees(d.axialTiltDeg) },
      { label: 'Số vệ tinh', value: d.moons },
    ];
  }
}

function createMaterial(data: PlanetData, seed: number): THREE.Material {
  const surface = data.surface;
  if (surface.kind !== 'image') {
    const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    applySurfaceTexture(material, surface, seed);
    return material;
  }
  // Phong supports a specular map, which makes oceans glint and land stay matte.
  return new THREE.MeshPhongMaterial({
    map: loadTexture(surface.map),
    normalMap: surface.normalMap ? loadTexture(surface.normalMap, false) : null,
    specularMap: surface.specularMap ? loadTexture(surface.specularMap, false) : null,
    specular: 0x333333,
    shininess: 18,
  });
}
