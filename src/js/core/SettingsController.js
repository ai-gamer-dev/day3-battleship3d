import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

export class SettingsController {
    constructor() {
        this.gui = new GUI();
        this.settings = {
            environment: {
                fog: {
                    enabled: true,
                    color: 0x87ceeb,
                    near: 60,
                    far: 200
                },
                water: {
                    distortionScale: 3.7,
                    size: 1,
                    waterColor: 0x001e0f,
                    sunColor: 0xffffff
                },
                lights: {
                    ambient: {
                        color: 0xffffff,
                        intensity: 0.8
                    },
                    directional: {
                        color: 0xffffff,
                        intensity: 1,
                        position: { x: -1, y: 1, z: -1 },
                        shadowMapSize: { width: 2048, height: 2048 },
                        shadowCamera: { near: 0.5, far: 500 }
                    }
                },
                boards: {
                    spacing: {
                        z: 30,  // Distance between boards in z-axis
                        y: 0    // Height above water
                    },
                    player: {
                        position: { x: 0, z: 15 }  // Player board position
                    },
                    ai: {
                        position: { x: 0, z: -250 }  // AI board position
                    }
                }
            },
            gameplay: {
                difficulty: {
                    level: 'medium',
                    enemySpeed: 1.0,
                    enemySpawnRate: 1.0,
                    playerHealth: 100
                },
                controls: {
                    mouseSensitivity: 1.0,
                    invertY: false,
                    scrollSensitivity: 0.05,
                    scrollMin: 20,
                    scrollMax: 200,
                    keyBindings: {
                        forward: 'W',
                        backward: 'S',
                        left: 'A',
                        right: 'D',
                        jump: 'Space'
                    }
                },
                physics: {
                    gravity: 9.8,
                    friction: 0.1,
                    airResistance: 0.01
                }
            },
            debug: {
                showFPS: false,
                showColliders: false,
                showPathfinding: false
            }
        };

        this.setupGUI();
        this.setupCopyPaste();
    }

