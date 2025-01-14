import * as THREE from 'three';
import { WaterSystem } from './Water.js';
import { BoardController } from './BoardController.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { SettingsController } from './SettingsController.js';

export class Scene {
    constructor(camera, renderer, game) {
        this.instance = new THREE.Scene();
        this.instance.background = new THREE.Color(0x87ceeb);  // Sky blue background
        
        // Store camera and renderer references
        this.camera = camera;
        this.renderer = renderer;
        this.game = game; // Store reference to game instance
        
        // Initialize settings controller first
        this.settingsController = new SettingsController();
        
        // Initialize lights object
        this.lights = {
            ambient: null,
            directional: null
        };
        
        // Setup scene components
        this.setupEnvironment();  // This will handle fog and environment setup
        this.setupLights();
        this.setupWater();
        this.setupBoards();
        
        // Listen for settings changes
        window.addEventListener('settingsChanged', () => this.onSettingsChanged());
    }

    setupEnvironment() {
        const envSettings = this.settingsController.getEnvironmentSettings();
        
        // Set background color to match fog
        this.instance.background = new THREE.Color(envSettings.fog.color);

        // Add fog
        this.updateFog();

        // Load HDR environment map (for reflections only)
        const rgbeLoader = new RGBELoader();
        rgbeLoader.load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.instance.environment = texture;
        });
    }

    updateFog() {
        const fogSettings = this.settingsController.getEnvironmentSettings().fog;
        
        if (fogSettings.enabled) {
            this.instance.fog = new THREE.Fog(
                fogSettings.color,
                fogSettings.near,
                fogSettings.far
            );
        } else {
            this.instance.fog = null;
        }
        // Update background to match fog color
        this.instance.background.setHex(fogSettings.color);
    }

    setupLights() {
        const lightSettings = this.settingsController.getEnvironmentSettings().lights;
        
        // Add ambient light
        this.lights.ambient = new THREE.AmbientLight(
            lightSettings.ambient.color,
            lightSettings.ambient.intensity
        );
        this.instance.add(this.lights.ambient);

        // Add directional light (sun)
        this.lights.directional = new THREE.DirectionalLight(
            lightSettings.directional.color,
            lightSettings.directional.intensity
        );
        const pos = lightSettings.directional.position;
        this.lights.directional.position.set(pos.x, pos.y, pos.z);
        this.lights.directional.castShadow = true;
        
        // Configure shadow settings
        const shadowSettings = lightSettings.directional.shadowMapSize;
        this.lights.directional.shadow.mapSize.width = shadowSettings.width;
        this.lights.directional.shadow.mapSize.height = shadowSettings.height;
        this.lights.directional.shadow.camera.near = lightSettings.directional.shadowCamera.near;
        this.lights.directional.shadow.camera.far = lightSettings.directional.shadowCamera.far;
        
        this.instance.add(this.lights.directional);
    }

    updateLights() {
        const lightSettings = this.settingsController.getEnvironmentSettings().lights;
        
        // Update ambient light
        if (this.lights.ambient) {
            this.lights.ambient.color.setHex(lightSettings.ambient.color);
            this.lights.ambient.intensity = lightSettings.ambient.intensity;
        }

        // Update directional light
        if (this.lights.directional) {
            this.lights.directional.color.setHex(lightSettings.directional.color);
            this.lights.directional.intensity = lightSettings.directional.intensity;
            
            const pos = lightSettings.directional.position;
            this.lights.directional.position.set(pos.x, pos.y, pos.z);
            
            // Update shadow settings
            const shadowSettings = lightSettings.directional.shadowMapSize;
            this.lights.directional.shadow.mapSize.width = shadowSettings.width;
            this.lights.directional.shadow.mapSize.height = shadowSettings.height;
            this.lights.directional.shadow.camera.near = lightSettings.directional.shadowCamera.near;
            this.lights.directional.shadow.camera.far = lightSettings.directional.shadowCamera.far;
            
            // Update shadow camera
            this.lights.directional.shadow.camera.updateProjectionMatrix();
        }
    }

    setupWater() {
        this.waterSystem = new WaterSystem(this.instance, this.settingsController);
    }

    setupBoards() {
        this.boardController = new BoardController(
            this.instance, 
            this.settingsController, 
            this.camera, 
            this.renderer,
            this.game
        );
    }

    onSettingsChanged() {
        const envSettings = this.settingsController.getEnvironmentSettings();
        
        // Update environment components
        this.updateFog();
        this.updateLights();
        
        // Update background color to match fog
        if (envSettings.fog.enabled) {
            this.instance.background.setHex(envSettings.fog.color);
        }
    }

    update(time) {
        if (this.waterSystem) {
            this.waterSystem.update(time);
        }
    }
} 