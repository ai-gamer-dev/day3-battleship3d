import * as THREE from 'three';

export class Camera {
    constructor() {
        this.instance = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane
        );

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.instance.aspect = window.innerWidth / window.innerHeight;
        this.instance.updateProjectionMatrix();
    }
} 