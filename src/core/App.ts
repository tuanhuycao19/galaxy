import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLANETS } from '../data/planets';
import { SUN_RADIUS } from '../data/scale';
import { createPlanet } from '../objects/Planet';
import { createSun } from '../objects/Sun';

const MAX_PIXEL_RATIO = 2;

export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;

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

    this.buildScene();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  start(): void {
    this.renderer.setAnimationLoop(this.tick);
  }

  private buildScene(): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    this.scene.add(createSun());

    // Spread planets around the Sun so they don't line up; motion arrives in phase 2.
    PLANETS.forEach((data, i) => {
      const angle = (i / PLANETS.length) * Math.PI * 2 * 3;
      this.scene.add(createPlanet(data, angle));
    });
  }

  private readonly resize = (): void => {
    const { clientWidth: width, clientHeight: height } = this.container;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private readonly tick = (): void => {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
