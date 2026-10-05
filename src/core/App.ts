import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS } from '../data/planets';
import type { ScaleMode } from '../data/scale';
import type { CelestialBody } from '../objects/CelestialBody';
import { loadingManager } from '../objects/loading';
import { Moon } from '../objects/Moon';
import { Planet } from '../objects/Planet';
import { SiteMarker } from '../objects/SiteMarker';
import { createStarfield } from '../objects/Starfield';
import { Sun } from '../objects/Sun';
import { BodyList } from '../ui/BodyList';
import { CaptionView } from '../ui/Caption';
import { Fade } from '../ui/Fade';
import { InfoPanel } from '../ui/InfoPanel';
import { bindShortcuts } from '../ui/keyboard';
import { Labels } from '../ui/Labels';
import type { LoadingScreen } from '../ui/LoadingScreen';
import {
  DEFAULT_SPEED_INDEX,
  REAL_TIME_SPEED_INDEX,
  SPEEDS,
  Toolbar,
  type ToggleName,
} from '../ui/Toolbar';
import { CameraRig } from './CameraRig';
import { Picker } from './Picker';
import { QualityController, type QualityMode } from './quality';
import { RenderPipeline, type RenderView } from './RenderPipeline';
import { SimulationClock } from './SimulationClock';
import { SurfaceTrip } from './SurfaceTrip';

/** Cap per-frame time so a backgrounded tab doesn't jump months ahead. */
const MAX_FRAME_SECONDS = 0.1;
const MAX_ANIMATION_STEP = 0.5;
/**
 * Camera animations use a smoothed frame time: a one-off hitch (GC, shader
 * compile) is spread over the next frames instead of making the camera jump,
 * while a steadily slow device still animates in real time.
 */
const ANIMATION_SMOOTHING = 0.15;
const OVERVIEW_CAMERA = new THREE.Vector3(0, 90, 190);
const HELP_SEEN_KEY = 'galaxy.helpSeen';

