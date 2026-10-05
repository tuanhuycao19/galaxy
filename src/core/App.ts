import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS } from '../data/planets';
import { SUN_RADIUS } from '../data/scale';
import { Moon } from '../objects/Moon';
import { Planet } from '../objects/Planet';
import { createStarfield } from '../objects/Starfield';
import { Sun } from '../objects/Sun';
import { ControlPanel } from '../ui/ControlPanel';
import { SimulationClock } from './SimulationClock';

const MAX_PIXEL_RATIO = 2;
/** Cap per-frame time so a backgrounded tab doesn't jump months ahead. */
const MAX_FRAME_SECONDS = 0.1;

export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly clock = new SimulationClock();
  private readonly sun = new Sun();
  private readonly planets: Planet[];
  private readonly moon: Moon;
  private readonly orbitLines = new THREE.Group();
  private readonly panel: ControlPanel;
  private lastTime: number | null = null;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    this.camera.position.set(0, 90, 190);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = SUN_RADIUS * 1.6;
    this.controls.maxDistance = 600;
    this.controls.zoomToCursor = true;

    this.planets = PLANETS.map((data, i) => new Planet(data, i + 2));
    const earth = this.planets.find((p) => p.data.name === 'Trái Đất')!;
    this.moon = new Moon(earth.radius);
    earth.object.add(this.moon.object);

    this.buildScene();
    this.panel = new ControlPanel(this.clock, (visible) => (this.orbitLines.visible = visible));

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

  private readonly resize = (): void => {
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly tick = (time: number): void => {
    const delta = this.lastTime === null ? 0 : (time - this.lastTime) / 1000;
    this.lastTime = time;
    this.clock.advance(Math.min(delta, MAX_FRAME_SECONDS));

    const days = this.clock.days;
    this.sun.update(days);
    for (const planet of this.planets) planet.update(days);
    this.moon.update(days);
    this.panel.update(this.clock.date);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
