import * as THREE from 'three';
import { GameBoard } from './GameBoard.js';
import { ShipsController } from './ShipsController.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { TurnController } from './TurnController.js';
import { ModelLoader } from './ModelLoader.js';

export class BoardController {
    constructor(scene, settingsController, camera, renderer, game) {
        this.scene = scene;
        this.settingsController = settingsController;
        this.camera = camera;
        this.renderer = renderer;
        this.gridSize = 10; // Standard Battleship board size
        this.cellSize = 5;  // Size of each cell in the 3D space
        this.boardHeight = 0; // Height of the game board from ground
        
        // Store game reference directly
        this.game = game;

        // Initialize model loader
        this.modelLoader = new ModelLoader();

        // Initialize game boards
        this.playerBoard = new GameBoard(scene, this.gridSize, this.cellSize, true);  // Player board (blue)
        this.aiBoard = new GameBoard(scene, this.gridSize, this.cellSize, false);     // AI board (red)
        
        // Get initial settings
        this.settings = this.settingsController.getEnvironmentSettings().boards;
        
        // Position the boards
        this.updateBoardPositions();
        
        // Listen for settings changes
        window.addEventListener('settingsChanged', () => this.onSettingsChanged());
        
        // Initialize game state
        this.boards = {
            player: Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0)),
            ai: Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0))
        };
        
        // Track hits and misses
        this.shots = {
            player: Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false)),
            ai: Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false))
        };

        // Initialize ships controller
        this.shipsController = new ShipsController(this);

        // Initialize ship placement state
        this.placementState = {
            active: false,
            currentShip: null,
            isVertical: false,
            shadowMesh: null,
            shipSequence: [
                { type: 'carrier', size: 5 },
                { type: 'battleship', size: 4 },
                { type: 'cruiser', size: 3 },
                { type: 'submarine', size: 3 },
                { type: 'destroyer', size: 2 }
            ],
            currentShipIndex: 0
        };

        // Setup ship placement UI
        this.setupShipPlacementUI();

        // Initialize bomb preview state
        this.bombPreview = {
            active: false,
            mesh: null
        };

        // Setup game interaction handlers
        this.setupGameInteractions();
    }

    // Setup ship placement UI
    setupShipPlacementUI() {
        const placementUI = document.getElementById('ship-placement-ui');
        const randomBtn = document.getElementById('random-placement');
        const manualBtn = document.getElementById('manual-placement');

        // Show placement UI when starting a new game
        placementUI.classList.remove('hidden');

        // Handle random placement
        randomBtn.addEventListener('click', () => {
            this.placeShipsRandomly(true);
            placementUI.classList.add('hidden');
            this.startGame();
        });

        // Handle manual placement
        manualBtn.addEventListener('click', () => {
            placementUI.classList.add('hidden');
            this.startManualPlacement();
        });

        // Handle rotation with 'R' key
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'r' && this.placementState.active) {
                this.rotateCurrentShip();
            }
        });

        // Handle mouse movement for shadow preview
        document.addEventListener('mousemove', (event) => {
            if (this.placementState.active && this.placementState.currentShip) {
                this.updateShadowPosition(event);
            }
        });

        // Handle click for ship placement
        document.addEventListener('click', (event) => {
            if (this.placementState.active && this.placementState.currentShip) {
                this.tryPlaceShip(event);
            }
        });
    }

    // Start manual ship placement mode
    startManualPlacement() {
        this.placementState.active = true;
        this.placementState.currentShipIndex = 0;
        this.selectNextShip();
        
        // Show ship info overlay
        const shipInfo = document.getElementById('current-ship-info');
        shipInfo.classList.remove('hidden');
    }

    // Select next ship in sequence
    selectNextShip() {
        if (this.placementState.currentShipIndex < this.placementState.shipSequence.length) {
            const ship = this.placementState.shipSequence[this.placementState.currentShipIndex];
            this.placementState.currentShip = ship;
            this.createShadowShip(ship.size);
            
            // Update ship info display
            document.getElementById('ship-name').textContent = ship.type.charAt(0).toUpperCase() + ship.type.slice(1);
            document.getElementById('ship-length').textContent = ship.size;
        }
    }

    // Try to place the current ship
    tryPlaceShip(event) {
        const intersects = this.getGridIntersection(event);
        if (!intersects) return;

        const { row, col } = intersects;
        const shipLength = this.placementState.currentShip.size;
        const isVertical = this.placementState.isVertical;

        if (this.isValidPlacement(this.boards.player, shipLength, row, col, isVertical)) {
            // Place the ship
            this.placeShip(true, shipLength, row, col, isVertical);

            // Move to next ship
            this.placementState.currentShipIndex++;
            
            // Check if all ships are placed
            if (this.placementState.currentShipIndex >= this.placementState.shipSequence.length) {
                // All ships placed, start the game
                if (this.placementState.shadowMesh) {
                    this.playerBoard.container.remove(this.placementState.shadowMesh);
                }
                this.placementState.active = false;
                document.getElementById('current-ship-info').classList.add('hidden');
                this.startGame();
            } else {
                // Select next ship
                this.selectNextShip();
            }
        }
    }

    // Create shadow ship for placement preview
    async createShadowShip(shipLength) {
        if (this.placementState.shadowMesh) {
            this.playerBoard.container.remove(this.placementState.shadowMesh);
        }

        const currentShip = this.placementState.shipSequence[this.placementState.currentShipIndex];
        try {
            const model = await this.modelLoader.loadModel(currentShip.type);
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0x00ff00,
                        opacity: 0.5,
                        transparent: true
                    });
                }
            });

            // Scale the model to fit the grid
            const boundingBox = new THREE.Box3().setFromObject(model);
            const modelSize = boundingBox.getSize(new THREE.Vector3());
            const scale = (this.cellSize * shipLength * 0.8) / modelSize.z;
            model.scale.set(scale, scale, scale);

            this.placementState.shadowMesh = model;
            this.playerBoard.container.add(model);
        } catch (error) {
            console.error('Failed to load ship model:', error);
            // Fallback to box geometry if model loading fails
            const shipWidth = this.cellSize * 0.8;
            const shipLength3D = this.cellSize * shipLength * 0.8;
            const height = this.cellSize * 0.4;
            const geometry = new THREE.BoxGeometry(shipWidth, height, shipLength3D);
            const material = new THREE.MeshPhongMaterial({
                color: 0x00ff00,
                opacity: 0.5,
                transparent: true
            });
            this.placementState.shadowMesh = new THREE.Mesh(geometry, material);
            this.playerBoard.container.add(this.placementState.shadowMesh);
        }
    }

    // Update shadow ship position based on mouse movement
    updateShadowPosition(event) {
        const intersects = this.getGridIntersection(event);
        if (!intersects) {
            if (this.placementState.shadowMesh) {
                this.placementState.shadowMesh.visible = false;
            }
            return;
        }

        if (this.placementState.shadowMesh) {
            this.placementState.shadowMesh.visible = true;
        }

        const { row, col } = intersects;
        const isValid = this.isValidPlacement(
            this.boards.player,
            this.placementState.currentShip.size,
            row,
            col,
            this.placementState.isVertical
        );

        // Update shadow position
        const gridPos = this.playerBoard.getGridPosition(row, col);
        const shipLength = this.placementState.currentShip.size;

        let centerX, centerZ;
        if (this.placementState.isVertical) {
            centerX = gridPos.x;
            centerZ = gridPos.z + (this.cellSize * (shipLength - 1) / 2);
            // Set rotation for vertical orientation (model's forward is Z)
            this.placementState.shadowMesh.rotation.y = 0;
        } else {
            centerX = gridPos.x + (this.cellSize * (shipLength - 1) / 2);
            centerZ = gridPos.z;
            // Set rotation for horizontal orientation (90 degrees)
            this.placementState.shadowMesh.rotation.y = Math.PI / 2;
        }

        this.placementState.shadowMesh.position.set(centerX, 2, centerZ);

        // Update shadow color based on validity
        this.placementState.shadowMesh.traverse((child) => {
            if (child.isMesh) {
                child.material.color.setHex(isValid ? 0x00ff00 : 0xff0000);
            }
        });
    }

    // Rotate the current shadow ship
    rotateCurrentShip() {
        this.placementState.isVertical = !this.placementState.isVertical;
        if (this.placementState.shadowMesh) {
            // Update shadow position with last known mouse position
            if (this.lastMouseX !== undefined && this.lastMouseY !== undefined) {
                this.updateShadowPosition({
                    clientX: this.lastMouseX,
                    clientY: this.lastMouseY
                });
            }
        }
    }

    // Get grid intersection point from mouse event
    getGridIntersection(event) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Store last mouse position for rotation updates
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, this.camera);

        // Calculate objects intersecting the picking ray for both boards
        const playerIntersects = raycaster.intersectObject(this.playerBoard.boardMesh);
        const aiIntersects = raycaster.intersectObject(this.aiBoard.boardMesh);
        
        // During placement phase, only check player board
        if (this.placementState.active && playerIntersects.length > 0) {
            const point = playerIntersects[0].point;
            return this.getGridCoordinates(point, true);
        }
        
        // During game phase, only check AI board
        if (!this.placementState.active && aiIntersects.length > 0) {
            const point = aiIntersects[0].point;
            return this.getGridCoordinates(point, false);
        }

        return null;
    }

    // Helper method to convert point to grid coordinates
    getGridCoordinates(point, isPlayerBoard) {
        const board = isPlayerBoard ? this.playerBoard : this.aiBoard;
        
        // Convert intersection point to board-local coordinates
        const boardX = point.x - board.container.position.x;
        const boardZ = point.z - board.container.position.z;
        
        // Calculate board size
        const boardSize = this.gridSize * this.cellSize;
        
        // Convert to grid coordinates, accounting for AI board rotation
        let col, row;
        if (isPlayerBoard) {
            col = Math.floor((boardX + boardSize / 2) / this.cellSize);
            row = Math.floor((boardZ + boardSize / 2) / this.cellSize);
        } else {
            // For AI board, invert the coordinates due to 180-degree rotation
            col = this.gridSize - 1 - Math.floor((boardX + boardSize / 2) / this.cellSize);
            row = this.gridSize - 1 - Math.floor((boardZ + boardSize / 2) / this.cellSize);
        }
        
        // Ensure coordinates are within grid bounds
        if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
            return { row, col };
        }
        return null;
    }

    // Start the game after ship placement
    startGame() {
        console.log("Starting game - placing AI ships");
        // Clear any existing bomb preview
        this.clearBombPreview();
        
        // Place AI ships randomly
        this.shipsController.placeRandomShips(false);  // Place AI ships
        console.log("AI ships placed:", this.shipsController.getShips(false));
        
        // Initialize turn controller with game reference
        this.turnController = new TurnController(this, this.shipsController, this.game);
    }

    updateBoardPositions() {
        // Update height for both boards
        this.playerBoard.container.position.y = this.settings.spacing.y;
        this.aiBoard.container.position.y = this.settings.spacing.y;
        
        // Update player board position
        this.playerBoard.container.position.x = this.settings.player.position.x;
        this.playerBoard.container.position.z = this.settings.player.position.z;
        this.playerBoard.container.rotation.y = 0; // Reset rotation
        
        // Update AI board position
        this.aiBoard.container.position.x = this.settings.ai.position.x;
        this.aiBoard.container.position.z = this.settings.ai.position.z;
        this.aiBoard.container.rotation.y = Math.PI; // Rotate 180 degrees
    }

    onSettingsChanged() {
        // Update settings reference
        this.settings = this.settingsController.getEnvironmentSettings().boards;
        // Update board positions
        this.updateBoardPositions();
    }

    // Place a ship on the specified board
    placeShip(isPlayerBoard, shipLength, startRow, startCol, isVertical, shipType) {
        const board = isPlayerBoard ? this.boards.player : this.boards.ai;
        
        // If no position is provided, use random placement
        if (startRow === undefined || startCol === undefined) {
            return this.placeShipRandomly(board, shipLength, shipType, isPlayerBoard);
        }
        
        let currentRow = startRow;
        let currentCol = startCol;
        let currentOrientation = isVertical;
        
        // Try to find a valid position
        for (let attempts = 0; attempts < 100; attempts++) {  // Limit attempts to prevent infinite loops
            if (this.isValidPlacement(board, shipLength, currentRow, currentCol, currentOrientation)) {
                // Place the ship in valid position
                for (let i = 0; i < shipLength; i++) {
                    if (currentOrientation) {
                        board[currentRow + i][currentCol] = 1;
                    } else {
                        board[currentRow][currentCol + i] = 1;
                    }
                }
                
                // Add visual representation of the ship
                this.visualizeShip(isPlayerBoard, shipLength, currentRow, currentCol, currentOrientation, shipType);
                return true;
            }
            
            // Try different positions and orientations
            if (attempts % 4 === 0) {
                currentCol = Math.min(this.gridSize - (currentOrientation ? 1 : shipLength), currentCol + 1);
            } else if (attempts % 4 === 1) {
                currentRow = Math.min(this.gridSize - (currentOrientation ? shipLength : 1), currentRow + 1);
            } else if (attempts % 4 === 2) {
                currentCol = Math.max(0, currentCol - 1);
            } else {
                currentOrientation = !currentOrientation;
                currentRow = Math.max(0, currentRow - 1);
            }
            
            // Ensure we stay within grid boundaries after each move
            if (currentOrientation) {
                currentRow = Math.min(currentRow, this.gridSize - shipLength);
            } else {
                currentCol = Math.min(currentCol, this.gridSize - shipLength);
            }
        }
        
        return false;  // Could not place ship after all attempts
    }

    // New method for random ship placement
    placeShipRandomly(board, shipLength, shipType, isPlayerBoard) {
        let attempts = 0;
        const maxAttempts = 500; // Maximum attempts to place a ship

        while (attempts < maxAttempts) {
            // Random orientation: true => vertical, false => horizontal
            const isVertical = Math.random() < 0.5;
            
            // Calculate maximum valid starting positions based on orientation and ship length
            const maxRow = this.gridSize - (isVertical ? shipLength : 1);
            const maxCol = this.gridSize - (isVertical ? 1 : shipLength);
            
            // Generate random starting position
            const startRow = Math.floor(Math.random() * (maxRow + 1));
            const startCol = Math.floor(Math.random() * (maxCol + 1));
            
            // Check if placement is valid
            if (this.isValidPlacement(board, shipLength, startRow, startCol, isVertical)) {
                // Place the ship
                for (let i = 0; i < shipLength; i++) {
                    if (isVertical) {
                        board[startRow + i][startCol] = 1;
                    } else {
                        board[startRow][startCol + i] = 1;
                    }
                }
                
                // Add visual representation of the ship
                this.visualizeShip(isPlayerBoard, shipLength, startRow, startCol, isVertical, shipType);
                return true;
            }
            
            attempts++;
        }
        
        return false; // Could not place ship after maximum attempts
    }

    // Place ships randomly for AI
    placeShipsRandomly(isPlayerBoard) {
        const ships = [
            { type: 'carrier', size: 5, name: 'Carrier' },
            { type: 'battleship', size: 4, name: 'Battleship' },
            { type: 'cruiser', size: 3, name: 'Cruiser' },
            { type: 'submarine', size: 3, name: 'Submarine' },
            { type: 'destroyer', size: 2, name: 'Destroyer' }
        ];

        let maxRetries = 10; // Maximum number of complete board resets
        let retryCount = 0;

        while (retryCount < maxRetries) {
            let allShipsPlaced = true;
            
            // Try to place each ship
            for (const ship of ships) {
                const placed = this.placeShip(isPlayerBoard, ship.size, undefined, undefined, undefined, ship.type);
                if (!placed) {
                    allShipsPlaced = false;
                    break;
                }
            }

            if (allShipsPlaced) {
                return true;
            }

            // Reset only the target board and try again
            const targetBoard = isPlayerBoard ? this.boards.player : this.boards.ai;
            for (let i = 0; i < this.gridSize; i++) {
                for (let j = 0; j < this.gridSize; j++) {
                    targetBoard[i][j] = 0;
                }
            }
            
            // Clear visual elements for the target board
            if (isPlayerBoard) {
                this.playerBoard.container.clear();
                this.playerBoard.setupBoard();
            } else {
                this.aiBoard.container.clear();
                this.aiBoard.setupBoard();
            }

            retryCount++;
        }
        
        throw new Error('Failed to place all ships after maximum retries');
    }

    // Visualize a ship on the board
    async visualizeShip(isPlayerBoard, shipLength, startRow, startCol, isVertical, shipType) {
        const board = isPlayerBoard ? this.playerBoard : this.aiBoard;
        const color = isPlayerBoard ? 0x0066cc : 0xcc0000;
        const letters = 'ABCDEFGHIJ';
        
        try {
            // Use the provided ship type or find it based on length
            const type = shipType || this.placementState.shipSequence.find(s => s.size === shipLength)?.type || 'destroyer';
            const model = await this.modelLoader.loadModel(type);
            
            // Apply color and material settings
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: color,
                        opacity: isPlayerBoard ? 1.0 : 0.0, // Make AI ships invisible
                        transparent: true,
                        shininess: 100,
                        specular: 0x444444,
                        flatShading: false
                    });
                    child.castShadow = isPlayerBoard; // Only player ships cast shadows
                    child.receiveShadow = isPlayerBoard; // Only player ships receive shadows
                    // Make AI ships non-interactive
                    if (!isPlayerBoard) {
                        child.visible = false;
                    }
                }
            });

            // Scale the model to fit the grid
            const boundingBox = new THREE.Box3().setFromObject(model);
            const modelSize = boundingBox.getSize(new THREE.Vector3());
            const scale = (this.cellSize * shipLength * 0.8) / modelSize.z;
            model.scale.set(scale, scale, scale);

            // Get exact grid position for the start of the ship
            const startPos = board.getGridPosition(startRow, startCol);
            
            // Calculate the center position of the entire ship
            let shipCenterX, shipCenterZ;
            if (isVertical) {
                shipCenterX = startPos.x;
                shipCenterZ = startPos.z + (this.cellSize * (shipLength - 1) / 2);
            } else {
                shipCenterX = startPos.x + (this.cellSize * (shipLength - 1) / 2);
                shipCenterZ = startPos.z;
            }
            
            // Position ship with initial height
            model.position.set(shipCenterX, 2 + this.boardHeight, shipCenterZ);
            
            // Apply rotation for horizontal ships and AI board
            if (!isVertical) {
                model.rotation.y = Math.PI / 2;
            }
            if (!isPlayerBoard) {
                // For AI board, add 180 degrees to match board rotation
                model.rotation.y += Math.PI;
            }
            
            board.container.add(model);

            // Add floating animation
            const startTime = Date.now();
            const animate = () => {
                const time = Date.now() * 0.001;
                const deltaY = Math.sin(time * 1.5) * 0.2; // Gentle floating effect
                const deltaRoll = Math.sin(time * 1.2) * 0.02; // Subtle rolling effect
                const deltaPitch = Math.sin(time * 1.0) * 0.02; // Subtle pitching effect

                model.position.y = 2 + this.boardHeight + deltaY;
                model.rotation.z = deltaRoll;
                model.rotation.x = deltaPitch;

                requestAnimationFrame(animate);
            };
            animate();

            // Add position labels only for player board
            if (isPlayerBoard) {
                this.addShipPositionLabels(board, startRow, startCol, shipLength, isVertical, letters);
            }
        } catch (error) {
            console.error('Failed to load ship model:', error);
            // Fallback to original box geometry implementation
            this.visualizeShipFallback(board, shipLength, startRow, startCol, isVertical, color, letters, isPlayerBoard);
        }
    }

    // Fallback visualization using box geometry
    visualizeShipFallback(board, shipLength, startRow, startCol, isVertical, color, letters, isPlayerBoard) {
        const shipWidth = this.cellSize * 0.8;
        const shipLength3D = this.cellSize * shipLength * 0.8;
        const height = this.cellSize * 0.4;
        
        const shipGeometry = new THREE.BoxGeometry(shipWidth, height, shipLength3D);
        const shipMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            opacity: isPlayerBoard ? 1.0 : 0.0, // Make AI ships invisible
            transparent: true,
            shininess: 100,
            specular: 0x444444,
            flatShading: false
        });
        
        const shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
        
        // Add tower for larger ships
        if (shipLength >= 4) {
            const towerGeometry = new THREE.BoxGeometry(
                this.cellSize * 0.3,
                this.cellSize * 0.6,
                this.cellSize * 0.3
            );
            const towerMaterial = shipMaterial.clone();
            towerMaterial.color.offsetHSL(0, 0, 0.1);
            const towerMesh = new THREE.Mesh(towerGeometry, towerMaterial);
            
            towerMesh.position.y = height;
            towerMesh.position.x = 0;
            towerMesh.position.z = 0;
            
            shipMesh.add(towerMesh);
        }
        
        const startPos = board.getGridPosition(startRow, startCol);
        
        let shipCenterX, shipCenterZ;
        if (isVertical) {
            shipCenterX = startPos.x;
            shipCenterZ = startPos.z + (this.cellSize * (shipLength - 1) / 2);
        } else {
            shipCenterX = startPos.x + (this.cellSize * (shipLength - 1) / 2);
            shipCenterZ = startPos.z;
        }
        
        shipMesh.position.set(shipCenterX, 2 + this.boardHeight, shipCenterZ);
        
        // Apply rotation for horizontal ships and AI board
        if (!isVertical) {
            shipMesh.rotation.y = Math.PI / 2;
        }
        if (!isPlayerBoard) {
            // For AI board, add 180 degrees to match board rotation
            shipMesh.rotation.y += Math.PI;
        }
        
        shipMesh.castShadow = isPlayerBoard;
        shipMesh.receiveShadow = isPlayerBoard;
        if (!isPlayerBoard) {
            shipMesh.visible = false;
        }
        
        board.container.add(shipMesh);

        // Add floating animation for fallback ships
        const animate = () => {
            const time = Date.now() * 0.001;
            const deltaY = Math.sin(time * 1.5) * 0.2; // Gentle floating effect
            const deltaRoll = Math.sin(time * 1.2) * 0.02; // Subtle rolling effect
            const deltaPitch = Math.sin(time * 1.0) * 0.02; // Subtle pitching effect

            shipMesh.position.y = 2 + this.boardHeight + deltaY;
            shipMesh.rotation.z = deltaRoll;
            shipMesh.rotation.x = deltaPitch;

            requestAnimationFrame(animate);
        };
        animate();

        // Add position labels only for player board
        if (isPlayerBoard) {
            this.addShipPositionLabels(board, startRow, startCol, shipLength, isVertical, letters);
        }
    }

    // Helper method to add position labels
    addShipPositionLabels(board, startRow, startCol, shipLength, isVertical, letters) {
        // Skip adding labels since they would overlap with ships
        // This is intentionally left empty to hide labels on ship cells
        return;
    }

    // Check if a ship placement is valid
    isValidPlacement(board, shipLength, startRow, startCol, isVertical) {
        // Check if starting position is within board
        if (startRow < 0 || startCol < 0 || startRow >= this.gridSize || startCol >= this.gridSize) {
            return false;
        }
        
        // Check if ship fits within board boundaries
        if (isVertical && startRow + shipLength > this.gridSize) {
            return false;
        }
        if (!isVertical && startCol + shipLength > this.gridSize) {
            return false;
        }
        
        // Check for collisions with other ships (including adjacent cells)
        // Check one cell before and after the ship length for spacing
        for (let i = -1; i <= shipLength; i++) {
            for (let j = -1; j <= 1; j++) {
                let row = startRow + (isVertical ? i : j);
                let col = startCol + (isVertical ? j : i);
                
                // Skip checks outside the board
                if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
                    continue;
                }
                
                // If there's a ship in adjacent cell, placement is invalid
                if (board[row][col] === 1) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // Process an attack on a specific cell
    processAttack(isPlayerAttacking, row, col) {
        const targetBoard = isPlayerAttacking ? this.boards.ai : this.boards.player;
        const shotsBoard = isPlayerAttacking ? this.shots.player : this.shots.ai;
        
        // Check if cell was already attacked
        if (shotsBoard[row][col]) {
            return null;
        }
        
        // Record the shot
        shotsBoard[row][col] = true;
        
        // Debug logging
        console.log('Attack at:', {
            row,
            col,
            isPlayerAttacking,
            hasShip: targetBoard[row][col] === 1
        });
        
        // For AI board, we need to transform coordinates to match internal ship positions
        let processRow = row;
        let processCol = col;
        if (isPlayerAttacking) {
            // For the AI board, we need to:
            // 1. Keep the row as is since it matches the internal coordinates
            // 2. Keep the column as is since it matches the internal coordinates
            // No transformation needed - the visual rotation is handled by the board display
            processRow = row;
            processCol = col;
        }
        
        // Process hit through ships controller
        const hitResult = this.shipsController.processHit(!isPlayerAttacking, processRow, processCol);
        
        // Debug logging
        console.log('Hit result:', hitResult);
        
        // Visualize the hit or miss
        this.visualizeShot(isPlayerAttacking, row, col, hitResult.hit);

        // If a ship was sunk, show it
        if (hitResult.hit && hitResult.sunk) {
            // Get the ship that was just hit
            const sunkShip = this.shipsController.findShipAtPosition(!isPlayerAttacking, processRow, processCol);
            if (sunkShip) {
                console.log('Found sunk ship:', sunkShip);
                this.visualizeDestroyedShip(isPlayerAttacking, sunkShip);
            }
        }
        
        return hitResult;
    }

    visualizeShot(isPlayerAttacking, row, col, isHit) {
        const board = isPlayerAttacking ? this.aiBoard : this.playerBoard;
        const color = isHit ? 0xff0000 : 0xffffff;  // Red if hit, White if miss
        
        // Create marker geometry
        const geometry = new THREE.SphereGeometry(this.cellSize * 0.2);
        const material = new THREE.MeshPhongMaterial({ 
            color: color,
            emissive: isHit ? color : 0x000000, // Only add emissive for hits
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9
        });
        const marker = new THREE.Mesh(geometry, material);
        
        // Position marker
        const gridPos = board.getGridPosition(row, col);
        marker.position.set(gridPos.x, 2, gridPos.z);  // Slightly above ships
        
        board.container.add(marker);

        // Add animation for hits
        if (isHit) {
            const animate = () => {
                const time = Date.now() * 0.001;
                marker.scale.x = 1 + Math.sin(time * 5) * 0.1;
                marker.scale.y = 1 + Math.sin(time * 6) * 0.1;
                marker.scale.z = 1 + Math.sin(time * 4) * 0.1;
                marker.material.emissiveIntensity = 0.3 + Math.sin(time * 8) * 0.2;
                
                requestAnimationFrame(animate);
            };
            animate();
        }
    }

    // Check if all ships on a board are sunk
    isGameOver(isPlayerBoard) {
        const board = isPlayerBoard ? this.boards.player : this.boards.ai;
        const shots = isPlayerAttacking ? this.shots.ai : this.shots.player;
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (board[row][col] === 1 && !shots[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }

    // Reset both boards for a new game
    resetBoards() {
        // Reset board states
        this.boards.player = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.boards.ai = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        
        // Reset shots
        this.shots.player = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));
        this.shots.ai = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));

        // Clear visual elements
        this.playerBoard.container.clear();
        this.aiBoard.container.clear();
        
        // Reinitialize boards
        this.playerBoard.setupBoard();
        this.aiBoard.setupBoard();
        
        // Initialize new ships
        this.shipsController.initializeShips();

        // Clear bomb preview
        this.clearBombPreview();
    }

    // Clear bomb preview
    clearBombPreview() {
        if (this.bombPreview.mesh) {
            this.aiBoard.container.remove(this.bombPreview.mesh);
            this.bombPreview.mesh = null;
        }
        this.bombPreview.active = false;
    }

    // Get the 3D position for a grid cell
    getWorldPosition(isPlayerBoard, row, col) {
        const board = isPlayerBoard ? this.playerBoard : this.aiBoard;
        const gridPos = board.getGridPosition(row, col);
        
        return {
            x: gridPos.x + board.container.position.x,
            y: board.container.position.y,
            z: gridPos.z + board.container.position.z
        };
    }

    // Setup game interaction handlers
    setupGameInteractions() {
        // Handle mouse movement for bomb preview
        document.addEventListener('mousemove', (event) => {
            if (!this.placementState.active) {
                this.updateBombPreview(event);
            }
        });
    }

    // Create bomb preview mesh
    async createBombPreview() {
        if (this.bombPreview.mesh) {
            this.aiBoard.container.remove(this.bombPreview.mesh);
        }

        try {
            const model = await this.modelLoader.loadModel('rocket');
            
            // Apply preview material
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0xff8800,
                        opacity: 0.6,
                        transparent: true,
                        emissive: 0xff8800,
                        emissiveIntensity: 0.3
                    });
                }
            });

            // Scale the rocket to fit the cell
            const boundingBox = new THREE.Box3().setFromObject(model);
            const modelSize = boundingBox.getSize(new THREE.Vector3());
            const scale = (this.cellSize * 0.6) / Math.max(modelSize.x, modelSize.y, modelSize.z);
            model.scale.set(scale, scale, scale);

            // Rotate to point downward
            model.rotation.x = Math.PI;

            this.bombPreview.mesh = model;
            this.aiBoard.container.add(this.bombPreview.mesh);
        } catch (error) {
            console.error('Failed to load rocket model for preview:', error);
            // Fallback to sphere if model loading fails
            const geometry = new THREE.SphereGeometry(this.cellSize * 0.3);
            const material = new THREE.MeshPhongMaterial({
                color: 0xff8800,
                opacity: 0.6,
                transparent: true,
                emissive: 0xff8800,
                emissiveIntensity: 0.3
            });
            this.bombPreview.mesh = new THREE.Mesh(geometry, material);
            this.aiBoard.container.add(this.bombPreview.mesh);
        }
    }

    // Update bomb preview position based on mouse movement
    updateBombPreview(event) {
        const intersects = this.getGridIntersection(event);
        
        if (!this.bombPreview.mesh) {
            this.createBombPreview();
            return;
        }

        if (!intersects) {
            if (this.bombPreview.mesh) {
                this.bombPreview.mesh.visible = false;
            }
            return;
        }

        const { row, col } = intersects;
        const board = this.aiBoard;
        const shotsBoard = this.shots.player;

        // Don't show preview if cell was already attacked
        if (shotsBoard[row][col]) {
            this.bombPreview.mesh.visible = false;
            return;
        }

        this.bombPreview.mesh.visible = true;
        
        // Calculate exact center of the cell
        const cellCenter = this.getCellCenter(board, row, col);
        this.bombPreview.mesh.position.set(
            cellCenter.x,
            3, // Slightly above the board
            cellCenter.z
        );

        // Add hover animation
        const time = Date.now() * 0.001;
        this.bombPreview.mesh.position.y = 3 + Math.sin(time * 4) * 0.2;
    }

    // Get the exact center position of a cell
    getCellCenter(board, row, col) {
        const gridPos = board.getGridPosition(row, col);
        return {
            x: gridPos.x,
            y: gridPos.y,
            z: gridPos.z
        };
    }

    // Handle attack click
    async handleAttack(event) {
        const intersects = this.getGridIntersection(event);
        if (!intersects) return;

        const { row, col } = intersects;
        const board = this.aiBoard;
        const cellCenter = this.getCellCenter(board, row, col);

        try {
            // Create a new rocket for the attack
            const model = await this.modelLoader.loadModel('rocket');
            
            // Apply attack material
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0xff0000,
                        emissive: 0xff0000,
                        emissiveIntensity: 0.5
                    });
                }
            });

            // Scale the rocket
            const boundingBox = new THREE.Box3().setFromObject(model);
            const modelSize = boundingBox.getSize(new THREE.Vector3());
            const scale = (this.cellSize * 0.6) / Math.max(modelSize.x, modelSize.y, modelSize.z);
            model.scale.set(scale, scale, scale);

            // Rotate to point downward
            model.rotation.x = Math.PI;

            // Position rocket high above the target cell center
            model.position.set(cellCenter.x, 50, cellCenter.z);
            board.container.add(model);

            // Animate the rocket falling
            const startTime = Date.now();
            const duration = 1000; // 1 second for the fall
            const startY = 50;
            const targetY = 2;

            const animateRocket = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Quadratic easing for more realistic falling motion
                const currentY = startY + (targetY - startY) * (progress * progress);
                model.position.y = currentY;

                if (progress < 1) {
                    requestAnimationFrame(animateRocket);
                } else {
                    // Process the attack after the rocket lands
                    const result = this.processAttack(true, row, col);
                    if (result && result.hit) {
                        this.createFireEffect(row, col);
                    }
                    
                    // Remove the rocket after impact
                    setTimeout(() => {
                        board.container.remove(model);
                    }, 500);
                }
            };

            animateRocket();
        } catch (error) {
            console.error('Failed to load rocket model for attack:', error);
            // If model loading fails, just process the attack immediately
            const result = this.processAttack(true, row, col);
            if (result && result.hit) {
                this.createFireEffect(row, col);
            }
        }
    }

    // Create fire effect for hits
    createFireEffect(row, col) {
        const board = this.aiBoard;
        const cellCenter = this.getCellCenter(board, row, col);

        // Create fire sphere
        const geometry = new THREE.SphereGeometry(this.cellSize * 0.25);
        const material = new THREE.MeshPhongMaterial({
            color: 0xff4400,
            emissive: 0xff0000,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });

        const fireMesh = new THREE.Mesh(geometry, material);
        fireMesh.position.set(cellCenter.x, 2, cellCenter.z);
        
        board.container.add(fireMesh);

        // Add subtle animation
        const animate = () => {
            const time = Date.now() * 0.001;
            fireMesh.scale.x = 1 + Math.sin(time * 5) * 0.1;
            fireMesh.scale.y = 1 + Math.sin(time * 6) * 0.1;
            fireMesh.scale.z = 1 + Math.sin(time * 4) * 0.1;
            fireMesh.material.emissiveIntensity = 0.5 + Math.sin(time * 8) * 0.3;
            
            requestAnimationFrame(animate);
        };
        animate();
    }

    // Visualize a destroyed ship
    async visualizeDestroyedShip(isPlayerAttacking, ship) {
        console.log("Visualizing destroyed ship:", ship); // Debug log
        const board = isPlayerAttacking ? this.aiBoard : this.playerBoard;
        const startRow = ship.position.row;
        const startCol = ship.position.col;
        const shipLength = ship.size;
        const isVertical = ship.isVertical;
        
        try {
            // Use the correct ship type from the ship object
            const model = await this.modelLoader.loadModel(ship.type);
            
            // Apply destroyed ship materials
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({ 
                        color: 0x333333, // Dark grey for destroyed ship
                        emissive: 0xff4400, // Orange-red glow
                        emissiveIntensity: 0.5,
                        transparent: true,
                        opacity: 0.9,
                        shininess: 30
                    });
                }
            });

            // Scale the model to fit the grid
            const boundingBox = new THREE.Box3().setFromObject(model);
            const modelSize = boundingBox.getSize(new THREE.Vector3());
            const scale = (this.cellSize * shipLength * 0.8) / modelSize.z;
            model.scale.set(scale, scale, scale);

            // Get grid position for ship start
            const startPos = board.getGridPosition(startRow, startCol);
            
            // Calculate center position
            let shipCenterX, shipCenterZ;
            if (isVertical) {
                shipCenterX = startPos.x;
                shipCenterZ = startPos.z + (this.cellSize * (shipLength - 1) / 2);
            } else {
                shipCenterX = startPos.x + (this.cellSize * (shipLength - 1) / 2);
                shipCenterZ = startPos.z;
            }
            
            // Position ship
            model.position.set(shipCenterX, 2, shipCenterZ);
            
            // Apply rotation for horizontal ships and AI board
            if (!isVertical) {
                model.rotation.y = Math.PI / 2;
            }
            if (isPlayerAttacking) {
                // For AI board, add 180 degrees to match board rotation
                model.rotation.y += Math.PI;
            }
            
            // Add to board
            board.container.add(model);

            // Add smoke particles effect
            this.createSmokeEffect(model);
        } catch (error) {
            console.error('Failed to load destroyed ship model:', error);
            // Fallback to box geometry
            this.visualizeDestroyedShipFallback(board, shipLength, startRow, startCol, isVertical, isPlayerAttacking);
        }
    }

    // Fallback method for destroyed ship visualization
    visualizeDestroyedShipFallback(board, shipLength, startRow, startCol, isVertical, isPlayerAttacking) {
        const shipWidth = this.cellSize * 0.8;
        const shipLength3D = this.cellSize * shipLength * 0.8;
        const height = this.cellSize * 0.4;
        
        const shipGeometry = new THREE.BoxGeometry(shipWidth, height, shipLength3D);
        const shipMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            emissive: 0xff4400,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.9,
            shininess: 30
        });
        
        const shipMesh = new THREE.Mesh(shipGeometry, shipMaterial);
        
        // Get grid position for ship start
        const startPos = board.getGridPosition(startRow, startCol);
        
        // Calculate center position
        let shipCenterX, shipCenterZ;
        if (isVertical) {
            shipCenterX = startPos.x;
            shipCenterZ = startPos.z + (this.cellSize * (shipLength - 1) / 2);
        } else {
            shipCenterX = startPos.x + (this.cellSize * (shipLength - 1) / 2);
            shipCenterZ = startPos.z;
        }
        
        // Position ship
        shipMesh.position.set(shipCenterX, 2, shipCenterZ);
        
        // Apply rotation for horizontal ships
        if (!isVertical) {
            shipMesh.rotation.y = Math.PI / 2;
        }
        if (isPlayerAttacking) {
            // For AI board, add 180 degrees to match board rotation
            shipMesh.rotation.y += Math.PI;
        }
        
        // Add to board
        board.container.add(shipMesh);

        // Add smoke particles effect
        this.createSmokeEffect(shipMesh);
    }

    // Create smoke effect for destroyed ships
    createSmokeEffect(shipMesh) {
        const smokeParticles = [];
        const particleCount = 5;

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(this.cellSize * 0.15);
            const material = new THREE.MeshPhongMaterial({
                color: 0x666666,
                transparent: true,
                opacity: 0.4
            });

            const particle = new THREE.Mesh(geometry, material);
            
            // Random position along the ship
            particle.position.x = (Math.random() - 0.5) * this.cellSize;
            particle.position.y = this.cellSize * 0.5;
            particle.position.z = (Math.random() - 0.5) * this.cellSize;
            
            shipMesh.add(particle);
            smokeParticles.push({
                mesh: particle,
                speed: 0.02 + Math.random() * 0.02,
                angle: Math.random() * Math.PI * 2
            });
        }

        // Animate smoke particles
        const animate = () => {
            const time = Date.now() * 0.001;

            smokeParticles.forEach(particle => {
                particle.mesh.position.y += particle.speed;
                particle.mesh.position.x += Math.sin(time + particle.angle) * 0.01;
                particle.mesh.position.z += Math.cos(time + particle.angle) * 0.01;
                particle.mesh.material.opacity = Math.max(0, 0.4 - particle.mesh.position.y * 0.1);

                // Reset particle if it's too high or faded out
                if (particle.mesh.position.y > this.cellSize * 2 || particle.mesh.material.opacity <= 0) {
                    particle.mesh.position.y = this.cellSize * 0.5;
                    particle.mesh.position.x = (Math.random() - 0.5) * this.cellSize;
                    particle.mesh.position.z = (Math.random() - 0.5) * this.cellSize;
                    particle.mesh.material.opacity = 0.4;
                }
            });

            requestAnimationFrame(animate);
        };
        animate();
    }
} 