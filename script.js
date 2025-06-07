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

makeMove(fromRow, fromCol, toRow, toCol) {
    if (this.promotionInProgress) return;
    
    const piece = this.board[fromRow][fromCol];
    const targetPiece = this.board[toRow][toCol];
    
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
        this.showPromotionMenu(toRow, toCol, piece.color);
        return;
    }
    
    this.completeMove(fromRow, fromCol, toRow, toCol);
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

handlePromotionChoice(pieceType) {
    if (!this.promotionInProgress) return;
    
    this.board[this.promotionRow][this.promotionCol].type = pieceType;
    
    document.querySelectorAll('.promotion-menu').forEach(menu => {
        menu.remove();
    });
    
    this.promotionInProgress = false;
    const fromRow = this.promotionRow === 0 ? 1 : 6;
    this.completeMove(fromRow, this.promotionCol, this.promotionRow, this.promotionCol);
    
    this.promotionRow = null;
    this.promotionCol = null;
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

evaluateKingSafety(color, kingRow, kingCol, board = this.board) {
    let safetyScore = 0;
    const pawnDirections = color === 'white' ? 1 : -1;
    
    for (let i = -1; i <= 1; i++) {
        const col = kingCol + i;
        if (col >= 0 && col < 8) {
            const row = kingRow + pawnDirections;
            if (row >= 0 && row < 8 && board[row][col]?.type === 'pawn' && board[row][col].color === color) {
                safetyScore += 12;
            }
        }
    }
    
    // penalty for open lines to king
    const directions = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];
    for (let [dr, dc] of directions) {
        let r = kingRow + dr, c = kingCol + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            if (board[r][c] && board[r][c].color !== color) {
                if (this.canPieceAttack(board[r][c], r, c, kingRow, kingCol, board)) {
                    safetyScore -= 10;
                }
                break;
            }
            r += dr;
            c += dc;
        }
    }
    
    // bonus for castling position
    if ((kingRow === 0 || kingRow === 7) && (kingCol <= 1 || kingCol >= 6)) {
        safetyScore += 15;
    }
    
    return safetyScore;
}

makeAIMove() {
    if (!this.gameActive || this.currentPlayer !== 'black') return;
    
    const validMoves = this.getAllValidMoves('black');
    
    if (validMoves.length === 0) {
        this.checkGameStatus();
        return;
    }
    
    const evaluatedMoves = validMoves.map(move => ({
        move,
        score: this.evaluateMove(move, 'black')
    }));
    
    evaluatedMoves.sort((a, b) => b.score - a.score);
    
    const topMoves = evaluatedMoves.slice(0, 5);
    const weights = topMoves.map((_, i) => 1 / (i + 1));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const probabilities = weights.map(w => w / totalWeight);
    
    let r = Math.random();
    let selectedIndex = 0;
    for (let i = 0; i < probabilities.length; i++) {
        r -= probabilities[i];
        if (r <= 0) {
            selectedIndex = i;
            break;
        }
    }
    
    const selectedMove = topMoves[selectedIndex].move;
    this.makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
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

evaluateMove(move, playerColor) {
    let score = 0;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const pieceValues = { pawn: 10, knight: 30, bishop: 30, rook: 50, queen: 90, king: 1000 };

    if (move.isCapture) {
        score += pieceValues[move.targetPiece.type] * 0.9;
    }
    const isToCenter = [3, 4].includes(move.toRow) && [3, 4].includes(move.toCol);
    if (isToCenter) score += 10;
    if (this.turnNumber < 10) {
        if (move.piece.type === 'knight' || move.piece.type === 'bishop') {
            if (move.fromRow === 0 || move.fromRow === 7) score += 8;
        }
        if (move.piece.type === 'pawn' && (move.fromCol === 3 || move.fromCol === 4)) {
            score += 6;
        }
        if (move.piece.type === 'king' || move.piece.type === 'queen') {
            score -= 15;
        }
    }
    const tempBoard = JSON.parse(JSON.stringify(this.board));
    tempBoard[move.toRow][move.toCol] = move.piece;
    tempBoard[move.fromRow][move.fromCol] = null;

    if (move.piece.type === 'king') {
        const kingSafety = this.evaluateKingSafety(playerColor, move.toRow, move.toCol, tempBoard);
        score += kingSafety;

        if (this.turnNumber > 30) {
            const isSafe = !this.isKingInCheck(playerColor, tempBoard);
            if (isSafe) {
                if (playerColor === 'white' && move.toRow < move.fromRow) {
                    score += 15;
                } else if (playerColor === 'black' && move.toRow > move.fromRow) {
                    score += 15;
                }
                if (isToCenter) score += 10;
            } else {
                score += 5;
            }
        }
    }
    if (this.isKingInCheck(opponentColor, tempBoard)) {
        score += 20;
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const opponentPiece = tempBoard[row][col];
            if (opponentPiece && opponentPiece.color === opponentColor) {
                if (this.canPieceAttack(opponentPiece, row, col, move.toRow, move.toCol, tempBoard)) {
                    score -= pieceValues[move.piece.type] * 0.5;
                    break;
                }
            }
        }
    }

    // boost captures in endgame
    if (this.turnNumber > 30 && move.isCapture) {
        score += 10;
    }

    return score;
}

