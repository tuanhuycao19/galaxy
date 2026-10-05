import * as THREE from 'three';

/**
 * Tracks every asset the first view needs: image textures (through
 * TextureLoader) and worker-generated surfaces (registered by hand).
 */
export const loadingManager = new THREE.LoadingManager();
