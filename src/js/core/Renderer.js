import * as THREE from 'three';

export class Renderer {
    constructor(container) {
        this.instance = new THREE.WebGLRenderer({
            antialias: true
        });
        
        this.instance.setSize(window.innerWidth, window.innerHeight);
        this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.instance.shadowMap.enabled = true;
        
        container.appendChild(this.instance.domElement);

        // Handle window resize
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        this.instance.setSize(window.innerWidth, window.innerHeight);
        this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
} 