import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TicTacToeGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type Player = 'X' | 'O' | null;

export default function TicTacToeGame({ onUpdateScore, onComplete }: TicTacToeGameProps) {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [startTime] = useState(performance.now());

  const checkWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (!squares.includes(null)) return 'draw';
    return null;
  };

  const handleEndGame = (result: Player | 'draw') => {
    setWinner(result);
    const timeMs = performance.now() - startTime;
    
    let finalScore = 0;
    if (result === 'X') finalScore = 1000;
    else if (result === 'draw') finalScore = 200;
    
    onUpdateScore(finalScore);
    
    setTimeout(() => {
      onComplete(finalScore, timeMs);
    }, 3000);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);

    const result = checkWinner(newBoard);
    if (result) {
      handleEndGame(result);
    }
  };

  // Bot logic
  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timeout = setTimeout(() => {
        const available = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
        if (available.length > 0) {
          const randomIndex = available[Math.floor(Math.random() * available.length)];
          const newBoard = [...board];
          newBoard[randomIndex] = 'O';
          setBoard(newBoard);
          
          const result = checkWinner(newBoard);
          if (result) {
            handleEndGame(result);
          } else {
            setIsPlayerTurn(true);
          }
        }
      }, 500); // Bot thinks for 500ms
      return () => clearTimeout(timeout);
    }
  }, [isPlayerTurn, board, winner]); // handleEndGame is intentionally omitted to avoid recreation loops

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h2 className="text-4xl font-black uppercase tracking-tighter mb-8">Tic-Tac-Toe</h2>
      
      <div className="grid grid-cols-3 gap-4 bg-zinc-800 p-4 rounded-xl shadow-2xl">
        {board.map((cell, index) => (
          <motion.button
            whileHover={!cell && isPlayerTurn && !winner ? { scale: 1.05 } : {}}
            whileTap={!cell && isPlayerTurn && !winner ? { scale: 0.95 } : {}}
            key={index}
            onClick={() => handleCellClick(index)}
            className={`w-24 h-24 sm:w-32 sm:h-32 bg-zinc-950 flex items-center justify-center text-6xl font-black rounded-lg ${
              cell === 'X' ? 'text-lime-400' : 'text-cyan-400'
            }`}
            disabled={cell !== null || !isPlayerTurn || winner !== null}
          >
            {cell}
          </motion.button>
        ))}
      </div>

      <div className="h-16 mt-8 flex items-center justify-center">
        {winner === 'X' && <p className="text-2xl font-bold text-lime-400 uppercase tracking-widest animate-bounce">You Win!</p>}
        {winner === 'O' && <p className="text-2xl font-bold text-red-500 uppercase tracking-widest">System Wins!</p>}
        {winner === 'draw' && <p className="text-2xl font-bold text-zinc-400 uppercase tracking-widest">Draw!</p>}
        {!winner && (
          <p className="text-zinc-500 font-mono uppercase tracking-widest">
            {isPlayerTurn ? 'Your Turn (X)' : 'System is thinking...'}
          </p>
        )}
      </div>
    </div>
  );
}
