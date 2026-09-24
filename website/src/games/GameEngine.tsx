import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Timer, XCircle } from 'lucide-react';
import ReactionGame from './ReactionGame';
import MemoryGame from './MemoryGame';
import TicTacToeGame from './TicTacToeGame';
import AIOrHumanGame from './AIOrHumanGame';
import SpotDifferenceGame from './SpotDifferenceGame';
import DoodleGame from './DoodleGame';
import CrosswordGame from './CrosswordGame';

interface GameEngineProps {
  gameId: string;
  onExit: () => void;
  onGameComplete: (score: number, timeMs: number) => void;
}

export default function GameEngine({ gameId, onExit, onGameComplete }: GameEngineProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);

  // Unified Countdown logic for Intro state
  useEffect(() => {
    if (gameState === 'intro') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('playing');
      }
    }
  }, [countdown, gameState]);

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const finishGame = (finalScore: number, finalTimeMs: number) => {
    setScore(finalScore);
    setGameState('gameover');
    // Allow seeing the gameover screen for a moment before pushing data
    setTimeout(() => {
      onGameComplete(finalScore, finalTimeMs);
    }, 3000);
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Universal Game Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <button 
          onClick={onExit} 
          className="pointer-events-auto flex items-center gap-2 text-zinc-500 hover:text-red-400 uppercase font-mono font-bold tracking-widest transition-colors"
        >
          <XCircle size={20} /> ABORT
        </button>
        <div className="flex gap-6 font-mono font-bold text-xl uppercase">
           <div className="flex items-center gap-2 text-cyan-400">
             <Trophy size={20} /> {score}
           </div>
        </div>
      </header>

      {/* Main Engine State Machine */}
      <AnimatePresence mode="wait">
        {gameState === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="flex-1 flex flex-col items-center justify-center z-10"
          >
            <h2 className="text-lime-400 font-mono tracking-[0.2em] mb-4 uppercase">Initializing Module</h2>
            <div className="text-[12rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">
              {countdown}
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <motion.div 
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex"
          >
            {/* Dynamic Game Component Rendering */}
            {gameId === 'reaction' && (
               <ReactionGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {gameId === 'memory' && (
               <MemoryGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {gameId === 'tic-tac-toe' && (
               <TicTacToeGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {gameId === 'ai-or-human' && (
               <AIOrHumanGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {gameId === 'spot-difference' && (
               <SpotDifferenceGame onComplete={finishGame} onExit={onExit} />
            )}
            {gameId === 'doodle' && (
               <DoodleGame onComplete={finishGame} onExit={onExit} />
            )}
            {gameId === 'crossword' && (
               <CrosswordGame onComplete={finishGame} onExit={onExit} />
            )}
            {/* Fallback for unimplemented games */}
            {gameId !== 'reaction' && gameId !== 'memory' && gameId !== 'tic-tac-toe' && gameId !== 'ai-or-human' && gameId !== 'spot-difference' && gameId !== 'doodle' && gameId !== 'crossword' && (
               <div className="flex-1 flex flex-col items-center justify-center">
                 <p className="text-red-400 font-mono uppercase tracking-widest text-xl mb-4">Module Not Found</p>
                 <button onClick={onExit} className="btn-secondary">Return to Hub</button>
               </div>
            )}
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center z-10 bg-zinc-950/80 backdrop-blur-sm"
          >
            <h1 className="text-6xl md:text-8xl font-black uppercase text-lime-400 tracking-tighter mb-4">
              Module Cleared
            </h1>
            <p className="text-2xl font-mono text-zinc-400 mb-8 uppercase tracking-widest">
              Final Score: <span className="text-white">{score}</span>
            </p>
            <p className="text-cyan-400 animate-pulse font-mono text-sm uppercase">Transmitting data to mainframe...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
