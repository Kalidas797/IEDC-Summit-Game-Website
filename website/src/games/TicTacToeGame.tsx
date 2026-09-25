import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';

interface TicTacToeGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type Player = 'X' | 'O' | null;

// Minimax algorithm for unbeatable AI
function minimax(board: Player[], isMaximizing: boolean): number {
  const winner = checkWinnerStatic(board);
  if (winner === 'O') return 10;
  if (winner === 'X') return -10;
  if (!board.includes(null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function checkWinnerStatic(squares: Player[]): Player | 'draw' | null {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  if (!squares.includes(null)) return 'draw';
  return null;
}

function getBestMove(board: Player[], difficulty: string): number {
  const available = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
  if (available.length === 0) return -1;

  if (difficulty === 'easy') {
    return available[Math.floor(Math.random() * available.length)];
  }

  if (difficulty === 'medium') {
    // 50% chance of optimal move, 50% random
    if (Math.random() > 0.5) {
      return available[Math.floor(Math.random() * available.length)];
    }
  }

  // Hard (minimax) or medium's optimal branch
  let bestScore = -Infinity;
  let bestMove = available[0];
  for (const i of available) {
    const boardCopy = [...board];
    boardCopy[i] = 'O';
    const score = minimax(boardCopy, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }
  return bestMove;
}

export default function TicTacToeGame({ onUpdateScore, onComplete }: TicTacToeGameProps) {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [startTime] = useState(performance.now());
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(true);

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'tic-tac-toe').single();
      if (gameData) {
        const { data: settings } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('content_type', 'tictactoe-settings').eq('is_active', true).single();
        if (settings) {
          setDifficulty(settings.data?.difficulty || 'medium');
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleEndGame = (result: Player | 'draw') => {
    setWinner(result);
    const timeMs = performance.now() - startTime;
    let finalScore = 0;
    if (result === 'X') finalScore = 1000;
    else if (result === 'draw') finalScore = 200;
    onUpdateScore(finalScore);
    setTimeout(() => onComplete(finalScore, timeMs), 3000);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn || loading) return;
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);
    const result = checkWinnerStatic(newBoard);
    if (result) handleEndGame(result);
  };

  // Bot logic
  useEffect(() => {
    if (!isPlayerTurn && !winner && !loading) {
      const timeout = setTimeout(() => {
        const move = getBestMove(board, difficulty);
        if (move >= 0) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          const result = checkWinnerStatic(newBoard);
          if (result) handleEndGame(result);
          else setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [isPlayerTurn, board, winner, loading]);

  if (loading) return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">Tic-Tac-Toe</h2>
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-8">Difficulty: {difficulty}</p>
      
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
