import * as THREE from 'three';
import { Water } from 'three/water';

export class WaterSystem {
    constructor(scene, settingsController) {
        this.scene = scene;
        this.settingsController = settingsController;
        this.waterSettings = this.settingsController.getEnvironmentSettings().water;

        this.setupWater();
        
        // Listen for settings changes
        window.addEventListener('settingsChanged', () => this.onSettingsChanged());
    }

    setupWater() {
        // Water geometry
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

        // Load textures
        const textureLoader = new THREE.TextureLoader();
        const waterNormals = textureLoader.load('https://threejs.org/examples/textures/waternormals.jpg', (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        });

        // Create water
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                sunDirection: new THREE.Vector3(),
                sunColor: this.waterSettings.sunColor,
                waterColor: this.waterSettings.waterColor,
                distortionScale: this.waterSettings.distortionScale,
                fog: this.scene.fog !== undefined
            }
        );

        this.water.rotation.x = -Math.PI / 2;
        this.scene.add(this.water);

        // Add sun position to uniforms
        const sun = new THREE.Vector3();
        this.water.material.uniforms['sunDirection'].value.copy(sun).normalize();
    }

    onSettingsChanged() {
        const newSettings = this.settingsController.getEnvironmentSettings().water;
        
        // Update water material uniforms
        this.water.material.uniforms['distortionScale'].value = newSettings.distortionScale;
        this.water.material.uniforms['size'].value = newSettings.size;
        this.water.material.uniforms['waterColor'].value.setHex(newSettings.waterColor);
        this.water.material.uniforms['sunColor'].value.setHex(newSettings.sunColor);
    }

    update(time) {
        if (this.water) {
            this.water.material.uniforms['time'].value = time;
        }
    }
} 