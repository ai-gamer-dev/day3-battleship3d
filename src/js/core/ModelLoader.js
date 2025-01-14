import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
        this.models = new Map();
        this.loadingPromises = new Map();
    }

    async loadModel(type) {
        // If model is already loaded, return it
        if (this.models.has(type)) {
            return this.models.get(type).clone();
        }

        // If model is currently loading, wait for it
        if (this.loadingPromises.has(type)) {
            const model = await this.loadingPromises.get(type);
            return model.clone();
        }

        // Start new load
        const loadPromise = new Promise((resolve, reject) => {
            this.loader.load(
                `src/objects/${type}.glb`,
                (gltf) => {
                    this.models.set(type, gltf.scene);
                    resolve(gltf.scene);
                },
                undefined,
                (error) => {
                    console.error(`Error loading model ${type}:`, error);
                    reject(error);
                }
            );
        });

        this.loadingPromises.set(type, loadPromise);
        const model = await loadPromise;
        return model.clone();
    }
} 