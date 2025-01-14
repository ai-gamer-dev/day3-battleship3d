import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class GameBoard {
    constructor(scene, size = 10, cellSize = 5, isPlayerBoard = true) {
        this.scene = scene;
        this.size = size;
        this.cellSize = cellSize;
        this.boardSize = size * cellSize;
        this.isPlayerBoard = isPlayerBoard;
        
        // Create board container
        this.container = new THREE.Group();
        this.scene.add(this.container);
        
        this.setupBoard();
    }

    setupBoard() {
        // Clear existing objects if any
        this.clearBoard();
        
        // Create the main board plane
        const boardGeometry = new THREE.PlaneGeometry(this.boardSize, this.boardSize);
        const boardMaterial = new THREE.MeshPhongMaterial({
            color: this.isPlayerBoard ? 0x156289 : 0x892315, // Blue for player, Red for AI
            opacity: 0.3,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        this.boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
        this.boardMesh.position.y = 0.5; // Slightly above water
        this.boardMesh.rotation.x = -Math.PI / 2;
        this.container.add(this.boardMesh);

        // Create grid lines with color based on board type
        const gridColor = this.isPlayerBoard ? 0xFFFFFF : 0xFF0000;
        const gridHelper = new THREE.GridHelper(this.boardSize, this.size, gridColor, gridColor);
        gridHelper.position.y = 0.6; // Slightly above the board
        gridHelper.material.opacity = 0.8;
        gridHelper.material.transparent = true;
        this.container.add(gridHelper);

        // Add coordinate markers
        this.addCoordinateMarkers();
    }

    clearBoard() {
        // Remove all children from the container
        while(this.container.children.length > 0) {
            const child = this.container.children[0];
            
            // Dispose of geometries and materials
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
            
            this.container.remove(child);
        }
    }

    addCoordinateMarkers() {
        const letters = 'ABCDEFGHIJ';
        const fontLoader = new FontLoader();
        
        // Set color based on board type
        const textColor = this.isPlayerBoard ? 0x0000ff : 0xff0000; // Blue for player, Red for AI
        
        // Load font from Three.js CDN
        fontLoader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            // Create text geometry options
            const textOptions = {
                font: font,
                size: this.cellSize * 0.4,
                height: 0.1
            };

            // Add letter markers (A-J)
            for (let i = 0; i < this.size; i++) {
                const textGeo = new TextGeometry(letters[i], textOptions);
                const textMaterial = new THREE.MeshPhongMaterial({ color: textColor });
                const textMesh = new THREE.Mesh(textGeo, textMaterial);
                
                // Position text at grid edge
                textMesh.position.set(
                    (i - this.size/2) * this.cellSize + this.cellSize/2,
                    0.7,
                    -this.boardSize/2 - this.cellSize/2
                );
                textMesh.rotation.x = -Math.PI / 2;
                this.container.add(textMesh);
            }

            // Add number markers (1-10)
            for (let i = 0; i < this.size; i++) {
                const textGeo = new TextGeometry((i + 1).toString(), textOptions);
                const textMaterial = new THREE.MeshPhongMaterial({ color: textColor });
                const textMesh = new THREE.Mesh(textGeo, textMaterial);
                
                // Position text at grid edge
                textMesh.position.set(
                    -this.boardSize/2 - this.cellSize/2,
                    0.7,
                    (i - this.size/2) * this.cellSize + this.cellSize/2
                );
                textMesh.rotation.x = -Math.PI / 2;
                textMesh.rotation.z = Math.PI / 2;
                this.container.add(textMesh);
            }
        });
    }

    getGridPosition(row, col) {
        // Calculate exact center position of the grid cell
        const halfBoardSize = (this.size * this.cellSize) / 2;
        const xOffset = col * this.cellSize;
        const zOffset = row * this.cellSize;
        
        return {
            x: xOffset - halfBoardSize + (this.cellSize / 2),
            z: zOffset - halfBoardSize + (this.cellSize / 2)
        };
    }
} 