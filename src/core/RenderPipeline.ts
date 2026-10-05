import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { QUALITY_SETTINGS, type QualityLevel } from './quality';

/** What to render and how: each view brings its own bloom and tone mapping. */
export interface RenderView {
  scene: THREE.Scene;
  camera: THREE.Camera;
  bloom: { strength: number; radius: number; threshold: number };
  toneMapping: THREE.ToneMapping;
  exposure: number;
}

/**
 * Renders the scene either straight to the canvas (low quality) or through
 * an HDR composer with bloom. The composer renders into a half-float,
 * multisampled target so the Sun keeps its >1.0 values and edges stay
 * antialiased.
 */
export class RenderPipeline {
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass: UnrealBloomPass;
  private view: RenderView;
  private bloom = true;
  private width = 1;
  private height = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    view: RenderView,
  ) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(view.scene, view.camera);
    this.composer.addPass(this.renderPass);
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1, 0, 1);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
    this.view = view;
    this.setView(view);
  }

  setView(view: RenderView): void {
    this.view = view;
    this.renderPass.scene = view.scene;
    this.renderPass.camera = view.camera;
    this.bloomPass.strength = view.bloom.strength;
    this.bloomPass.radius = view.bloom.radius;
    this.bloomPass.threshold = view.bloom.threshold;
    this.renderer.toneMapping = view.toneMapping;
    this.renderer.toneMappingExposure = view.exposure;
  }

  setQuality(level: QualityLevel): void {
    const settings = QUALITY_SETTINGS[level];
    this.bloom = settings.bloom;
    const pixelRatio = Math.min(window.devicePixelRatio, settings.maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.composer.setPixelRatio(pixelRatio);
    this.setSize(this.width, this.height);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  render(): void {
    if (this.bloom) this.composer.render();
    else this.renderer.render(this.view.scene, this.view.camera);
  }
}
