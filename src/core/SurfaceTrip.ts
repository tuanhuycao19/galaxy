import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Planet } from '../objects/Planet';
import type { SiteMarker } from '../objects/SiteMarker';
import { LEAVE_DISTANCE, SurfaceView } from '../surface/SurfaceView';
import type { CaptionView } from '../ui/Caption';
import type { Fade } from '../ui/Fade';
import type { CameraRig } from './CameraRig';
import { DIVE_END_ALTITUDE, DIVE_SECONDS, divePose, easeInOutSine } from './diveSchedule';
import type { QualityLevel } from './quality';
import type { RenderPipeline, RenderView } from './RenderPipeline';
import { Tween } from './Tween';

/**
 * - `space`: the solar system, normal controls.
 * - `diving`: staged zoom: continent → country → through the clouds.
 * - `landing`: haze clears over the beach scene, camera descends to the family.
 * - `surface`: free look around the beach.
 * - `rising`: camera climbs away from the beach into the haze.
 * - `returning`: back in space, climbing out to the usual view of Earth.
 */
export type TripState = 'space' | 'diving' | 'landing' | 'surface' | 'rising' | 'returning';

const ARRIVE_SECONDS = 8.5;
const DEPART_SECONDS = 4.8;
const RETURN_SECONDS = 6;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

