import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent } from '../../../shared/types';

interface AIOrHumanGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type AIOrHumanState = 'loading' | 'ready' | 'playing' | 'feedback' | 'error';

export default function AIOrHumanGame({ onUpdateScore, onComplete }: AIOrHumanGameProps) {
  const [state, setState] = useState<AIOrHumanState>('loading');
  const [challenges, setChallenges] = useState<GameContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  
  const startTimeRef = useRef<number>(0);
  
  useEffect(() => {
    async function loadContent() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'ai-or-human').single();
      if (!gameData) return setState('error');
      
      const { data: contentData } = await supabase
        .from('game_content')
        .select('*')
        .eq('game_id', gameData.id)
        .eq('is_active', true);
        
      if (!contentData || contentData.length === 0) return setState('error');
      
      // Shuffle challenges
      setChallenges(contentData.sort(() => 0.5 - Math.random()));
      setState('ready');
    }
    loadContent();
  }, []);

  useEffect(() => {
    if (state === 'ready') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setState('playing');
        startTimeRef.current = performance.now();
      }
    }
  }, [countdown, state]);

  const handleGuess = (guess: 'AI' | 'HUMAN') => {
    const currentChallenge = challenges[currentIndex];
    // Expected JSON data: { isAI: true/false }
    const isCorrect = (guess === 'AI' && currentChallenge.data.isAI) || (guess === 'HUMAN' && !currentChallenge.data.isAI);
    
    if (isCorrect) {
      const newScore = score + 200;
      setScore(newScore);
      onUpdateScore(newScore);
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }

    setState('feedback');

    setTimeout(() => {
      if (currentIndex < challenges.length - 1 && currentIndex < 4) { // Max 5 rounds
        setCurrentIndex(currentIndex + 1);
        setFeedback(null);
        setState('playing');
      } else {
        const totalTime = performance.now() - startTimeRef.current;
        onComplete(score + (isCorrect ? 200 : 0), totalTime); // Ensure final score is passed
      }
    }, 1500);
  };

  if (state === 'loading') return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400">Accessing Database...</div>;
  if (state === 'error') return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase text-xl">Module Unavailable (No Content)</div>;

  const currentChallenge = challenges[currentIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-5xl mx-auto">
      <AnimatePresence mode="wait">
        {state === 'ready' && (
          <motion.div key="ready" exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
            <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">AI or Human?</h2>
            <div className="text-[12rem] font-black leading-none text-lime-400">{countdown}</div>
          </motion.div>
        )}

        {(state === 'playing' || state === 'feedback') && currentChallenge && (
          <motion.div 
            key={`round-${currentIndex}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full h-full"
          >
            <div className="text-lime-400 font-mono tracking-widest uppercase mb-4">
              Image {currentIndex + 1} of {Math.min(challenges.length, 5)}
            </div>
            
            <div className="flex-1 w-full bg-zinc-900 border-2 border-zinc-800 rounded mb-8 flex items-center justify-center overflow-hidden relative">
              {currentChallenge.storage_path ? (
                <img 
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/game-assets/${currentChallenge.storage_path}`} 
                  className={`max-w-full max-h-[50vh] object-contain transition-all ${state === 'feedback' ? 'blur-sm brightness-50' : ''}`}
                  alt="AI or Human?"
                />
              ) : (
                <div className="text-zinc-600 font-mono">NO IMAGE DATA</div>
              )}

              {/* Feedback Overlay */}
              {state === 'feedback' && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className={`text-6xl md:text-8xl font-black uppercase tracking-tighter ${feedback === 'correct' ? 'text-lime-400' : 'text-red-500'}`}>
                    {feedback === 'correct' ? 'CORRECT' : 'INCORRECT'}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-6 w-full max-w-2xl">
              <button 
                onClick={() => handleGuess('AI')}
                disabled={state === 'feedback'}
                className="flex-1 bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400 text-cyan-400 py-6 text-2xl font-black uppercase tracking-widest disabled:opacity-50"
              >
                AI GENERATED
              </button>
              <button 
                onClick={() => handleGuess('HUMAN')}
                disabled={state === 'feedback'}
                className="flex-1 bg-zinc-900 border-2 border-zinc-800 hover:border-lime-400 text-lime-400 py-6 text-2xl font-black uppercase tracking-widest disabled:opacity-50"
              >
                HUMAN CREATED
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
