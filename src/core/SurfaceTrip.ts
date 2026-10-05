import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Planet } from '../objects/Planet';
import type { SiteMarker } from '../objects/SiteMarker';
import { LEAVE_DISTANCE, SurfaceView } from '../surface/SurfaceView';
import type { Fade } from '../ui/Fade';
import type { CameraRig } from './CameraRig';
import type { QualityLevel } from './quality';
import type { RenderPipeline, RenderView } from './RenderPipeline';
import { easeInOutCubic, Tween } from './Tween';

/**
 * - `space`: the solar system, normal controls.
 * - `diving`: camera swoops from wherever it is down onto the beach site.
 * - `landing`: haze clears over the beach scene, camera descends to the family.
 * - `surface`: free look around the beach.
 * - `rising`: camera climbs away, haze, then back in space flying out to Earth.
 */
export type TripState = 'space' | 'diving' | 'landing' | 'surface' | 'rising';

const DIVE_SECONDS = 3.8;
const ARRIVE_SECONDS = 4.5;
const DEPART_SECONDS = 2.4;
const RETURN_SECONDS = 1.6;
/** The dive ends this many Earth radii above the ground (~95 km), hidden by the haze. */
const DIVE_END_ALTITUDE = 0.015;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

interface TripDeps {
  domElement: HTMLElement;
  pipeline: RenderPipeline;
  spaceView: RenderView;
  spaceCamera: THREE.PerspectiveCamera;
  spaceControls: OrbitControls;
  rig: CameraRig;
  earth: Planet;
  site: SiteMarker;
  fade: Fade;
  quality(): QualityLevel;
  size(): { width: number; height: number };
  onBackInSpace(after?: () => void): void;
}

/**
 * Zooms from the solar system down to people standing on Earth. The two
 * scales (planets in "scene units", the beach in metres) differ by ~10⁷,
 * far beyond float precision, so the beach is a separate scene: the
 * camera dives towards the site in space, a haze hides the swap, and it
 * keeps descending over the beach.
 */
export class SurfaceTrip {
  state: TripState = 'space';
  private surface: SurfaceView | null = null;
  private surfaceView: RenderView | null = null;
  private tweens: Tween[] = [];

  // Dive bookkeeping.
  private readonly startDir = new THREE.Vector3();
  private readonly startTarget = new THREE.Vector3();
  private startAltitude = 1;

  private readonly v = {
    center: new THREE.Vector3(),
    site: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    pole: new THREE.Vector3(),
    north: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    look: new THREE.Vector3(),
  };
  private readonly turn = new THREE.Quaternion();
  private readonly partial = new THREE.Quaternion();

  constructor(private readonly deps: TripDeps) {}

  /** True while the beach scene is what's on screen. */
  get onSurface(): boolean {
    return this.state === 'landing' || this.state === 'surface' || this.state === 'rising';
  }

  dive(): void {
    if (this.state !== 'space') return;
    const { rig, spaceControls, spaceCamera, earth } = this.deps;
    rig.release();
    spaceControls.enabled = false;
    this.ensureSurface();

    earth.object.getWorldPosition(this.v.center);
    const offset = spaceCamera.position.clone().sub(this.v.center);
    this.startDir.copy(offset).normalize();
    this.startAltitude = Math.max(offset.length() - earth.radius, earth.radius * 0.05);
    this.startTarget.copy(spaceControls.target);

    this.state = 'diving';
    this.tweens.push(
      new Tween(
        DIVE_SECONDS,
        (t) => {
          this.poseDive(t);
          this.deps.fade.set(THREE.MathUtils.smoothstep(t, 0.72, 1));
        },
        () => this.land(),
      ),
    );
  }

  /** Climb back to space; `after` runs once the camera is back in the solar system. */
  leave(after?: () => void): void {
    if (this.state !== 'surface' || !this.surface) return;
    const surface = this.surface;
    surface.beginDeparture();
    this.state = 'rising';
    this.tweens.push(
      new Tween(
        DEPART_SECONDS,
        (t) => {
          surface.depart(t);
          this.deps.fade.set(THREE.MathUtils.smoothstep(t, 0.55, 1));
        },
        () => this.returnToSpace(after),
      ),
    );
  }

