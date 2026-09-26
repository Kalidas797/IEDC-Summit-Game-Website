import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent, OriginalOrAIContentData } from '../../../shared/types';

interface AIOrHumanGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type GameState = 'loading' | 'ready' | 'playing' | 'feedback' | 'error';

export default function AIOrHumanGame({ onUpdateScore, onComplete }: AIOrHumanGameProps) {
  const [state, setState] = useState<GameState>('loading');
  const [challenges, setChallenges] = useState<GameContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  
  // To store random positions for the current round
  // false = Original on Left (A), true = Original on Right (B)
  const [originalIsRight, setOriginalIsRight] = useState(false);
  
  const startTimeRef = useRef<number>(0);
  const roundStartTimeRef = useRef<number>(0);
  
  useEffect(() => {
    async function loadContent() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'ai-or-human').single();
      if (!gameData) return setState('error');
      
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('game_content')
        .select('data')
        .eq('game_id', gameData.id)
        .eq('content_type', 'ai-or-human-settings')
        .single();
        
      const questionsPerGame = settingsData?.data?.questionsPerGame || 5;
      
      const { data: contentData } = await supabase
        .from('game_content')
        .select('*')
        .eq('game_id', gameData.id)
        .eq('content_type', 'original-or-ai-challenge')
        .eq('is_active', true);
        
      if (!contentData || contentData.length === 0) return setState('error');
      
      // Fisher-Yates shuffle
      const shuffled = [...contentData];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const selected = shuffled.slice(0, questionsPerGame);
      if (selected.length === 0) return setState('error');
      
      setChallenges(selected);
      setOriginalIsRight(Math.random() > 0.5);
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
        roundStartTimeRef.current = performance.now();
        setTimeLeft(15);
      }
    }
  }, [countdown, state]);

  // Timer logic for playing state
  useEffect(() => {
    if (state === 'playing') {
      if (timeLeft > 0) {
        const t = setTimeout(() => setTimeLeft(l => l - 1), 1000);
        return () => clearTimeout(t);
      } else {
        // Time up -> count as incorrect
        handleGuess('TIMEOUT');
      }
    }
  }, [state, timeLeft]);

  const handleGuess = (selection: 'A' | 'B' | 'TIMEOUT') => {
    if (state !== 'playing') return;
    
    // A = Left, B = Right
    // originalIsRight: false means Original is Left (A)
    // originalIsRight: true means Original is Right (B)
    let isCorrect = false;
    if (selection !== 'TIMEOUT') {
      if (selection === 'A' && !originalIsRight) isCorrect = true;
      if (selection === 'B' && originalIsRight) isCorrect = true;
    }
    
    if (isCorrect) {
      const newScore = score + 100;
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
        setOriginalIsRight(Math.random() > 0.5);
        setFeedback(null);
        setTimeLeft(15);
        setState('playing');
        roundStartTimeRef.current = performance.now();
      } else {
        const totalTime = performance.now() - startTimeRef.current;
        onComplete(score + (isCorrect ? 100 : 0), totalTime);
      }
    }, 4000); // 4s to read explanation
  };

  if (state === 'loading') return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400">Accessing Database...</div>;
  if (state === 'error') return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase text-xl">Module Unavailable (No Content)</div>;

  const currentChallenge = challenges[currentIndex];
  const data = currentChallenge.data as OriginalOrAIContentData;
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const originalUrl = currentChallenge.storage_path ? `${supabaseUrl}/storage/v1/object/public/game-documents/${currentChallenge.storage_path}` : null;
  const aiUrl = data?.aiImagePath ? `${supabaseUrl}/storage/v1/object/public/game-documents/${data.aiImagePath}` : null;

  // Determine which URL goes to A (Left) and B (Right)
  const urlA = originalIsRight ? aiUrl : originalUrl;
  const urlB = originalIsRight ? originalUrl : aiUrl;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 w-full max-w-7xl mx-auto">
      <AnimatePresence mode="wait">
        {state === 'ready' && (
          <motion.div key="ready" exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter text-cyan-400">Original or AI?</h2>
            <p className="text-xl font-mono text-zinc-400 mb-8 uppercase tracking-widest max-w-2xl">
              Two images. One is the original. One has been AI-generated or AI-enhanced. Can you identify the original?
            </p>
            <div className="text-[12rem] font-black leading-none text-lime-400">{countdown}</div>
          </motion.div>
        )}

        {(state === 'playing' || state === 'feedback') && currentChallenge && (
          <motion.div 
            key={`round-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center w-full min-h-0"
          >
            {/* Header info */}
            <div className="flex w-full justify-between items-end mb-4 shrink-0">
              <div className="text-cyan-400 font-mono tracking-widest uppercase">
                Image {currentIndex + 1} of {Math.min(challenges.length, 5)}
              </div>
              <div className={`text-2xl md:text-4xl font-black font-mono tabular-nums ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                00:{String(timeLeft).padStart(2, '0')}
              </div>
            </div>
            
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-widest mb-6 shrink-0 text-center">Which is Original?</h2>
            
            {/* Images Container */}
            <div className="flex-1 w-full flex flex-col md:flex-row gap-4 md:gap-8 min-h-0 mb-6">
              
              {/* IMAGE A */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex-1 relative bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden min-h-0">
                  {urlA ? (
                    <img 
                      src={urlA} 
                      className={`max-w-full max-h-full object-contain transition-all duration-500 ${state === 'feedback' && originalIsRight ? 'blur-sm brightness-50 grayscale' : ''}`}
                      alt="Image A"
                    />
                  ) : (
                    <div className="text-zinc-600 font-mono">NO IMAGE</div>
                  )}
                  {state === 'feedback' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {!originalIsRight ? (
                        <div className="bg-lime-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl md:text-3xl shadow-2xl rotate-[-5deg]">ORIGINAL</div>
                      ) : (
                        <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl md:text-3xl shadow-2xl rotate-[5deg]">AI VERSION</div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleGuess('A')}
                  disabled={state === 'feedback'}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400 text-cyan-400 py-4 text-xl md:text-2xl font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                  IMAGE A
                </button>
              </div>

              {/* IMAGE B */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="flex-1 relative bg-zinc-900 border-2 border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden min-h-0">
                  {urlB ? (
                    <img 
                      src={urlB} 
                      className={`max-w-full max-h-full object-contain transition-all duration-500 ${state === 'feedback' && !originalIsRight ? 'blur-sm brightness-50 grayscale' : ''}`}
                      alt="Image B"
                    />
                  ) : (
                    <div className="text-zinc-600 font-mono">NO IMAGE</div>
                  )}
                  {state === 'feedback' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {originalIsRight ? (
                        <div className="bg-lime-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl md:text-3xl shadow-2xl rotate-[-5deg]">ORIGINAL</div>
                      ) : (
                        <div className="bg-red-500 text-white px-6 py-2 rounded-full font-black uppercase tracking-widest text-xl md:text-3xl shadow-2xl rotate-[5deg]">AI VERSION</div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleGuess('B')}
                  disabled={state === 'feedback'}
                  className="w-full bg-zinc-900 border-2 border-zinc-800 hover:border-lime-400 text-lime-400 py-4 text-xl md:text-2xl font-black uppercase tracking-widest disabled:opacity-50 transition-colors"
                >
                  IMAGE B
                </button>
              </div>

            </div>

            {/* Explanation / Feedback Banner */}
            <AnimatePresence>
              {state === 'feedback' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-zinc-900 border border-zinc-700 p-4 rounded-lg flex flex-col items-center text-center shrink-0"
                >
                  <div className={`text-3xl font-black uppercase tracking-widest mb-2 ${feedback === 'correct' ? 'text-lime-400' : 'text-red-500'}`}>
                    {feedback === 'correct' ? '✓ CORRECT (+100 PTS)' : '✗ INCORRECT (0 PTS)'}
                  </div>
                  {data.explanation && (
                    <div className="text-zinc-300 font-mono max-w-3xl">
                      <span className="text-cyan-400 font-bold">WHY: </span>
                      {data.explanation}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

