import * as THREE from 'three';

export class ShipsController {
    constructor(boardController) {
        this.boardController = boardController;
        this.ships = {
            carrier: { size: 5, count: 1 },
            battleship: { size: 4, count: 1 },
            cruiser: { size: 3, count: 1 },
            submarine: { size: 3, count: 1 },
            destroyer: { size: 2, count: 1 }
        };
        
        // Store placed ships for both players
        this.placedShips = {
            player: [],
            ai: []
        };
    }

    // Place ships randomly for both players
    initializeShips() {
        // Reset any existing ships
        this.placedShips.player = [];
        this.placedShips.ai = [];
        
        // Place ships for both players
        this.placeRandomShips(true);  // Player ships
        this.placeRandomShips(false); // AI ships
    }

    // Place ships randomly for one player
    placeRandomShips(isPlayerBoard) {
        // Clear any existing ships first
        this.placedShips[isPlayerBoard ? 'player' : 'ai'] = [];
        
        console.log(`Starting to place ships for ${isPlayerBoard ? 'player' : 'AI'}`);
        
        Object.entries(this.ships).forEach(([shipType, ship]) => {
            let placed = false;
            while (!placed) {
                // Generate random position and orientation
                const isVertical = Math.random() < 0.5;
                
                // Calculate max position based on orientation
                const maxRow = isVertical ? (10 - ship.size) : 9;
                const maxCol = isVertical ? 9 : (10 - ship.size);
                
                // Generate position within valid bounds
                const row = Math.floor(Math.random() * (maxRow + 1));
                const col = Math.floor(Math.random() * (maxCol + 1));

                // Try to place the ship
                placed = this.boardController.placeShip(isPlayerBoard, ship.size, row, col, isVertical);
                
                if (placed) {
                    // Store the ship's position
                    const newShip = {
                        type: shipType,
                        size: ship.size,
                        position: { row, col },
                        isVertical,
                        hits: new Array(ship.size).fill(false)
                    };
                    
                    this.placedShips[isPlayerBoard ? 'player' : 'ai'].push(newShip);
                    
                    // Debug log ship placement
                    console.log(`Placed ${shipType} for ${isPlayerBoard ? 'player' : 'AI'}:`, {
                        type: shipType,
                        size: ship.size,
                        position: { row, col },
                        isVertical
                    });
                }
            }
        });
        
        // Debug log of all placed ships
        const ships = this.placedShips[isPlayerBoard ? 'player' : 'ai'];
        console.log(`${isPlayerBoard ? 'Player' : 'AI'} ships placed - Total ships:`, ships.length);
        ships.forEach(ship => {
            console.log(`- ${ship.type}: position (${ship.position.row}, ${ship.position.col}), ${ship.isVertical ? 'vertical' : 'horizontal'}`);
        });
        
        return ships.length === Object.keys(this.ships).length;
    }

