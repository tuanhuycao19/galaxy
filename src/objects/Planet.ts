import * as THREE from 'three';
import type { PlanetData } from '../data/planets';
import { scaledRadius, toScenePosition } from '../data/scale';
import { heliocentricPosition } from '../physics/orbit';
import { loadTexture } from './assets';
import { createOrbitLine } from './OrbitLine';
import { createRings } from './Rings';
import { applySurfaceTexture } from './textures/factory';

const DEG = Math.PI / 180;
/** Clouds drift slightly faster than the ground so they visibly move. */
const CLOUD_DRIFT = 1.08;

/**
 * Scene graph:
 *   object (follows the orbit, axes fixed in space)
 *   └─ tilt (axial tilt; rings live here, in the equatorial plane)
 *      └─ body (spins about its local Y axis)
 */
export class Planet {
  readonly object = new THREE.Group();
  readonly orbitLine: THREE.LineLoop;
  readonly radius: number;
  private readonly tilt = new THREE.Group();
  private readonly body: THREE.Mesh;
  private readonly clouds?: THREE.Mesh;

  constructor(
    readonly data: PlanetData,
    seed: number,
  ) {
    this.object.name = data.name;
    this.radius = scaledRadius(data.radiusKm);
    this.tilt.rotation.z = data.axialTiltDeg * DEG;
    this.object.add(this.tilt);

    const geometry = new THREE.SphereGeometry(this.radius, 64, 32);
    this.body = new THREE.Mesh(geometry, createMaterial(data, seed));
    this.body.name = data.name;
    this.tilt.add(this.body);

    if (data.surface.kind === 'image' && data.surface.cloudsMap) {
      this.clouds = new THREE.Mesh(
        geometry,
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
      this.tilt.add(
        createRings(
          data.rings.innerRadiusKm,
          data.rings.outerRadiusKm,
          this.radius / data.radiusKm,
        ),
      );
    }

    this.orbitLine = createOrbitLine(data.orbit);
  }

  update(days: number): void {
    toScenePosition(heliocentricPosition(this.data.orbit, days), this.object.position);
    const spin = ((days * 24) / this.data.rotationPeriodHours) * Math.PI * 2;
    this.body.rotation.y = spin;
    if (this.clouds) this.clouds.rotation.y = spin * CLOUD_DRIFT;
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
