export class TurnController {
    constructor(boardController, shipsController, game) {
        this.boardController = boardController;
        this.shipsController = shipsController;
        this.isPlayerTurn = true; // Will be set by coin flip
        this.gameOver = false;
        
        // Store game reference directly
        this.game = game;
        
        // Bind methods
        this.handlePlayerTurn = this.handlePlayerTurn.bind(this);
        this.handleAITurn = this.handleAITurn.bind(this);
        
        // Initialize turn state
        this.initialize();
    }

    initialize() {
        // Reset game state
        this.gameOver = false;
        
        // Perform coin flip to determine who starts
        this.performCoinFlip();
    }

    performCoinFlip() {
        // Create coin flip overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;

        const coin = document.createElement('div');
        coin.style.cssText = `
            width: 100px;
            height: 100px;
            background: gold;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            font-weight: bold;
            color: black;
            transform-style: preserve-3d;
            animation: flip 2s ease-out forwards;
        `;
        
        overlay.appendChild(coin);
        document.body.appendChild(overlay);

        // Add flip animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes flip {
                0% { transform: rotateX(0); }
                100% { transform: rotateX(1800deg); }
            }
        `;
        document.head.appendChild(style);

        // Randomly determine who starts
        const playerStarts = Math.random() < 0.5;
        this.isPlayerTurn = playerStarts;

        // Update coin text based on result
        setTimeout(() => {
            coin.textContent = playerStarts ? 'YOU' : 'AI';
        }, 1900); // Show result just before animation ends

        // Remove overlay and start game
        setTimeout(() => {
            document.body.removeChild(overlay);
            document.head.removeChild(style);
            
            // Show message
            const message = playerStarts ? 
                "You won the coin flip! Your turn first!" : 
                "AI won the coin flip! AI goes first!";
            console.log(message);

            // Setup event listeners
            document.addEventListener('click', this.handlePlayerTurn);
            
            // Move camera to appropriate board based on who starts
            this.moveCameraToBoard(!playerStarts);
            
            // If AI starts, trigger its turn
            if (!playerStarts) {
                setTimeout(() => this.handleAITurn(), 1000);
            }
        }, 2000);
    }

    handlePlayerTurn(event) {
        if (!this.isPlayerTurn || this.gameOver) return;

        const intersects = this.boardController.getGridIntersection(event);
        if (!intersects) return;

        const { row, col } = intersects;
        
        // Process attack
        const result = this.boardController.processAttack(true, row, col);
        if (!result) return; // Invalid attack or already attacked cell
        
        // Check if all AI ships are sunk by checking the actual ships
        const aiShips = this.shipsController.getShips(false); // Get AI ships
        const allSunk = aiShips.length > 0 && aiShips.every(ship => 
            ship.hits.every(hit => hit === true)
        );
        
        if (allSunk) {
            this.showVictoryScreen(true);
            return;
        }

        // Add delay before switching turns (for bomb animation in future)
        setTimeout(() => {
            // Switch to AI turn
            this.isPlayerTurn = false;
            
            // Move camera to player's board for AI turn
            this.moveCameraToBoard(true);
            
            setTimeout(() => this.handleAITurn(), 1000); // Add delay for better UX
        }, 3000); // 3 second delay for bomb animation
    }

    handleAITurn() {
        if (this.isPlayerTurn || this.gameOver) return;

        // Simple AI: randomly select an unattacked cell
        let row, col;
        do {
            row = Math.floor(Math.random() * 10);
            col = Math.floor(Math.random() * 10);
        } while (this.boardController.shots.ai[row][col]);

        // Process AI attack
        const result = this.boardController.processAttack(false, row, col);
        if (!result) return; // Invalid attack
        
        // Check if all player ships are sunk by checking the actual ships
        const playerShips = this.shipsController.getShips(true); // Get player ships
        const allSunk = playerShips.length > 0 && playerShips.every(ship => 
            ship.hits.every(hit => hit === true)
        );
        
        if (allSunk) {
            this.showVictoryScreen(false);
            return;
        }

        // Add delay before switching turns (for bomb animation in future)
        setTimeout(() => {
            // Switch back to player turn
            this.isPlayerTurn = true;
            
            // Move camera to AI's board for player turn
            this.moveCameraToBoard(false);
        }, 3000); // 3 second delay for bomb animation
    }

    // Helper method to safely move camera
    moveCameraToBoard(toPlayerBoard) {
        if (!this.game) {
            console.warn('Game reference not available for camera movement');
            return;
        }

        // Only move if we're not already at the target board
        if (this.game.isAtPlayerBoard !== toPlayerBoard) {
            try {
                this.game.toggleCameraPosition();
            } catch (error) {
                console.warn('Error moving camera:', error);
            }
        }
    }

    showVictoryScreen(playerWon) {
        this.gameOver = true;
        document.removeEventListener('click', this.handlePlayerTurn);
        
        // Create victory overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;

        // Create victory message
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            animation: fadeIn 1s ease-out;
        `;
        messageDiv.textContent = playerWon ? 'VICTORY!' : 'DEFEAT!';

        // Create detailed message
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = `
            font-size: 24px;
            margin-bottom: 30px;
            text-align: center;
            animation: fadeIn 1s ease-out 0.5s both;
        `;
        detailsDiv.textContent = playerWon ? 
            'You have sunk all enemy ships!' : 
            'All your ships have been sunk!';

        // Create play again button
        const playAgainBtn = document.createElement('button');
        playAgainBtn.style.cssText = `
            padding: 15px 30px;
            font-size: 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            animation: fadeIn 1s ease-out 1s both;
            transition: background 0.3s;
        `;
        playAgainBtn.textContent = 'Play Again';
        playAgainBtn.onmouseover = () => playAgainBtn.style.background = '#45a049';
        playAgainBtn.onmouseout = () => playAgainBtn.style.background = '#4CAF50';
        playAgainBtn.onclick = () => {
            document.body.removeChild(overlay);
            this.boardController.resetBoards();
            this.reset();
        };

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);

        // Assemble overlay
        overlay.appendChild(messageDiv);
        overlay.appendChild(detailsDiv);
        overlay.appendChild(playAgainBtn);
        document.body.appendChild(overlay);

        // Remove audio for now since it's causing issues
        // We can add local audio files later if needed
    }

    // Reset the game state
    reset() {
        this.initialize();
    }
} 