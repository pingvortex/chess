class ChessGame {
    constructor() {
        this.board = this.initBoard();
        this.currentPlayer = 'white';
        this.selectedCell = null;
        this.gameHistory = [];
        this.capturedPieces = [];
        this.turnNumber = 1;
        this.gameActive = true;
        this.startTime = Date.now();

        this.promotionInProgress = false;
        this.promotionRow = null;
        this.promotionCol = null;
        
        this.pieceSymbols = {
            'white': { rook: '♖', knight: '♘', bishop: '♗', queen: '♕', king: '♔', pawn: '♙' },
            'black': { rook: '♜', knight: '♞', bishop: '♝', queen: '♛', king: '♚', pawn: '♟' }
        };
        
        this.moveSound = new Audio('assets/move-self.mp3');
        this.captureSound = new Audio('assets/capture.mp3');
        
        this.setupEventListeners();
        this.updateDisplay();
    }

    initBoard() {
        const board = [];
        for (let i = 0; i < 8; i++) {
            board[i] = new Array(8).fill(null);
        }
        
        board[0] = [
            {type: 'rook', color: 'black'}, {type: 'knight', color: 'black'}, 
            {type: 'bishop', color: 'black'}, {type: 'queen', color: 'black'},
            {type: 'king', color: 'black'}, {type: 'bishop', color: 'black'}, 
            {type: 'knight', color: 'black'}, {type: 'rook', color: 'black'}
        ];
        for (let i = 0; i < 8; i++) {
            board[1][i] = {type: 'pawn', color: 'black'};
        }
        
        for (let i = 0; i < 8; i++) {
            board[6][i] = {type: 'pawn', color: 'white'};
        }
        board[7] = [
            {type: 'rook', color: 'white'}, {type: 'knight', color: 'white'}, 
            {type: 'bishop', color: 'white'}, {type: 'queen', color: 'white'},
            {type: 'king', color: 'white'}, {type: 'bishop', color: 'white'}, 
            {type: 'knight', color: 'white'}, {type: 'rook', color: 'white'}
        ];
        
        return board;
    }

    setupEventListeners() {
        document.getElementById('chess-container').addEventListener('click', (e) => {
            if (!this.gameActive) return;
            
            const cell = e.target.closest('.cell');
            if (!cell) return;
            
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            this.handleCellClick(row, col);
        });

        document.getElementById('hint-button').addEventListener('click', () => {
            this.showHint();
        });

        document.getElementById('new-game-button').addEventListener('click', () => {
            this.newGame();
        });

        const copyBtn = document.getElementById('copy-history-button');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                this.copyGameHistory();
            });
        }
    }

    handleCellClick(row, col) {
        if (this.currentPlayer !== 'white') return;

        if (this.selectedCell) {
            const {row: fromRow, col: fromCol} = this.selectedCell;
            
            if (fromRow === row && fromCol === col) {
                this.clearSelection();
                return;
            }
            
            if (this.isValidMove(fromRow, fromCol, row, col)) {
                this.makeMove(fromRow, fromCol, row, col);
                this.clearSelection();
                
                if (this.gameActive) {
                    setTimeout(() => this.makeAIMove(), 1000);
                }
            } else {
                this.clearSelection();
                if (this.board[row][col] && this.board[row][col].color === 'white') {
                    this.selectCell(row, col);
                }
            }
        } else {
            if (this.board[row][col] && this.board[row][col].color === 'white') {
                this.selectCell(row, col);
            }
        }
    }

    selectCell(row, col) {
        this.selectedCell = {row, col};
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('selected');
        this.highlightPossibleMoves(row, col);
    }

    clearSelection() {
        if (this.selectedCell) {
            const {row, col} = this.selectedCell;
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.classList.remove('selected');
            this.selectedCell = null;
        }
        
        document.querySelectorAll('.possible-move, .capture-move, .hint-move').forEach(cell => {
            cell.classList.remove('possible-move', 'capture-move', 'hint-move');
        });
    }

    highlightPossibleMoves(row, col) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(row, col, r, c)) {
                    const targetCell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    if (this.board[r][c]) {
                        targetCell.classList.add('capture-move');
                    } else {
                        targetCell.classList.add('possible-move');
                    }
                }
            }
        }
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
        
        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];
        
        if (!piece || (target && target.color === piece.color)) return false;
        
        if (!this.isPieceValidMove(piece, fromRow, fromCol, toRow, toCol)) {
            return false;
        }
        
        const tempBoard = JSON.parse(JSON.stringify(this.board));
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = null;
        
        return !this.isKingInCheck(piece.color, tempBoard);
    }

    isPieceValidMove(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (piece.type) {
            case 'pawn':
                return this.isValidPawnMove(piece, fromRow, fromCol, toRow, toCol);
            case 'rook':
                return (fromRow === toRow || fromCol === toCol) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'bishop':
                return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'queen':
                return (fromRow === toRow || fromCol === toCol || absRowDiff === absColDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol);
            case 'king':
                return absRowDiff <= 1 && absColDiff <= 1 && !(absRowDiff === 0 && absColDiff === 0);
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            default:
                return false;
        }
    }

    isCheckmate(player) {
        if (!this.isKingInCheck(player)) return false;
        
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === player) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                const tempBoard = JSON.parse(JSON.stringify(this.board));
                                tempBoard[toRow][toCol] = piece;
                                tempBoard[fromRow][fromCol] = null;
                                
                                if (!this.isKingInCheck(player, tempBoard)) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    isValidPawnMove(piece, fromRow, fromCol, toRow, toCol) {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        if (fromCol === toCol) {
            if (toRow - fromRow === direction && !this.board[toRow][toCol]) {
                return true;
            }
            if (fromRow === startRow && toRow - fromRow === 2 * direction && !this.board[toRow][toCol] && !this.board[fromRow + direction][fromCol]) {
                return true;
            }
        } else if (Math.abs(fromCol - toCol) === 1 && toRow - fromRow === direction) {
            return this.board[toRow][toCol] && this.board[toRow][toCol].color !== piece.color;
        }
        
        return false;
    }

    canPieceAttack(piece, fromRow, fromCol, toRow, toCol, board) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                return absColDiff === 1 && rowDiff === direction;
            case 'rook':
                return (fromRow === toRow || fromCol === toCol) && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'bishop':
                return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'queen':
                return (fromRow === toRow || fromCol === toCol || absRowDiff === absColDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'king':
                return absRowDiff <= 1 && absColDiff <= 1 && !(absRowDiff === 0 && absColDiff === 0);
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            default:
                return false;
        }
    }

    isPathClear(fromRow, fromCol, toRow, toCol, board = this.board) {
        const rowStep = Math.sign(toRow - fromRow);
        const colStep = Math.sign(toCol - fromCol);
        
        let r = fromRow + rowStep;
        let c = fromCol + colStep;
        
        while (r !== toRow || c !== toCol) {
            if (board[r][c]) return false;
            r += rowStep;
            c += colStep;
        }
        
        return true;
    }

    completeMove(fromRow, fromCol, toRow, toCol) {
        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol);
        this.recordMove(moveNotation);
        
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        this.turnNumber = this.currentPlayer === 'white' ? this.turnNumber + 1 : this.turnNumber;
        
        this.updateDisplay();
        this.checkGameStatus();
        
        if (this.gameActive && this.currentPlayer === 'black') {
            setTimeout(() => this.makeAIMove(), 1000);
        }
    }

    showPromotionMenu(row, col, color) {
        document.querySelectorAll('.promotion-menu').forEach(menu => menu.remove());

        const boardElem = document.getElementById('chess-container');
        const boardRect = boardElem.getBoundingClientRect();
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const cellRect = cell.getBoundingClientRect();

        const menu = document.createElement('div');
        menu.className = 'promotion-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = 1000;
        menu.style.display = 'flex';
        menu.style.background = '#fff';
        menu.style.border = '2px solid #333';
        menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

        boardElem.appendChild(menu);

        let left = cellRect.left - boardRect.left;
        let top = cellRect.top - boardRect.top;

        if (row === 0) {
            menu.style.flexDirection = 'column';
            top = cellRect.bottom - boardRect.top - menu.offsetHeight;
        } else if (row === 7) {
            menu.style.flexDirection = 'column';
            top = cellRect.top - boardRect.top;
        } else {
            menu.style.flexDirection = 'row';
        }

        const options = [
            { type: 'queen', symbol: color === 'white' ? '♕' : '♛' },
            { type: 'rook', symbol: color === 'white' ? '♖' : '♜' },
            { type: 'bishop', symbol: color === 'white' ? '♗' : '♝' },
            { type: 'knight', symbol: color === 'white' ? '♘' : '♞' }
        ];

        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'promotion-option';
            optionElement.textContent = option.symbol;
            optionElement.style.padding = '10px 16px';
            optionElement.style.cursor = 'pointer';
            optionElement.style.fontSize = '2rem';
            optionElement.addEventListener('click', () => {
                this.handlePromotionChoice(option.type);
            });
            optionElement.addEventListener('mouseenter', () => {
                optionElement.style.background = '#eee';
            });
            optionElement.addEventListener('mouseleave', () => {
                optionElement.style.background = '';
            });
            menu.appendChild(optionElement);
        });

        const menuRect = menu.getBoundingClientRect();

        if (left + menuRect.width > boardRect.width) {
            left = boardRect.width - menuRect.width;
        }
        if (left < 0) {
            left = 0;
        }
        if (top + menuRect.height > boardRect.height) {
            top = boardRect.height - menuRect.height;
        }
        if (top < 0) {
            top = 0;
        }

        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        if (this.promotionInProgress) return;
        
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        
        if (!piece) {
            console.warn(`No piece at (${fromRow},${fromCol})`);
            return;
        }
        
        if (targetPiece) {
            this.capturedPieces.push({
                piece: targetPiece,
                by: piece,
                at: new Date()
            });
            
            this.captureSound.currentTime = 0;
            this.captureSound.play();
            
            if (targetPiece.type === 'king') {
                const endTime = Date.now();
                const timeTaken = Math.floor((endTime - this.startTime) / 1000);
                this.endGameWithKingCapture(timeTaken);
                return;
            }
        } else {
            this.moveSound.currentTime = 0;
            this.moveSound.play();
        }
        
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            this.promotionInProgress = true;
            this.promotionRow = toRow;
            this.promotionCol = toCol;
            this.promotionPiece = { ...piece };
            this.promotionFromRow = fromRow;
            this.promotionFromCol = fromCol;
            this.showPromotionMenu(toRow, toCol, piece.color);
            return;
        }
        
        this.completeMove(fromRow, fromCol, toRow, toCol);
    }

    handlePromotionChoice(pieceType) {
        if (!this.promotionInProgress) return;
        
        if (!this.promotionPiece) {
            console.warn('No piece available for promotion');
            this.promotionInProgress = false;
            this.promotionRow = null;
            this.promotionCol = null;
            return;
        }
        
        this.board[this.promotionRow][this.promotionCol] = {
            type: pieceType,
            color: this.promotionPiece.color
        };
        
        document.querySelectorAll('.promotion-menu').forEach(menu => {
            menu.remove();
        });
        
        this.promotionInProgress = false;
        this.completeMove(this.promotionFromRow, this.promotionFromCol, this.promotionRow, this.promotionCol);
        
        this.promotionRow = null;
        this.promotionCol = null;
        this.promotionPiece = null;
        this.promotionFromRow = null;
        this.promotionFromCol = null;
    }

    endGameWithKingCapture(timeTaken) {
        this.gameActive = false;
        const winner = this.currentPlayer === 'white' ? 'You' : 'AI';
        let totalWins = parseInt(localStorage.getItem('totalWins')) || 0;
        if (winner === 'You') {
            totalWins += 1;
            localStorage.setItem('totalWins', totalWins.toString());
        }
        this.showWinPopup(winner, timeTaken, totalWins);
    }

    showWinPopup(winner, timeTaken, totalWins) {
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeString = `${minutes}m ${seconds}s`;
        
        const popup = document.createElement('div');
        popup.className = 'win-popup';
        popup.innerHTML = `
            <h2>${winner} won!</h2>
            <p>Time taken: ${timeString}</p>
            <p>Total wins: ${totalWins}</p>
            <button id="play-again">Play again</button>
        `;
        document.body.appendChild(popup);
        
        document.getElementById('play-again').addEventListener('click', () => {
            document.body.removeChild(popup);
            this.newGame();
        });
    }

    showDrawPopup(reason, timeTaken, totalWins) {
        const minutes = Math.floor(timeTaken / 60);
        const seconds = timeTaken % 60;
        const timeString = `${minutes}m ${seconds}s`;
        
        const popup = document.createElement('div');
        popup.className = 'win-popup';
        popup.innerHTML = `
            <h2>Game ended in a draw!</h2>
            <p>Reason: ${reason}</p>
            <p>Time taken: ${timeString}</p>
            <p>Total wins: ${totalWins}</p>
            <button id="play-again">Play again</button>
        `;
        document.body.appendChild(popup);
        
        document.getElementById('play-again').addEventListener('click', () => {
            document.body.removeChild(popup);
            this.newGame();
        });
    }

    calculateWinProbability() {
        let whiteMaterial = 0, blackMaterial = 0;
        let whitePieceActivity = 0, blackPieceActivity = 0;
        let totalPieces = 0;

        const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const value = pieceValues[piece.type];
                    totalPieces++;
                    if (piece.color === 'white') {
                        whiteMaterial += value;
                        whitePieceActivity += this.evaluatePieceActivity(piece, row, col);
                    } else {
                        blackMaterial += value;
                        blackPieceActivity += this.evaluatePieceActivity(piece, row, col);
                    }
                }
            }
        }

        const whiteMobility = this.calculateMobility('white');
        const blackMobility = this.calculateMobility('black');
        const whiteKingSafety = this.evaluateKingSafety('white');
        const blackKingSafety = this.evaluateKingSafety('black');

        let materialWeight, mobilityWeight, kingSafetyWeight, activityWeight;
        if (totalPieces > 24) { // start game
            materialWeight = 0.4;
            mobilityWeight = 0.3;
            kingSafetyWeight = 0.1;
            activityWeight = 0.2;
        } else if (totalPieces >= 12) { // mid game
            materialWeight = 0.5;
            mobilityWeight = 0.2;
            kingSafetyWeight = 0.2;
            activityWeight = 0.1;
        } else { // end game
            materialWeight = 0.6;
            mobilityWeight = 0.1;
            kingSafetyWeight = 0.2;
            activityWeight = 0.1;
        }

        const materialFactor = 50 + ((whiteMaterial - blackMaterial) * 5);
        const mobilityFactor = 50 + ((whiteMobility - blackMobility) * 0.5);
        const kingSafetyFactor = 50 + ((whiteKingSafety - blackKingSafety) * 2);
        const activityFactor = 50 + ((whitePieceActivity - blackPieceActivity) * 0.3);

        const whiteScore = (
            materialFactor * materialWeight +
            mobilityFactor * mobilityWeight +
            kingSafetyFactor * kingSafetyWeight +
            activityFactor * activityWeight
        );
        const blackScore = 100 - whiteScore;

        return {
            white: Math.max(0, Math.min(100, Math.round(whiteScore))),
            black: Math.max(0, Math.min(100, Math.round(blackScore)))
        };
    }

    evaluatePieceActivity(piece, row, col) {
        let score = 0;
        if ((row === 3 || row === 4) && (col === 3 || col === 4)) {
            score += piece.type === 'pawn' ? 3 : 5;
        }
        if (piece.color === 'white' && piece.type !== 'king') {
            score += row * 0.5;
        } else if (piece.color === 'black' && piece.type !== 'king') {
            score += (7 - row) * 0.5;
        }
        if (piece.type === 'king') {
            const totalPieces = this.board.flat().filter(p => p).length;
            if (totalPieces < 12) {
                score += (row === 3 || row === 4) && (col === 3 || col === 4) ? 5 : 2;
            }
        }
        return score;
    }

    calculateMobility(color) {
        let mobility = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    for (let r = 0; r < 8; r++) {
                        for (let c = 0; c < 8; c++) {
                            if (this.isValidMove(row, col, r, c)) {
                                mobility++;
                            }
                        }
                    }
                }
            }
        }
        return mobility;
    }

    evaluateKingSafety(color) {
        let kingRow = -1, kingCol = -1;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col]?.type === 'king' && this.board[row][col].color === color) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }
        
        let safetyScore = 0;
        const pawnDirections = color === 'white' ? 1 : -1;
        
        for (let i = -1; i <= 1; i++) {
            const col = kingCol + i;
            if (col >= 0 && col < 8) {
                const row = kingRow + pawnDirections;
                if (row >= 0 && row < 8 && this.board[row][col]?.type === 'pawn' && this.board[row][col].color === color) {
                    safetyScore += 12;
                }
            }
        }
        
        const directions = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
        for (let [dr, dc] of directions) {
            let r = kingRow + dr, c = kingCol + dc;
            while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (this.board[r][c] && this.board[r][c].color !== color) {
                    if (this.canPieceAttack(this.board[r][c], r, c, kingRow, kingCol, this.board)) {
                        safetyScore -= 10;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
        
        if ((kingRow === 0 || kingRow === 7) && (kingCol <= 1 || kingCol >= 6)) {
            safetyScore += 15;
        }
        
        return safetyScore;
    }

    makeAIMove() {
        if (!this.gameActive || this.currentPlayer !== 'black') return;

        // Opening book: play e5 or d5 as first move if available
        if (this.turnNumber === 1) {
            const openingMoves = [
                { fromRow: 1, fromCol: 4, toRow: 3, toCol: 4 }, // e5
                { fromRow: 1, fromCol: 3, toRow: 3, toCol: 3 }  // d5
            ];
            for (const move of openingMoves) {
                if (this.isValidMove(move.fromRow, move.fromCol, move.toRow, move.toCol)) {
                    this.makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
                    return;
                }
            }
        }

        const validMoves = this.getAllValidMoves('black');
        if (validMoves.length === 0) {
            this.checkGameStatus();
            return;
        }

        let bestScore = -Infinity;
        let bestMoves = [];
        for (const move of validMoves) {
            const tempBoard = JSON.parse(JSON.stringify(this.board));
            tempBoard[move.toRow][move.toCol] = move.piece;
            tempBoard[move.fromRow][move.fromCol] = null;
            if (move.piece.type === 'pawn' && move.toRow === 7) {
                tempBoard[move.toRow][move.toCol] = { type: 'queen', color: 'black' };
            }
            // Use correct color and board for white's reply
            const replyMoves = this.getAllValidMovesForBoard('white', tempBoard);
            let minReplyScore = Infinity;
            if (replyMoves.length === 0) {
                // If white has no moves, check for checkmate or stalemate
                if (this.isKingInCheck('white', tempBoard)) {
                    minReplyScore = 10000; // Black wins
                } else {
                    minReplyScore = 0; // Stalemate
                }
            } else {
                for (const reply of replyMoves) {
                    const replyBoard = JSON.parse(JSON.stringify(tempBoard));
                    replyBoard[reply.toRow][reply.toCol] = reply.piece;
                    replyBoard[reply.fromRow][reply.fromCol] = null;
                    if (reply.piece.type === 'pawn' && reply.toRow === 0) {
                        replyBoard[reply.toRow][reply.toCol] = { type: 'queen', color: 'white' };
                    }
                    const score = this.evaluateBoard(replyBoard, 'black');
                    if (score < minReplyScore) minReplyScore = score;
                }
            }
            if (minReplyScore > bestScore) {
                bestScore = minReplyScore;
                bestMoves = [move];
            } else if (minReplyScore === bestScore) {
                bestMoves.push(move);
            }
        }
        const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        this.makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
    }

    getAllValidMovesForBoard(color, board) {
        const validMoves = [];
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMoveForBoard(fromRow, fromCol, toRow, toCol, board, color)) {
                                validMoves.push({
                                    fromRow, fromCol, toRow, toCol,
                                    piece,
                                    isCapture: !!board[toRow][toCol],
                                    targetPiece: board[toRow][toCol]
                                });
                            }
                        }
                    }
                }
            }
        }
        return validMoves;
    }

    // Patch: always use provided board and color for move validation
    isValidMoveForBoard(fromRow, fromCol, toRow, toCol, board, color) {
        if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
        const piece = board[fromRow][fromCol];
        const target = board[toRow][toCol];
        if (!piece || (target && target.color === piece.color)) return false;
        if (!this.isPieceValidMoveForBoard(piece, fromRow, fromCol, toRow, toCol, board)) return false;
        const tempBoard = JSON.parse(JSON.stringify(board));
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = null;
        return !this.isKingInCheck(color, tempBoard);
    }

    isPieceValidMoveForBoard(piece, fromRow, fromCol, toRow, toCol, board) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);
        
        switch (piece.type) {
            case 'pawn':
                return this.isValidPawnMoveForBoard(piece, fromRow, fromCol, toRow, toCol, board);
            case 'rook':
                return (fromRow === toRow || fromCol === toCol) && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'bishop':
                return absRowDiff === absColDiff && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'queen':
                return (fromRow === toRow || fromCol === toCol || absRowDiff === absColDiff) && this.isPathClear(fromRow, fromCol, toRow, toCol, board);
            case 'king':
                return absRowDiff <= 1 && absColDiff <= 1 && !(absRowDiff === 0 && absColDiff === 0);
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
            default:
                return false;
        }
    }

    isValidPawnMoveForBoard(piece, fromRow, fromCol, toRow, toCol, board) {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        if (fromCol === toCol) {
            if (toRow - fromRow === direction && !board[toRow][toCol]) {
                return true;
            }
            if (fromRow === startRow && toRow - fromRow === 2 * direction && !board[toRow][toCol] && !board[fromRow + direction][fromCol]) {
                return true;
            }
        } else if (Math.abs(fromCol - toCol) === 1 && toRow - fromRow === direction) {
            return board[toRow][toCol] && board[toRow][toCol].color !== piece.color;
        }
        
        return false;
    }

    isCheckmate(player) {
        if (!this.isKingInCheck(player)) return false;
        
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === player) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                const tempBoard = JSON.parse(JSON.stringify(this.board));
                                tempBoard[toRow][toCol] = piece;
                                tempBoard[fromRow][fromCol] = null;
                                
                                if (!this.isKingInCheck(player, tempBoard)) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    isDrawByInsufficientMaterial() {
        let pieces = {
            white: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 },
            black: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
        };
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    pieces[piece.color][piece.type]++;
                }
            }
        }

        if (pieces.white.pawn === 0 && pieces.white.knight === 0 && pieces.white.bishop === 0 && 
            pieces.white.rook === 0 && pieces.white.queen === 0 &&
            pieces.black.pawn === 0 && pieces.black.knight === 0 && pieces.black.bishop === 0 && 
            pieces.black.rook === 0 && pieces.black.queen === 0) {
            return true;
        }

        if (((pieces.white.pawn === 0 && pieces.white.knight === 0 && pieces.white.rook === 0 && 
              pieces.white.queen === 0 && pieces.white.bishop === 1) &&
             (pieces.black.pawn === 0 && pieces.black.knight === 0 && pieces.black.bishop === 0 && 
              pieces.black.rook === 0 && pieces.black.queen === 0)) ||
            ((pieces.black.pawn === 0 && pieces.black.knight === 0 && pieces.black.rook === 0 && 
              pieces.black.queen === 0 && pieces.black.bishop === 1) &&
             (pieces.white.pawn === 0 && pieces.white.knight === 0 && pieces.white.bishop === 0 && 
              pieces.white.rook === 0 && pieces.white.queen === 0))) {
            return true;
        }
        
        if (((pieces.white.pawn === 0 && pieces.white.bishop === 0 && pieces.white.rook === 0 && 
              pieces.white.queen === 0 && pieces.white.knight === 1) &&
             (pieces.black.pawn === 0 && pieces.black.knight === 0 && pieces.black.bishop === 0 && 
              pieces.black.rook === 0 && pieces.black.queen === 0)) ||
            ((pieces.black.pawn === 0 && pieces.black.bishop === 0 && pieces.black.rook === 0 && 
              pieces.black.queen === 0 && pieces.black.knight === 1) &&
             (pieces.white.pawn === 0 && pieces.white.knight === 0 && pieces.white.bishop === 0 && 
              pieces.white.rook === 0 && pieces.white.queen === 0))) {
            return true;
        }
        
        if (pieces.white.pawn === 0 && pieces.white.knight === 0 && pieces.white.rook === 0 && 
            pieces.white.queen === 0 && pieces.white.bishop === 1 &&
            pieces.black.pawn === 0 && pieces.black.knight === 0 && pieces.black.rook === 0 && 
            pieces.black.queen === 0 && pieces.black.bishop === 1) {
            
            let whiteBishopColor, blackBishopColor;
            bishopSearch:
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.type === 'bishop') {
                        if (piece.color === 'white') {
                            whiteBishopColor = (row + col) % 2 === 0 ? 'light' : 'dark';
                        } else {
                            blackBishopColor = (row + col) % 2 === 0 ? 'light' : 'dark';
                        }
                        
                        if (whiteBishopColor && blackBishopColor) {
                            break bishopSearch;
                        }
                    }
                }
            }
            
            if (whiteBishopColor === blackBishopColor) {
                return true;
            }
        }
        
        return false;
    }

  //  isDrawByRepetition() {

    // } 

    isDrawBy50MoveRule() {
        let movesSinceLastAction = 0;
        for (let i = this.gameHistory.length - 1; i >= 0; i--) {
            const move = this.gameHistory[i];
            if (!move) continue;
            
            const [fromRow, fromCol, toRow, toCol] = this.parseMoveNotation(move.move);
            const piece = this.board[toRow][toCol];
            
            const wasCapture = this.gameHistory[i].move.includes('x');
            
            if (wasCapture || (piece && piece.type === 'pawn')) {
                break;
            }
            
            movesSinceLastAction++;
        }
        
        return movesSinceLastAction >= 100; // 50 moves(half-moves) for each player
    }

    parseMoveNotation(notation) {
        const files = 'abcdefgh';
        const ranks = '87654321';

        if (!notation || typeof notation !== 'string' || notation.length < 2) {
            console.warn(`Invalid move notation: ${notation}`);
            return [0, 0, 0, 0];
        }

        const clean = notation.replace(/[\+#=QRNB]/g, '').trim();
        const isCapture = notation.includes('x');
        const isPromotion = notation.includes('=Q');

        if (clean.match(/^[a-h][1-8]$/) || clean.match(/^[a-h]x[a-h][1-8]$/)) {
            let toFile, toRank;
            if (isCapture) {
                const match = clean.match(/^([a-h])x([a-h])([1-8])$/);
                if (!match) return [0, 0, 0, 0];
                toFile = match[2];
                toRank = match[3];
            } else {
                toFile = clean[0];
                toRank = clean[1];
            }

            const toCol = files.indexOf(toFile);
            const toRow = 7 - (parseInt(toRank) - 1);
            const direction = this.currentPlayer === 'white' ? -1 : 1;
            const startRow = this.currentPlayer === 'white' ? 6 : 1;

            let fromRow = -1;
            let fromCol = isCapture ? files.indexOf(clean[0]) : toCol;

            if (this.board[toRow - direction]?.[fromCol]?.type === 'pawn' &&
                this.board[toRow - direction][fromCol].color === this.currentPlayer) {
                fromRow = toRow - direction;
            } else if (this.board[toRow - 2 * direction]?.[fromCol]?.type === 'pawn' &&
                       this.board[toRow - 2 * direction][fromCol].color === this.currentPlayer &&
                       this.board[toRow - direction][fromCol] === null &&
                       toRow - 2 * direction === startRow) {
                fromRow = toRow - 2 * direction;
            } else if (isCapture && Math.abs(fromCol - toCol) === 1 &&
                       this.board[toRow - direction]?.[fromCol]?.type === 'pawn' &&
                       this.board[toRow - direction][fromCol].color === this.currentPlayer) {
                fromRow = toRow - direction;
            }

            if (fromRow !== -1) {
                return [fromRow, fromCol, toRow, toCol];
            }
        }

        if (clean.match(/^[RNBQK][a-h1-8]?x?[a-h][1-8]$/i)) {
            const match = clean.match(/([RNBQK])([a-h1-8]?)[x]?([a-h])([1-8])/i);
            if (!match) return [0, 0, 0, 0];

            const pieceChar = match[1].toUpperCase();
            let pieceType;
            if (pieceChar === 'N') pieceType = 'knight';
            else if (pieceChar === 'K') pieceType = 'king';
            else if (pieceChar === 'Q') pieceType = 'queen';
            else if (pieceChar === 'R') pieceType = 'rook';
            else if (pieceChar === 'B') pieceType = 'bishop';
            else return [0, 0, 0, 0];

            const disambiguation = match[2];
            const toFile = match[3];
            const toRank = match[4];

            const toCol = files.indexOf(toFile);
            const toRow = 7 - (parseInt(toRank) - 1);

            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.type === pieceType && piece.color === this.currentPlayer &&
                        this.isValidMove(row, col, toRow, toCol)) {
                        if (disambiguation) {
                            if (disambiguation.match(/[a-h]/) && files[col] !== disambiguation) continue;
                            if (disambiguation.match(/[1-8]/) && (8 - row) !== parseInt(disambiguation)) continue;
                        }
                        return [row, col, toRow, toCol];
                    }
                }
            }
        }

        // console.warn(`Unknown move format: ${clean}`); // ts annoying pmo
        return [0, 0, 0, 0];
    }

        getMoveNotation(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[toRow][toCol];
    const files = 'abcdefgh';
    const ranks = '87654321';
    
    let notation = '';
    
    if (piece.type !== 'pawn') {
        let pieceChar = '';
        if (piece.type === 'knight') pieceChar = 'N';
        else if (piece.type === 'king') pieceChar = 'K';
        else if (piece.type === 'queen') pieceChar = 'Q';
        else if (piece.type === 'rook') pieceChar = 'R';
        else if (piece.type === 'bishop') pieceChar = 'B';
        notation = pieceChar;
    }
    
    notation += files[toCol];
    notation += ranks[toRow];
    
    return notation;
}

    recordMove(notation) {
        this.gameHistory.push({
            player: this.currentPlayer,
            move: notation,
            turn: this.currentPlayer === 'white' ? this.turnNumber : this.turnNumber
        });
    }

    checkGameStatus() {
        if (this.isCheckmate(this.currentPlayer)) {
            const winner = this.currentPlayer === 'white' ? 'AI' : 'You';
            const endTime = Date.now();
            const timeTaken = Math.floor((endTime - this.startTime) / 1000);
            let totalWins = parseInt(localStorage.getItem('totalWins')) || 0;
            if (winner === 'You') {
                totalWins += 1;
                localStorage.setItem('totalWins', totalWins.toString());
            }
            this.showWinPopup(winner, timeTaken, totalWins);
        } else if (!this.playerHasValidMoves(this.currentPlayer)) {
            if (this.isKingInCheck(this.currentPlayer)) {
                const winner = this.currentPlayer === 'white' ? 'AI' : 'You';
                const endTime = Date.now();
                const timeTaken = Math.floor((endTime - this.startTime) / 1000);
                let totalWins = parseInt(localStorage.getItem('totalWins')) || 0;
                if (winner === 'You') {
                    totalWins += 1;
                    localStorage.setItem('totalWins', totalWins.toString());
                }
                this.showWinPopup(winner, timeTaken, totalWins);
            } else {
                this.endGame('Draw by stalemate');
            }
        } else if (this.isDrawByInsufficientMaterial()) {
            this.endGame('Draw by insufficient material');
       // } else if (this.isDrawByRepetition()) {
         //   this.endGame('Draw by threefold repetition');
        } else if (this.isDrawBy50MoveRule()) {
            this.endGame('Draw by 50-move rule');
        }
    }

    playerHasValidMoves(player) {
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === player) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    isKingInCheck(player, board = this.board) {
        let kingRow = -1, kingCol = -1;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'king' && piece.color === player) {
                    kingRow = row;
                    kingCol = col;
                    break;
                }
            }
            if (kingRow !== -1) break;
        }
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color !== player) {
                    if (this.canPieceAttack(piece, row, col, kingRow, kingCol, board)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    endGame(message) {
        this.gameActive = false;
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - this.startTime) / 1000);
        const totalWins = parseInt(localStorage.getItem('totalWins')) || 0;
        this.showDrawPopup(message, timeTaken, totalWins);
    }

    updateDisplay() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                cell.innerHTML = '';
                
                const piece = this.board[row][col];
                if (piece) {
                    const span = document.createElement('span');
                    span.className = `${piece.color}-piece`;
                    span.textContent = this.pieceSymbols[piece.color][piece.type];
                    cell.appendChild(span);
                }
            }
        }
        
        document.getElementById('game-status').textContent = 
            `${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} to move`;
        
        document.getElementById('turn-counter').textContent = this.turnNumber;
        
        const capturedCount = {
            white: this.capturedPieces.filter(p => p.piece.color === 'white').length,
            black: this.capturedPieces.filter(p => p.piece.color === 'black').length
        };
        
        document.getElementById('captured-display').textContent = 
            `♙${capturedCount.white} ♟${capturedCount.black}`;
        
        this.updateMoveHistory();
        
        const probabilities = this.calculateWinProbability();
        document.getElementById('ai-probability').style.height = `${probabilities.black}%`;
        document.getElementById('user-probability').style.height = `${probabilities.white}%`;
        document.getElementById('ai-probability').textContent = `AI ${probabilities.black}%`;
        document.getElementById('user-probability').textContent = `YOU ${probabilities.white}%`;
    }

    updateMoveHistory() {
        const whiteList = document.getElementById('white-moves-list');
        const blackList = document.getElementById('black-moves-list');
        whiteList.innerHTML = '';
        blackList.innerHTML = '';
        
        for (let i = 0; i < this.gameHistory.length; i++) {
            const move = this.gameHistory[i];
            const moveItem = document.createElement('div');
            moveItem.className = 'move-item';
            moveItem.textContent = `${move.turn}. ${move.move}`;
            
            if (move.player === 'white') {
                whiteList.appendChild(moveItem);
            } else {
                blackList.appendChild(moveItem);
            }
        }
        
        whiteList.scrollTop = whiteList.scrollHeight;
        blackList.scrollTop = blackList.scrollHeight;
    }

    newGame() {
        this.board = this.initBoard();
        this.currentPlayer = 'white';
        this.selectedCell = null;
        this.gameHistory = [];
        this.capturedPieces = [];
        this.turnNumber = 1;
        this.gameActive = true;
        this.startTime = Date.now();
        
        document.getElementById('message-div').textContent = '';
        this.clearSelection();
        this.updateDisplay();
    }

    undoLastMove() {
        if (this.gameHistory.length === 0) return;
        
        this.newGame();
    }

    getAllValidMoves(color) {
        const validMoves = [];
        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece && piece.color === color) {
                    for (let toRow = 0; toRow < 8; toRow++) {
                        for (let toCol = 0; toCol < 8; toCol++) {
                            if (this.isValidMove(fromRow, fromCol, toRow, toCol)) {
                                validMoves.push({
                                    fromRow, fromCol, toRow, toCol,
                                    piece,
                                    isCapture: !!this.board[toRow][toCol],
                                    targetPiece: this.board[toRow][toCol]
                                });
                            }
                        }
                    }
                }
            }
        }
        return validMoves;
    }

    evaluateBoard(board, playerColor) {
        // Evaluate the board for the AI: material, activity, king safety, pawn structure, development
        let whiteMaterial = 0, blackMaterial = 0;
        let whiteActivity = 0, blackActivity = 0;
        let whiteDevelopment = 0, blackDevelopment = 0;
        let whitePawnStructure = 0, blackPawnStructure = 0;
        const pieceValues = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 0 };
        // Pawn structure helpers
        const whitePawnCols = new Set();
        const blackPawnCols = new Set();
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece) {
                    const value = pieceValues[piece.type];
                    if (piece.color === 'white') {
                        whiteMaterial += value;
                        whiteActivity += this.evaluatePieceActivity(piece, row, col, board);
                        if (piece.type === 'pawn') whitePawnCols.add(col);
                        if (piece.type !== 'pawn' && piece.type !== 'king' && (row < 7 && row > 4)) whiteDevelopment += 10;
                    } else {
                        blackMaterial += value;
                        blackActivity += this.evaluatePieceActivity(piece, row, col, board);
                        if (piece.type === 'pawn') blackPawnCols.add(col);
                        if (piece.type !== 'pawn' && piece.type !== 'king' && (row > 0 && row < 3)) blackDevelopment += 10;
                    }
                }
            }
        }
        // Pawn structure: penalize doubled/isolated pawns
        whitePawnStructure -= (8 - whitePawnCols.size) * 15;
        blackPawnStructure -= (8 - blackPawnCols.size) * 15;
        // King safety
        const whiteKingSafety = this.evaluateKingSafety('white', null, null, board);
        const blackKingSafety = this.evaluateKingSafety('black', null, null, board);
        // Combine
        let score = (blackMaterial - whiteMaterial)
            + 0.1 * (blackActivity - whiteActivity)
            + 0.1 * (blackDevelopment - whiteDevelopment)
            + 0.1 * (blackPawnStructure - whitePawnStructure)
            + 0.2 * (blackKingSafety - whiteKingSafety);
        // Add small random noise to avoid deterministic play
        score += Math.random() * 2 - 1;
        return score;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new ChessGame();
});