showHint() {
    if (this.currentPlayer !== 'white') return;

    document.querySelectorAll('.hint-move').forEach(cell => {
        cell.classList.remove('hint-move');
    });

    const validMoves = this.getAllValidMoves('white');
    if (validMoves.length === 0) return;

    const positionHistory = new Map();
    this.gameHistory.forEach(({ move }, index) => {
        if (!move || typeof move !== 'string') {
            console.warn(`Skipping invalid move in history: ${move}`);
            return;
        }
        const tempBoard = JSON.parse(JSON.stringify(this.board));
        if (index % 2 === 0) {
            try {
                const [fromRow, fromCol, toRow, toCol] = this.parseMoveNotation(move);
                if (fromRow === 0 && fromCol === 0 && toRow === 0 && toCol === 0) {
                    console.warn(`Skipping fallback move: ${move}`);
                    return;
                }
                tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
                tempBoard[fromRow][fromCol] = null;
            } catch (e) {
                console.warn(`Failed to parse move: ${move}`, e);
                return;
            }
        }
        const positionKey = JSON.stringify(tempBoard);
        positionHistory.set(positionKey, (positionHistory.get(positionKey) || 0) + 1);
    });

    const evaluatedMoves = validMoves.map(move => {
        const tempBoard = JSON.parse(JSON.stringify(this.board));
        tempBoard[move.toRow][move.toCol] = move.piece;
        tempBoard[move.fromRow][move.fromCol] = null;
        const positionKey = JSON.stringify(tempBoard);
        const repetitionCount = positionHistory.get(positionKey) || 0;

        let score = this.evaluateMove(move, 'white');
        if (repetitionCount >= 2) {
            score -= 20; // penalty for repeating a position without being forced to
        }

        return { move, score };
    });

    evaluatedMoves.sort((a, b) => b.score - a.score);
    const topMoves = evaluatedMoves.slice(0, 1); // amount of top moves to show

    topMoves.forEach(({ move }) => {
        const fromCell = document.querySelector(`[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
        const toCell = document.querySelector(`[data-row="${move.toRow}"][data-col="${move.toCol}"]`);

        fromCell.classList.add('hint-move');
        toCell.classList.add('hint-move');

        let annotation = '';
        if (move.isCapture) {
            annotation = `Captures ${move.targetPiece.type}`;
        } else if ([3, 4].includes(move.toRow) && [3, 4].includes(move.toCol)) {
            annotation = 'Controls center';
        } else {
            annotation = 'Good move';
        }
        toCell.setAttribute('data-hint', annotation);
    });
}

parseMoveNotation(notation) {
    const files = 'abcdefgh';

    if (!notation || typeof notation !== 'string' || notation.length < 2) {
        console.warn(`Invalid move notation: ${notation}`);
        return [0, 0, 0, 0];
    }

    const isCapture = notation.includes('x');
    const clean = notation.replace(/[\+#]/g, '').trim();

    let fromFile = '0', fromRank = '0', toFile, toRank;

    if (clean.length === 4 && clean.match(/^[a-h][1-8][a-h][1-8]$/)) {
        fromFile = clean[0];
        fromRank = clean[1];
        toFile = clean[2];
        toRank = clean[3];
    } else if (clean.match(/^[a-h]x?[a-h][1-8]$/)) {
        fromFile = isCapture ? clean[0] : clean[0];
        toFile = isCapture ? clean[2] : clean[0];
        toRank = isCapture ? clean[3] : clean[1];
    } else if (clean.match(/^[RNBQK][a-h1-8]?x?[a-h][1-8]$/i)) {
        const match = clean.match(/([RNBQK])([a-h1-8]?)[x]?([a-h])([1-8])/i);
        if (!match) return [0, 0, 0, 0];

        const pieceChar = match[1].toUpperCase();
        let pieceType = '';
        if (pieceChar === 'N') pieceType = 'knight';
        else if (pieceChar === 'K') pieceType = 'king';
        else if (pieceChar === 'Q') pieceType = 'queen';
        else if (pieceChar === 'R') pieceType = 'rook';
        else if (pieceChar === 'B') pieceType = 'bishop';

        const disambiguation = match[2];
        if (disambiguation.length === 1) {
            if (disambiguation >= 'a' && disambiguation <= 'h') {
                fromFile = disambiguation;
            } else if (disambiguation >= '1' && disambiguation <= '8') {
                fromRank = disambiguation;
            }
        }

        toFile = match[3];
        toRank = match[4];
    } else {
        console.warn(`Unknown format: ${clean}`);
        return [0, 0, 0, 0];
    }

    const fromCol = files.indexOf(fromFile);
    const fromRow = fromRank !== '0' ? 7 - (parseInt(fromRank) - 1) : -1;
    const toCol = files.indexOf(toFile);
    const toRow = 7 - (parseInt(toRank) - 1);

    return [fromRow, fromCol, toRow, toCol];
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
                    turn: this.turnNumber
                });
            }

            checkGameStatus() {
                const hasMoves = this.playerHasValidMoves(this.currentPlayer);
                
                if (!hasMoves) {
                    const isKingInCheck = this.isKingInCheck(this.currentPlayer);
                    
                    if (isKingInCheck) {
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
                        this.endGame('Draw by stalemate!');
                    }
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
                document.getElementById('message-div').textContent = message;
                document.getElementById('game-status').textContent = 'Game Over';
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
                
                this.gameHistory.forEach(move => {
                    const moveItem = document.createElement('div');
                    moveItem.className = 'move-item';
                    moveItem.textContent = `${move.turn}. ${move.move}`;
                    
                    if (move.player === 'white') {
                        whiteList.appendChild(moveItem);
                    } else {
                        blackList.appendChild(moveItem);
                    }
                });
                
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
        }

        window.addEventListener('DOMContentLoaded', () => {
            window.game = new ChessGame();
        });