    // Check if a ship is hit at the given coordinates
    processHit(isPlayerBoard, row, col) {
        const ships = this.placedShips[isPlayerBoard ? 'player' : 'ai'];
        
        // Debug log
        console.log('Processing hit:', {
            isPlayerBoard,
            row,
            col,
            shipsCount: ships.length
        });
        
        for (let ship of ships) {
            // Calculate all positions this ship occupies
            const shipPositions = [];
            for (let i = 0; i < ship.size; i++) {
                const shipRow = ship.isVertical ? ship.position.row + i : ship.position.row;
                const shipCol = ship.isVertical ? ship.position.col : ship.position.col + i;
                
                // Skip if position is beyond board boundaries
                if (shipRow >= 10 || shipCol >= 10) {
                    console.log('Warning: Ship position out of bounds:', {
                        shipType: ship.type,
                        partIndex: i,
                        shipRow,
                        shipCol
                    });
                    continue;
                }
                
                shipPositions.push({ row: shipRow, col: shipCol, partIndex: i });
            }
            
            // Find if this hit matches any part of the ship
            const hitPart = shipPositions.find(pos => pos.row === row && pos.col === col);
            
            if (hitPart) {
                // Mark this part as hit
                ship.hits[hitPart.partIndex] = true;
                
                // Count total hits for validation
                const totalHits = ship.hits.filter(hit => hit === true).length;
                
                // Validate hits array
                if (ship.hits.length !== ship.size) {
                    console.error('Error: Hits array size mismatch:', {
                        shipType: ship.type,
                        expectedSize: ship.size,
                        actualSize: ship.hits.length
                    });
                }
                
                // Check if ship is now sunk
                const isSunk = this.isShipSunk(ship);
                
                // Log the hit with detailed position info
                console.log(
                    `%c💥 HIT! %c${ship.type.toUpperCase()} was hit at part ${hitPart.partIndex + 1}/${ship.size}! Position: (${row},${col})`,
                    'background: #ff8c00; color: white; padding: 2px 5px; border-radius: 3px;',
                    'color: #ff8c00; font-weight: bold;'
                );
                
                // Show detailed hit status with positions
                const hitStatus = shipPositions.map((pos, index) => {
                    const isHit = ship.hits[index];
                    return `Part ${index + 1} (${pos.row},${pos.col}): ${isHit ? '💥' : '⬜'}`;
                }).join(' ');
                
                console.log('Ship status:', {
                    shipType: ship.type,
                    position: ship.position,
                    isVertical: ship.isVertical,
                    hitStatus,
                    totalHits,
                    allPositions: shipPositions
                });
                
                // If ship is sunk, show special message
                if (isSunk) {
                    console.log(
                        `%c🚨 SINKING! %c${ship.type.toUpperCase()} has been completely destroyed! All ${ship.size} parts hit!`,
                        'background: #ff0000; color: white; padding: 4px 8px; border-radius: 3px; font-size: 14px;',
                        'color: #ff0000; font-weight: bold; font-size: 14px;'
                    );
                }
                
                return {
                    hit: true,
                    sunk: isSunk,
                    shipType: ship.type,
                    hitPart: hitPart.partIndex,
                    totalHits
                };
            }
        }
        
        // Debug log miss
        console.log('Miss - no ship found at coordinates:', { row, col });
        return { hit: false };
    }

    // Check if a ship is completely sunk
    isShipSunk(ship) {
        // First validate hits array
        if (ship.hits.length !== ship.size) {
            console.error('Error: Invalid hits array length in isShipSunk:', {
                shipType: ship.type,
                expectedSize: ship.size,
                actualSize: ship.hits.length
            });
            return false;
        }
        
        // Check if all parts are hit
        const allPartsHit = ship.hits.every(hit => hit === true);
        
        // Debug log sunk check
        console.log('Checking if ship is sunk:', {
            shipType: ship.type,
            hits: ship.hits,
            allPartsHit,
            totalHits: ship.hits.filter(hit => hit === true).length
        });
        
        return allPartsHit;
    }

    // Find a ship at specific coordinates
    findShipAtPosition(isPlayerBoard, row, col) {
        const ships = this.placedShips[isPlayerBoard ? 'player' : 'ai'];
        
        for (let ship of ships) {
            // Check each position the ship occupies
            for (let i = 0; i < ship.size; i++) {
                const shipRow = ship.isVertical ? ship.position.row + i : ship.position.row;
                const shipCol = ship.isVertical ? ship.position.col : ship.position.col + i;
                
                if (shipRow === row && shipCol === col) {
                    console.log("Found ship at position:", {
                        row,
                        col,
                        ship,
                        hits: ship.hits
                    }); // Debug log
                    return ship;
                }
            }
        }
        
        return null;
    }

    // Get all ships for a player
    getShips(isPlayerBoard) {
        return this.placedShips[isPlayerBoard ? 'player' : 'ai'];
    }

    // Check if all ships are sunk for a player
    areAllShipsSunk(isPlayerBoard) {
        const ships = this.placedShips[isPlayerBoard ? 'player' : 'ai'];
        return ships.every(ship => this.isShipSunk(ship));
    }
} 