    setupGUI() {
        // Environment Settings
        const envFolder = this.gui.addFolder('Environment');
        
        // Fog Settings
        const fogFolder = envFolder.addFolder('Fog');
        fogFolder.add(this.settings.environment.fog, 'enabled')
            .name('Enable Fog')
            .onChange(() => this.onSettingsChanged());
        fogFolder.addColor(this.settings.environment.fog, 'color')
            .name('Fog Color')
            .onChange(() => this.onSettingsChanged());
        fogFolder.add(this.settings.environment.fog, 'near', 0, 100)
            .name('Fog Near')
            .onChange(() => this.onSettingsChanged());
        fogFolder.add(this.settings.environment.fog, 'far', 100, 1000)
            .name('Fog Far')
            .onChange(() => this.onSettingsChanged());

        // Water Settings
        const waterFolder = envFolder.addFolder('Water');
        waterFolder.add(this.settings.environment.water, 'distortionScale', 0, 8, 0.1)
            .name('Distortion')
            .onChange(() => this.onSettingsChanged());
        waterFolder.add(this.settings.environment.water, 'size', 0.1, 10, 0.1)
            .name('Size')
            .onChange(() => this.onSettingsChanged());
        waterFolder.addColor(this.settings.environment.water, 'waterColor')
            .name('Water Color')
            .onChange(() => this.onSettingsChanged());
        waterFolder.addColor(this.settings.environment.water, 'sunColor')
            .name('Sun Color')
            .onChange(() => this.onSettingsChanged());

        // Lighting Settings
        const lightingFolder = envFolder.addFolder('Lighting');
        
        // Ambient Light
        const ambientFolder = lightingFolder.addFolder('Ambient Light');
        ambientFolder.addColor(this.settings.environment.lights.ambient, 'color')
            .name('Color')
            .onChange(() => this.onSettingsChanged());
        ambientFolder.add(this.settings.environment.lights.ambient, 'intensity', 0, 2)
            .name('Intensity')
            .onChange(() => this.onSettingsChanged());

        // Directional Light
        const directionalFolder = lightingFolder.addFolder('Directional Light');
        directionalFolder.addColor(this.settings.environment.lights.directional, 'color')
            .name('Color')
            .onChange(() => this.onSettingsChanged());
        directionalFolder.add(this.settings.environment.lights.directional, 'intensity', 0, 2)
            .name('Intensity')
            .onChange(() => this.onSettingsChanged());
        
        // Light Position
        const posFolder = directionalFolder.addFolder('Position');
        posFolder.add(this.settings.environment.lights.directional.position, 'x', -10, 10)
            .name('X')
            .onChange(() => this.onSettingsChanged());
        posFolder.add(this.settings.environment.lights.directional.position, 'y', -10, 10)
            .name('Y')
            .onChange(() => this.onSettingsChanged());
        posFolder.add(this.settings.environment.lights.directional.position, 'z', -10, 10)
            .name('Z')
            .onChange(() => this.onSettingsChanged());

        // Shadow Settings
        const shadowFolder = directionalFolder.addFolder('Shadow Settings');
        shadowFolder.add(this.settings.environment.lights.directional.shadowCamera, 'near', 0.1, 10)
            .name('Near')
            .onChange(() => this.onSettingsChanged());
        shadowFolder.add(this.settings.environment.lights.directional.shadowCamera, 'far', 100, 1000)
            .name('Far')
            .onChange(() => this.onSettingsChanged());
        
        // Board Position Settings
        const boardsFolder = envFolder.addFolder('Board Positions');
        
        // Spacing Settings
        const spacingFolder = boardsFolder.addFolder('Spacing');
        spacingFolder.add(this.settings.environment.boards.spacing, 'z', 20, 50)
            .name('Board Distance')
            .onChange(() => this.onSettingsChanged());
        spacingFolder.add(this.settings.environment.boards.spacing, 'y', 0, 5)
            .name('Height')
            .onChange(() => this.onSettingsChanged());
        
        // Player Board Position
        const playerBoardFolder = boardsFolder.addFolder('Player Board');
        playerBoardFolder.add(this.settings.environment.boards.player.position, 'x', -20, 20)
            .name('X Position')
            .onChange(() => this.onSettingsChanged());
        playerBoardFolder.add(this.settings.environment.boards.player.position, 'z', -20, 20)
            .name('Z Position')
            .onChange(() => this.onSettingsChanged());
        
        // AI Board Position
        const aiBoardFolder = boardsFolder.addFolder('AI Board');
        aiBoardFolder.add(this.settings.environment.boards.ai.position, 'x', -20, 20)
            .name('X Position')
            .onChange(() => this.onSettingsChanged());
        aiBoardFolder.add(this.settings.environment.boards.ai.position, 'z', -200, 20)
            .name('Z Position')
            .onChange(() => this.onSettingsChanged());

        // Open the environment folder by default
        envFolder.open();

        // Gameplay Settings
        const gameplayFolder = this.gui.addFolder('Gameplay');
        
        // Difficulty Settings
        const difficultyFolder = gameplayFolder.addFolder('Difficulty');
        difficultyFolder.add(this.settings.gameplay.difficulty, 'level', ['easy', 'medium', 'hard']).name('Level');
        difficultyFolder.add(this.settings.gameplay.difficulty, 'enemySpeed', 0.5, 2).name('Enemy Speed');
        difficultyFolder.add(this.settings.gameplay.difficulty, 'enemySpawnRate', 0.5, 2).name('Spawn Rate');
        difficultyFolder.add(this.settings.gameplay.difficulty, 'playerHealth', 50, 200).name('Player Health');

        // Controls Settings
        const controlsFolder = gameplayFolder.addFolder('Controls');
        controlsFolder.add(this.settings.gameplay.controls, 'mouseSensitivity', 0.1, 2)
            .name('Mouse Sensitivity')
            .onChange(() => this.onSettingsChanged());
        controlsFolder.add(this.settings.gameplay.controls, 'invertY')
            .name('Invert Y-Axis')
            .onChange(() => this.onSettingsChanged());
        controlsFolder.add(this.settings.gameplay.controls, 'scrollSensitivity', 0.01, 0.2)
            .name('Scroll Sensitivity')
            .onChange(() => this.onSettingsChanged());
        controlsFolder.add(this.settings.gameplay.controls, 'scrollMin', 5, 100)
            .name('Min Zoom Distance')
            .onChange(() => this.onSettingsChanged());
        controlsFolder.add(this.settings.gameplay.controls, 'scrollMax', 100, 500)
            .name('Max Zoom Distance')
            .onChange(() => this.onSettingsChanged());

        // Physics Settings
        const physicsFolder = gameplayFolder.addFolder('Physics');
        physicsFolder.add(this.settings.gameplay.physics, 'gravity', 0, 20).name('Gravity');
        physicsFolder.add(this.settings.gameplay.physics, 'friction', 0, 1).name('Friction');
        physicsFolder.add(this.settings.gameplay.physics, 'airResistance', 0, 0.1).name('Air Resistance');

        // Debug Settings
        const debugFolder = this.gui.addFolder('Debug');
        debugFolder.add(this.settings.debug, 'showFPS').name('Show FPS');
        debugFolder.add(this.settings.debug, 'showColliders').name('Show Colliders');
        debugFolder.add(this.settings.debug, 'showPathfinding').name('Show Pathfinding');
    }

    setupCopyPaste() {
        const copyPasteFolder = this.gui.addFolder('Settings Management');
        
        // Copy Settings
        copyPasteFolder.add({
            copy: () => {
                const settingsString = JSON.stringify(this.settings, null, 2);
                navigator.clipboard.writeText(settingsString)
                    .then(() => console.log('Settings copied to clipboard'))
                    .catch(err => console.error('Failed to copy settings:', err));
            }
        }, 'copy').name('Copy All Settings');

        // Load Settings
        copyPasteFolder.add({
            load: () => {
                navigator.clipboard.readText()
                    .then(text => {
                        try {
                            const newSettings = JSON.parse(text);
                            this.loadSettings(newSettings);
                            console.log('Settings loaded successfully');
                        } catch (err) {
                            console.error('Failed to parse settings:', err);
                        }
                    })
                    .catch(err => console.error('Failed to read clipboard:', err));
            }
        }, 'load').name('Load From Clipboard');
    }

    loadSettings(newSettings) {
        // Deep merge the new settings
        this.deepMerge(this.settings, newSettings);
        // Refresh GUI to reflect new values
        this.gui.refresh();
        // Emit change event
        this.onSettingsChanged();
    }

    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] instanceof Object && key in target) {
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    onSettingsChanged() {
        // Dispatch a custom event that other components can listen to
        const event = new CustomEvent('settingsChanged', { detail: this.settings });
        window.dispatchEvent(event);
    }

    // Getter methods for different setting categories
    getEnvironmentSettings() {
        return this.settings.environment;
    }

    getGameplaySettings() {
        return this.settings.gameplay;
    }

    getDebugSettings() {
        return this.settings.debug;
    }
} 