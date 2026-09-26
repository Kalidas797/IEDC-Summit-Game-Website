import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, XCircle } from 'lucide-react';
import ReactionGame from './ReactionGame';
import MemoryGame from './MemoryGame';
import TicTacToeGame from './TicTacToeGame';
import AIOrHumanGame from './AIOrHumanGame';
import SpotDifferenceGame from './SpotDifferenceGame';
import DoodleGame from './DoodleGame';
import HiddenWordsGame from './HiddenWordsGame';
import WhatChangedGame from './WhatChangedGame';
import ColorWordGame from './ColorWordGame';
import SequenceMemoryGame from './SequenceMemoryGame';

interface GameEngineProps {
  gameId: string;
  playerId: string;
  onExit: () => void;
  onGameComplete: (score: number, timeMs: number) => void;
}

export default function GameEngine({ gameId, playerId, onExit, onGameComplete }: GameEngineProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'gameover'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbGameId, setDbGameId] = useState<string | null>(null);

  // Unified Countdown logic for Intro state
  useEffect(() => {
    if (gameState === 'intro') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startGameSession();
      }
    }
  }, [countdown, gameState]); // startGameSession intentionally omitted to prevent loop

  const startGameSession = async () => {
    let deviceId = localStorage.getItem('paperlab_device_id');
    if (!deviceId) {
      deviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : 'device-' + Date.now() + '-' + Math.random().toString(36).substring(2);
      localStorage.setItem('paperlab_device_id', deviceId);
    }
    
    const { data: gameData } = await supabase.from('games').select('id').eq('slug', gameId).single();
    if (!gameData) {
      console.error("Game not found in database:", gameId);
      setGameState('playing');
      return;
    }
    setDbGameId(gameData.id);

    const { data: sessionData, error } = await supabase.from('game_sessions').insert([{
      player_id: playerId,
      game_id: gameData.id,
      device_id: deviceId,
      status: 'playing'
    }]).select().single();

    if (error) console.error("Error creating session:", error);
    if (sessionData) setSessionId(sessionData.id);
    
    setGameState('playing');
  };

  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);
  };

  const finishGame = async (finalScore: number, finalTimeMs: number) => {
    setScore(finalScore);
    setGameState('gameover');
    
    if (sessionId && dbGameId) {
      await supabase.from('game_sessions').update({
        completed_at: new Date().toISOString(),
        status: 'completed'
      }).eq('id', sessionId);

      const { error } = await supabase.from('scores').insert([{
        player_id: playerId,
        game_id: dbGameId,
        session_id: sessionId,
        score: Math.floor(finalScore),
        time_ms: Math.floor(finalTimeMs)
      }]);
      if (error) console.error("Error saving score:", error);
    }

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
               <HiddenWordsGame onComplete={finishGame} onExit={onExit} />
            )}
            {gameId === 'what-changed' && (
               <WhatChangedGame onComplete={finishGame} onExit={onExit} />
            )}
            {gameId === 'color-word-challenge' && (
               <ColorWordGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {gameId === 'sequence-memory' && (
               <SequenceMemoryGame onUpdateScore={handleScoreUpdate} onComplete={finishGame} />
            )}
            {/* Fallback for unimplemented games */}
            {gameId !== 'reaction' && gameId !== 'memory' && gameId !== 'tic-tac-toe' && gameId !== 'ai-or-human' && gameId !== 'spot-difference' && gameId !== 'doodle' && gameId !== 'crossword' && gameId !== 'what-changed' && gameId !== 'color-word-challenge' && gameId !== 'sequence-memory' && (
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
            <h1 className="text-4xl md:text-8xl font-black uppercase text-lime-400 tracking-tighter mb-4 text-center">
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