export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly pipeline: RenderPipeline;
  private readonly quality: QualityController;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new SimulationClock();
  private scaleMode: ScaleMode = 'compressed';
  private readonly sun: Sun;
  private readonly planets: Planet[];
  private readonly moon: Moon;
  private readonly earth: Planet;
  /** The family's beach on Earth, reachable with G or its tag. */
  private readonly site: SiteMarker;
  private readonly trip: SurfaceTrip;
  private readonly picker: Picker;
  private readonly spaceView: RenderView;
  /** Index = keyboard shortcut: 0 Sun, 1–8 planets, 9 Moon. */
  private readonly bodies: CelestialBody[];
  private readonly orbitLines = new THREE.Group();
  private readonly rig: CameraRig;
  private readonly labels: Labels;
  private readonly infoPanel: InfoPanel;
  private readonly bodyList: BodyList;
  private readonly toolbar: Toolbar;
  private selected: CelestialBody | null = null;
  private speedIndex = DEFAULT_SPEED_INDEX;
  /** Speed to restore when coming back up from the beach. */
  private speedBeforeTrip = DEFAULT_SPEED_INDEX;
  private showOrbits = true;
  private showLabels = true;
  private lastTime: number | null = null;
  private animationStep = 1 / 60;

  constructor(
    private readonly container: HTMLElement,
    uiRoot: HTMLElement,
    loading: LoadingScreen,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    // Only the beach scene has shadow-casting lights; space pays nothing for this.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Register before any asset starts loading.
    loadingManager.onProgress = (_url, loaded, total) => loading.setProgress(loaded, total);
    loadingManager.onLoad = () => {
      loading.setMessage('Đang chuẩn bị đồ hoạ…');
      // Compile shaders up front so the first frames after the fade don't stutter.
      this.renderer
        .compileAsync(this.scene, this.camera)
        .catch(() => {})
        .finally(() => {
          loading.finish();
          // Build the beach scene in the background so the zoom never stalls.
          const prepare = () => void this.trip.prepare();
          if ('requestIdleCallback' in window)
            window.requestIdleCallback(prepare, { timeout: 4000 });
          else setTimeout(prepare, 1500);
        });
    };

    // A tiny near plane lets the camera get close to true-scale planets
    // (Earth ≈ 0.0002 units); the logarithmic depth buffer keeps precision.
    this.camera = new THREE.PerspectiveCamera(45, 1, 1e-6, 1e5);
    this.camera.position.copy(OVERVIEW_CAMERA);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 600;

    this.sun = new Sun(this.scaleMode);
    this.planets = PLANETS.map((data, i) => new Planet(data, i + 2, this.scaleMode));
    const earth = this.planets.find((p) => p.data.name === 'Trái Đất')!;
    this.earth = earth;
    this.moon = new Moon(earth, this.scaleMode);
    earth.object.add(this.moon.orbit);
    this.bodies = [this.sun, ...this.planets, this.moon];
    this.site = new SiteMarker(earth, () => this.goToSite());
    this.buildScene();
    this.spaceView = {
      scene: this.scene,
      camera: this.camera,
      // Only HDR pixels (> 1.0, i.e. the Sun) bloom; lit planets stay crisp.
      bloom: { strength: 0.6, radius: 0.35, threshold: 1 },
      toneMapping: THREE.NoToneMapping,
      exposure: 1,
    };
    this.pipeline = new RenderPipeline(this.renderer, this.spaceView);

    this.rig = new CameraRig(this.camera, this.controls, {
      camera: OVERVIEW_CAMERA,
      freeMinDistance: () => this.sun.radius * 1.3,
    });
    this.rig.release();

    const select = (body: CelestialBody) => this.select(body);
    this.labels = new Labels(this.container, this.bodies, select);
    const fade = new Fade(this.container);
    const caption = new CaptionView(this.container);
    this.bodyList = new BodyList(
      uiRoot,
      [
        ...this.bodies.map((source, i) => ({ source, key: String(i) })),
        { source: this.site, key: 'G', label: '🏖 Gia đình ở biển', separated: true },
      ],
      (source) => (source === this.site ? this.goToSite() : this.select(source as CelestialBody)),
    );
    this.infoPanel = new InfoPanel(uiRoot, () =>
      this.trip.state === 'space' ? this.deselect() : this.infoPanel.hide(),
    );
    this.toolbar = new Toolbar(uiRoot, {
      onTogglePause: () => this.togglePause(),
      onSpeedChange: (i) => this.setSpeed(i),
      onToggle: (name) => this.toggle(name),
      onToday: () => this.clock.resetToNow(),
      onReset: () => this.resetView(),
      onQualityChange: (mode) => this.setQualityMode(mode),
    });

    // Phones and tablets start one notch lower; auto mode steps down further if needed.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.quality = new QualityController(coarse ? 'medium' : 'high', () => this.applyQuality());
    this.trip = new SurfaceTrip({
      renderer: this.renderer,
      pipeline: this.pipeline,
      spaceView: this.spaceView,
      spaceCamera: this.camera,
      spaceControls: this.controls,
      rig: this.rig,
      earth,
      site: this.site,
      fade,
      caption,
      quality: () => this.quality.level,
      size: () => ({ width: this.container.clientWidth, height: this.container.clientHeight }),
      onBackInSpace: (after) => this.backInSpace(after),
    });
    this.applyQuality();
    this.picker = new Picker(this.renderer.domElement, this.camera, this.bodies, select);
    this.bindKeyboard();

    this.toolbar.setPaused(this.clock.paused);
    this.setSpeed(this.speedIndex);
    this.toolbar.setToggle('orbits', this.showOrbits);
    this.toolbar.setToggle('labels', this.showLabels);
    this.toolbar.setToggle('trueScale', false);
    this.showHelpOnFirstVisit();

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  private buildScene(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.12));
    this.scene.add(createStarfield());
    this.scene.add(this.sun.object);
    this.scene.add(this.orbitLines);
    for (const planet of this.planets) {
      this.scene.add(planet.object);
      this.orbitLines.add(planet.orbitLine);
    }
  }

  private select(body: CelestialBody): void {
    if (this.trip.state === 'surface') {
      this.trip.leave(() => this.select(body));
      return;
    }
    if (this.trip.state !== 'space') return;
    this.selected = body;
    this.rig.focus(body);
    this.infoPanel.show(body, this.clock.days);
    this.labels.setSelected(body);
    this.bodyList.setActive(body);
  }

  private deselect(): void {
    this.selected = null;
    this.rig.release();
    this.infoPanel.hide();
    this.labels.setSelected(null);
    this.bodyList.setActive(null);
  }

  private resetView(): void {
    if (this.trip.state === 'surface') {
      this.trip.leave(() => this.resetView());
      return;
    }
    if (this.trip.state !== 'space') return;
    this.deselect();
    this.rig.reset();
  }

  /** Zoom all the way down to the family on the beach. */
  private goToSite(): void {
    if (this.trip.state !== 'space') return;
    this.toolbar.toggleHelp(false);
    this.selected = null;
    this.labels.setSelected(null);
    this.bodyList.setActive(this.site);
    this.infoPanel.show(this.site, this.clock.days);
    // On the beach, time runs at its real pace so the light behaves naturally.
    this.speedBeforeTrip = this.speedIndex;
    this.setSpeed(REAL_TIME_SPEED_INDEX);
    this.trip.dive();
  }

  private backInSpace(after?: () => void): void {
    this.setSpeed(this.speedBeforeTrip);
    if (after) {
      after();
      return;
    }
    // The trip flies out to Earth; reflect that as the selection.
    this.selected = this.earth;
    this.infoPanel.show(this.earth, this.clock.days);
    this.labels.setSelected(this.earth);
    this.bodyList.setActive(this.earth);
  }

  private togglePause(): void {
    this.clock.paused = !this.clock.paused;
    this.toolbar.setPaused(this.clock.paused);
  }

  private setSpeed(index: number): void {
    this.speedIndex = THREE.MathUtils.clamp(index, 0, SPEEDS.length - 1);
    this.clock.timeScale = SPEEDS[this.speedIndex].days;
    this.toolbar.setSpeedIndex(this.speedIndex);
  }

  private toggle(name: ToggleName): void {
    if (name === 'orbits') {
      this.showOrbits = !this.showOrbits;
      this.orbitLines.visible = this.showOrbits;
      this.toolbar.setToggle(name, this.showOrbits);
    } else if (name === 'labels') {
      this.showLabels = !this.showLabels;
      this.labels.setEnabled(this.showLabels);
      this.toolbar.setToggle(name, this.showLabels);
    } else {
      // Rescaling mid-dive would yank the camera; only allow it in space.
      if (this.trip.state !== 'space') return;
      this.setScaleMode(this.scaleMode === 'compressed' ? 'true' : 'compressed');
      this.toolbar.setToggle(name, this.scaleMode === 'true');
    }
  }

  private setScaleMode(mode: ScaleMode): void {
    const previousRadius = this.selected?.radius ?? 1;
    this.scaleMode = mode;
    this.sun.setScaleMode(mode);
    for (const planet of this.planets) planet.setScaleMode(mode);
    this.moon.setScaleMode(mode);
    this.updateBodies(this.clock.days);
    this.rig.rescale(previousRadius);
  }

  /** Show the help dialog once; storage may be unavailable (private mode), so fail open. */
  private showHelpOnFirstVisit(): void {
    let seen = false;
    try {
      seen = localStorage.getItem(HELP_SEEN_KEY) === '1';
      localStorage.setItem(HELP_SEEN_KEY, '1');
    } catch {
      // Ignore: just show the help.
    }
    this.toolbar.toggleHelp(!seen);
  }

  private setQualityMode(mode: QualityMode): void {
    this.quality.setMode(mode);
    this.applyQuality();
  }

  private applyQuality(): void {
    this.pipeline.setQuality(this.quality.level);
    this.trip.setQuality(this.quality.level);
    this.toolbar.setQuality(this.quality.mode, this.quality.level);
  }

  private bindKeyboard(): void {
    bindShortcuts({
      selectIndex: (i) => this.bodies[i] && this.select(this.bodies[i]),
      togglePause: () => this.togglePause(),
      faster: () => this.setSpeed(this.speedIndex + 1),
      slower: () => this.setSpeed(this.speedIndex - 1),
      toggleOrbits: () => this.toggle('orbits'),
      toggleLabels: () => this.toggle('labels'),
      toggleScale: () => this.toggle('trueScale'),
      toggleHelp: () => this.toolbar.toggleHelp(),
      reset: () => this.resetView(),
      cycleQuality: () => {
        const modes: QualityMode[] = ['auto', 'high', 'medium', 'low'];
        this.setQualityMode(modes[(modes.indexOf(this.quality.mode) + 1) % modes.length]);
      },
      goToSite: () => this.goToSite(),
      escape: () => {
        if (this.toolbar.helpOpen) this.toolbar.toggleHelp(false);
        else if (this.trip.state === 'surface') this.trip.leave();
        else if (this.trip.state === 'space') this.deselect();
      },
    });
  }

  private updateBodies(days: number, realSeconds = performance.now() / 1000): void {
    this.sun.update(days, realSeconds);
    for (const planet of this.planets) planet.update(days);
    this.moon.update(days);
  }

  private readonly resize = (): void => {
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.pipeline.setSize(width, height);
    this.labels.setSize(width, height);
    this.trip.setSize(width, height);
  };

  private readonly tick = (time: number): void => {
    const frameSeconds = this.lastTime === null ? 0 : (time - this.lastTime) / 1000;
    const delta = Math.min(frameSeconds, MAX_FRAME_SECONDS);
    this.lastTime = time;
    this.clock.advance(delta);
    this.quality.sample(frameSeconds);

    const days = this.clock.days;
    this.updateBodies(days, time / 1000);
    // Transitions follow (smoothed) wall-clock time, with a looser cap than
    // the simulation, so they take the same time on slow devices.
    if (frameSeconds > 0) {
      const step = Math.min(frameSeconds, MAX_ANIMATION_STEP);
      this.animationStep += (step - this.animationStep) * ANIMATION_SMOOTHING;
    }
    this.trip.update(this.animationStep, time / 1000, days);
    // The dive drives the space camera itself; otherwise the rig does.
    if (this.trip.state === 'space') this.rig.update(this.animationStep);
    this.site.update(this.camera);
    this.picker.enabled = this.trip.state === 'space';
    this.infoPanel.update(days, delta);
    this.toolbar.setDate(this.clock.date);
    if (document.documentElement.dataset.view !== this.trip.state) {
      document.documentElement.dataset.view = this.trip.state;
    }

    this.pipeline.render();
    this.labels.setSuppressed(this.trip.onSurface);
    const { clientWidth: width, clientHeight: height } = this.container;
    this.labels.render(this.scene, this.camera, width, height);
  };
}
