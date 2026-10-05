import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS } from '../data/planets';
import type { ScaleMode } from '../data/scale';
import type { CelestialBody } from '../objects/CelestialBody';
import { loadingManager } from '../objects/loading';
import { Moon } from '../objects/Moon';
import { Planet } from '../objects/Planet';
import { createStarfield } from '../objects/Starfield';
import { Sun } from '../objects/Sun';
import { BodyList } from '../ui/BodyList';
import { InfoPanel } from '../ui/InfoPanel';
import { bindShortcuts } from '../ui/keyboard';
import { Labels } from '../ui/Labels';
import type { LoadingScreen } from '../ui/LoadingScreen';
import { DEFAULT_SPEED_INDEX, SPEEDS, Toolbar, type ToggleName } from '../ui/Toolbar';
import { CameraRig } from './CameraRig';
import { Picker } from './Picker';
import { QualityController, type QualityMode } from './quality';
import { RenderPipeline } from './RenderPipeline';
import { SimulationClock } from './SimulationClock';

/** Cap per-frame time so a backgrounded tab doesn't jump months ahead. */
const MAX_FRAME_SECONDS = 0.1;
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
  private showOrbits = true;
  private showLabels = true;
  private lastTime: number | null = null;

  constructor(
    private readonly container: HTMLElement,
    uiRoot: HTMLElement,
    loading: LoadingScreen,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.container.appendChild(this.renderer.domElement);

    // Register before any asset starts loading.
    loadingManager.onProgress = (_url, loaded, total) => loading.setProgress(loaded, total);
    loadingManager.onLoad = () => {
      loading.setMessage('Đang chuẩn bị đồ hoạ…');
      // Compile shaders up front so the first frames after the fade don't stutter.
      this.renderer
        .compileAsync(this.scene, this.camera)
        .catch(() => {})
        .finally(() => loading.finish());
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
    this.moon = new Moon(earth, this.scaleMode);
    earth.object.add(this.moon.orbit);
    this.bodies = [this.sun, ...this.planets, this.moon];
    this.buildScene();
    this.pipeline = new RenderPipeline(this.renderer, this.scene, this.camera);

    this.rig = new CameraRig(this.camera, this.controls, {
      camera: OVERVIEW_CAMERA,
      freeMinDistance: () => this.sun.radius * 1.3,
    });
    this.rig.release();

    const select = (body: CelestialBody) => this.select(body);
    this.labels = new Labels(this.container, this.bodies, select);
    this.bodyList = new BodyList(uiRoot, this.bodies, select);
    this.infoPanel = new InfoPanel(uiRoot, () => this.deselect());
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
    this.applyQuality();
    new Picker(this.renderer.domElement, this.camera, this.bodies, select);
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
    this.deselect();
    this.rig.reset();
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
      escape: () => {
        if (this.toolbar.helpOpen) this.toolbar.toggleHelp(false);
        else this.deselect();
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
  };

  private readonly tick = (time: number): void => {
    const frameSeconds = this.lastTime === null ? 0 : (time - this.lastTime) / 1000;
    const delta = Math.min(frameSeconds, MAX_FRAME_SECONDS);
    this.lastTime = time;
    this.clock.advance(delta);
    this.quality.sample(frameSeconds);

    const days = this.clock.days;
    this.updateBodies(days, time / 1000);
    this.rig.update(delta);
    this.infoPanel.update(days, delta);
    this.toolbar.setDate(this.clock.date);

    this.pipeline.render();
    const { clientWidth: width, clientHeight: height } = this.container;
    this.labels.render(this.scene, this.camera, width, height);
  };
}