interface TripDeps {
  renderer: THREE.WebGLRenderer;
  pipeline: RenderPipeline;
  spaceView: RenderView;
  spaceCamera: THREE.PerspectiveCamera;
  spaceControls: OrbitControls;
  rig: CameraRig;
  earth: Planet;
  site: SiteMarker;
  fade: Fade;
  caption: CaptionView;
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
  private prepared: Promise<void> | null = null;
  private tweens: Tween[] = [];
  /** Latest simulated time, for the Sun at the site. */
  private days = 0;

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
    end: new THREE.Vector3(),
  };
  private readonly turn = new THREE.Quaternion();
  private readonly partial = new THREE.Quaternion();

  constructor(private readonly deps: TripDeps) {}

  /** True while the beach scene is what's on screen. */
  get onSurface(): boolean {
    return this.state === 'landing' || this.state === 'surface' || this.state === 'rising';
  }

  /**
   * Builds the beach scene and compiles its shaders ahead of time (call
   * when idle), so swapping scenes under the haze doesn't stutter.
   */
  prepare(): Promise<void> {
    this.prepared ??= (async () => {
      const surface = this.ensureSurface();
      const { renderer } = this.deps;
      surface.beginArrival();
      try {
        await renderer.compileAsync(surface.scene, surface.camera);
      } catch {
        // Fall back to compiling on first use.
      }
      // One tiny off-screen render also sets up shadow maps and the water's reflection target.
      const target = new THREE.WebGLRenderTarget(64, 64);
      const previous = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(surface.scene, surface.camera);
      renderer.setRenderTarget(previous);
      target.dispose();
    })();
    return this.prepared;
  }

  dive(): void {
    if (this.state !== 'space') return;
    const { rig, spaceControls, spaceCamera, earth } = this.deps;
    void this.prepare();
    rig.release();
    spaceControls.enabled = false;

    earth.object.getWorldPosition(this.v.center);
    const offset = spaceCamera.position.clone().sub(this.v.center);
    this.startDir.copy(offset).normalize();
    this.startAltitude = Math.max(offset.length() / earth.radius - 1, 0.05);
    this.startTarget.copy(spaceControls.target);

    this.deps.fade.setNight(this.isNightAtSite());
    this.state = 'diving';
    this.tweens.push(
      new Tween(
        DIVE_SECONDS,
        (t) => this.poseDive(t * DIVE_SECONDS),
        // Wait (under full haze) if the beach scene isn't ready yet.
        () => void this.prepare().then(() => this.land()),
      ),
    );
  }

  /** Climb back to space; `after` runs once the camera is back at Earth. */
  leave(after?: () => void): void {
    if (this.state !== 'surface' || !this.surface) return;
    const surface = this.surface;
    surface.beginDeparture();
    this.deps.fade.setNight(this.isNightAtSite());
    this.state = 'rising';
    this.tweens.push(
      new Tween(
        DEPART_SECONDS,
        (t) => {
          surface.depart(t);
          this.deps.fade.set(THREE.MathUtils.smoothstep(t, 0.6, 1));
        },
        () => this.returnToSpace(after),
      ),
    );
  }

  update(realSeconds: number, elapsed: number, days: number): void {
    this.days = days;
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
      this.surface = new SurfaceView(this.deps.renderer.domElement);
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

  /** Space camera during the dive (see `divePose` for the schedule). */
  private poseDive(elapsed: number): void {
    const { earth, site, spaceCamera, fade, caption } = this.deps;
    const v = this.v;
    const pose = divePose(elapsed, this.startAltitude);
    earth.object.getWorldPosition(v.center);
    site.object.getWorldPosition(v.site);
    site.normal(v.normal);

    // Swing round Earth from the starting direction to straight above the site.
    this.turn.setFromUnitVectors(this.startDir, v.normal);
    this.partial.identity().slerp(this.turn, pose.swing);
    v.dir.copy(this.startDir).applyQuaternion(this.partial);
    spaceCamera.position.copy(v.center).addScaledVector(v.dir, earth.radius * (1 + pose.altitude));

    // Turn "up" towards local north so continents appear the right way round.
    this.northAt(v.normal, v.north);
    spaceCamera.up.copy(WORLD_UP).lerp(v.north, pose.swing).normalize();
    v.look.lerpVectors(this.startTarget, v.site, pose.swing);
    spaceCamera.lookAt(v.look);

    fade.set(pose.fade);
    if (pose.caption) caption.show(pose.caption.title, pose.caption.subtitle);
  }

  private land(): void {
    const surface = this.ensureSurface();
    const { pipeline, spaceCamera, fade, caption } = this.deps;
    pipeline.setView(this.surfaceView!);
    spaceCamera.up.copy(WORLD_UP);
    surface.beginArrival();
    this.state = 'landing';
    this.tweens.push(
      new Tween(
        ARRIVE_SECONDS,
        (t) => {
          surface.arrive(t);
          fade.set(1 - THREE.MathUtils.smoothstep(t, 0, 0.25));
          if (t > 0.45) caption.hide();
        },
        () => (this.state = 'surface'),
      ),
    );
  }

  /**
   * Mirror of the dive: start just above the site under the haze and climb
   * out on a log scale, turning to the usual sunlit view of Earth, where
   * the rig takes over and follows Earth.
   */
  private returnToSpace(after?: () => void): void {
    const { pipeline, spaceView, spaceCamera, spaceControls, earth, site, rig, fade } = this.deps;
    const v = this.v;
    pipeline.setView(spaceView);
    this.state = 'returning';

    earth.object.getWorldPosition(v.center);
    const endDir = rig.approachDirection(v.center).clone();
    const endAltitude = earth.viewDistance / earth.radius - 1;
    const pose = (t: number) => {
      earth.object.getWorldPosition(v.center);
      site.object.getWorldPosition(v.site);
      site.normal(v.normal);
      const e = easeInOutSine(t);
      const swing = easeInOutSine(THREE.MathUtils.clamp((t - 0.3) / 0.7, 0, 1));
      const altitude = DIVE_END_ALTITUDE * Math.pow(endAltitude / DIVE_END_ALTITUDE, e);
      this.turn.setFromUnitVectors(v.normal, endDir);
      this.partial.identity().slerp(this.turn, swing);
      v.dir.copy(v.normal).applyQuaternion(this.partial);
      spaceCamera.position.copy(v.center).addScaledVector(v.dir, earth.radius * (1 + altitude));
      this.northAt(v.normal, v.north);
      spaceCamera.up.copy(v.north).lerp(WORLD_UP, swing).normalize();
      v.look.lerpVectors(v.site, v.center, swing);
      spaceCamera.lookAt(v.look);
      fade.set(1 - THREE.MathUtils.smoothstep(t, 0, 0.15));
    };
    pose(0);

    this.tweens.push(
      new Tween(RETURN_SECONDS, pose, () => {
        spaceCamera.up.copy(WORLD_UP);
        spaceControls.target.copy(v.center);
        rig.attach(earth);
        this.state = 'space';
        this.deps.onBackInSpace(after);
      }),
    );
  }

  private isNightAtSite(): boolean {
    return this.deps.site.sun(this.days).elevationDeg < -4;
  }

  /** Local north (tangent to the surface) at a point with the given normal. */
  private northAt(normal: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
    this.deps.earth.getPoleDirection(this.v.pole);
    return target.copy(this.v.pole).addScaledVector(normal, -this.v.pole.dot(normal)).normalize();
  }
}