  update(realSeconds: number, elapsed: number, days: number): void {
    // Tweens may queue new tweens when they finish.
    const running = this.tweens;
    this.tweens = [];
    const still = running.filter((tween) => !tween.step(realSeconds));
    this.tweens.push(...still);

    if (this.surface && this.onSurface) {
      this.surface.setSun(this.deps.site.sun(days));
      this.surface.update(realSeconds, elapsed);
      if (this.state === 'surface' && this.surface.distanceFromTarget > LEAVE_DISTANCE) {
        this.leave();
      }
    }
  }

  setSize(width: number, height: number): void {
    this.surface?.setSize(width, height);
  }

  setQuality(level: QualityLevel): void {
    this.surface?.setQuality(level);
  }

  private ensureSurface(): SurfaceView {
    if (!this.surface) {
      this.surface = new SurfaceView(this.deps.domElement);
      const { width, height } = this.deps.size();
      this.surface.setSize(width, height);
      this.surface.setQuality(this.deps.quality());
      this.surfaceView = {
        scene: this.surface.scene,
        camera: this.surface.camera,
        // Sunlit sand is well above 1.0 in HDR; only the sun disc and glints should bloom.
        bloom: { strength: 0.2, radius: 0.4, threshold: 8 },
        toneMapping: THREE.ACESFilmicToneMapping,
        exposure: 0.5,
      };
    }
    return this.surface;
  }

  /** Space camera during the dive: swing round Earth to above the site while dropping exponentially. */
  private poseDive(t: number): void {
    const { earth, site, spaceCamera } = this.deps;
    const v = this.v;
    earth.object.getWorldPosition(v.center);
    site.object.getWorldPosition(v.site);
    site.normal(v.normal);

    const swing = easeInOutCubic(Math.min(1, t / 0.65));
    this.turn.setFromUnitVectors(this.startDir, v.normal);
    this.partial.identity().slerp(this.turn, swing);
    v.dir.copy(this.startDir).applyQuaternion(this.partial);

    const endAltitude = earth.radius * DIVE_END_ALTITUDE;
    const altitude =
      this.startAltitude * Math.pow(endAltitude / this.startAltitude, easeInOutCubic(t));
    spaceCamera.position.copy(v.center).addScaledVector(v.dir, earth.radius + altitude);

    // Turn "up" towards local north so the beach appears the right way round.
    this.northAt(v.normal, v.north);
    spaceCamera.up.copy(WORLD_UP).lerp(v.north, swing).normalize();
    v.look.lerpVectors(this.startTarget, v.site, swing);
    spaceCamera.lookAt(v.look);
  }

  private land(): void {
    const surface = this.ensureSurface();
    this.deps.pipeline.setView(this.surfaceView!);
    this.deps.spaceCamera.up.copy(WORLD_UP);
    surface.beginArrival();
    this.state = 'landing';
    this.tweens.push(
      new Tween(
        ARRIVE_SECONDS,
        (t) => {
          surface.arrive(t);
          this.deps.fade.set(1 - THREE.MathUtils.smoothstep(t, 0, 0.3));
        },
        () => (this.state = 'surface'),
      ),
    );
  }

  private returnToSpace(after?: () => void): void {
    const { pipeline, spaceView, spaceCamera, spaceControls, earth, site, rig, fade } = this.deps;
    const v = this.v;
    pipeline.setView(spaceView);

    // Start just above the site, looking down, then let the rig fly out to Earth.
    site.object.getWorldPosition(v.site);
    site.normal(v.normal);
    this.northAt(v.normal, v.north);
    const northUp = v.north.clone();
    spaceCamera.position.copy(v.site).addScaledVector(v.normal, earth.radius * DIVE_END_ALTITUDE);
    spaceControls.target.copy(v.site);
    spaceCamera.up.copy(northUp);
    spaceCamera.lookAt(v.site);

    this.state = 'space';
    rig.focus(earth);
    this.tweens.push(
      new Tween(RETURN_SECONDS, (t) => {
        spaceCamera.up.copy(northUp).lerp(WORLD_UP, easeInOutCubic(t)).normalize();
        fade.set(1 - THREE.MathUtils.smoothstep(t, 0, 0.4));
      }),
    );
    this.deps.onBackInSpace(after);
  }

  /** Local north (tangent to the surface) at a point with the given normal. */
  private northAt(normal: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    this.deps.earth.getPoleDirection(this.v.pole);
    return target.copy(this.v.pole).addScaledVector(normal, -this.v.pole.dot(normal)).normalize();
  }
}
