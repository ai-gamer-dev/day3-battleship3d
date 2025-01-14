import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Scene } from './core/Scene.js';
import { Renderer } from './core/Renderer.js';
import { Camera } from './core/Camera.js';

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.clock = new THREE.Clock();
        
        this.camera = new Camera();
        this.renderer = new Renderer(this.container);
        this.scene = new Scene(this.camera.instance, this.renderer.instance, this);
        this.controls = new OrbitControls(this.camera.instance, this.renderer.instance.domElement);
        
        // Store reference to settings controller
        this.settingsController = this.scene.settingsController;
        
        // Track camera position state
        this.isAtPlayerBoard = true;
        
        this.init();
        
        // Listen for settings changes
        window.addEventListener('settingsChanged', () => this.updateControls());
        
        // Add keyboard listener for camera toggle
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }

    init() {
        // Add initial setup
        this.camera.instance.position.set(0, 40, 80);
        this.camera.instance.lookAt(0, 0, 0);
        
        // Configure controls
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        
        // Apply initial control settings
        this.updateControls();
        
        // Start animation loop
        this.animate();
    }

    updateControls() {
        const controlSettings = this.settingsController.getGameplaySettings().controls;
        
        // Apply mouse sensitivity
        this.controls.rotateSpeed = controlSettings.mouseSensitivity;
        
        // Apply scroll settings
        this.controls.zoomSpeed = controlSettings.scrollSensitivity;
        this.controls.minDistance = controlSettings.scrollMin;
        this.controls.maxDistance = controlSettings.scrollMax;
        
        // Apply invert Y
        this.controls.rotateUp = function(angle) {
            const factor = controlSettings.invertY ? -1 : 1;
            this.sphericalDelta.phi -= angle * factor;
        };
        
        this.controls.maxPolarAngle = Math.PI / 2.1; // Prevent going below the board
        this.controls.target.set(0, 0, 0);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const elapsedTime = this.clock.getElapsedTime();
        
        this.controls.update();
        this.scene.update(elapsedTime);
        this.renderer.instance.render(this.scene.instance, this.camera.instance);
    }

    handleKeyPress(event) {
        if (event.key.toLowerCase() === 'f') {
            this.toggleCameraPosition();
        } else if (event.key === 'r' && this.boardController.turnController) {
            // Reset game when 'r' is pressed and game is initialized
            this.boardController.resetBoards();
            this.boardController.turnController.reset();
        }
    }

    toggleCameraPosition() {
        const boardSettings = this.settingsController.getEnvironmentSettings().boards;
        const targetZ = this.isAtPlayerBoard ? 
            boardSettings.ai.position.z - 40 : // Move behind AI board
            boardSettings.player.position.z + 40; // Move behind player board
        
        // Create animation targets
        const startPosition = this.camera.instance.position.clone();
        const endPosition = new THREE.Vector3(0, 40, targetZ);
        
        // Create orbit control target positions
        const startTarget = this.controls.target.clone();
        const endTarget = new THREE.Vector3(
            0,
            0,
            this.isAtPlayerBoard ? boardSettings.ai.position.z : boardSettings.player.position.z
        );
        
        // Create animation
        const duration = 1000; // 1 second
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic function: 1 - (1 - x)^3
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate camera position
            this.camera.instance.position.lerpVectors(startPosition, endPosition, easeOut);
            
            // Interpolate orbit controls target
            this.controls.target.lerpVectors(startTarget, endTarget, easeOut);
            
            // Update camera to look at the interpolated target
            this.camera.instance.lookAt(this.controls.target);
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        // Start animation
        requestAnimationFrame(animate);
        
        // Toggle state
        this.isAtPlayerBoard = !this.isAtPlayerBoard;
    }
}

// Start the game when the window loads
window.addEventListener('load', () => {
    new Game();
}); 