import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent } from '../../../shared/types';

interface MemoryGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type MemoryState = 'loading' | 'ready' | 'memorize' | 'questions' | 'result' | 'error';

export default function MemoryGame({ onUpdateScore, onComplete }: MemoryGameProps) {
  const [state, setState] = useState<MemoryState>('loading');
  const [content, setContent] = useState<GameContent | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  
  useEffect(() => {
    async function loadContent() {
      // 1. Get Game ID for Memory Game
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'memory').single();
      if (!gameData) {
        setState('error');
        return;
      }
      
      // 2. Fetch Active Content
      const { data: contentData } = await supabase
        .from('game_content')
        .select('*')
        .eq('game_id', gameData.id)
        .eq('is_active', true);
        
      if (!contentData || contentData.length === 0) {
        setState('error');
        return;
      }
      
      // Pick random active challenge
      const randomContent = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(randomContent);
      setMemoryTimeLeft((randomContent.data.displayDuration || 5000) / 1000);
      setState('ready');
    }
    
    loadContent();
  }, []);

  // Ready Countdown
  useEffect(() => {
    if (state === 'ready') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setState('memorize');
        startTimeRef.current = performance.now();
      }
    }
  }, [countdown, state]);

  // Memorize Timer
  useEffect(() => {
    if (state === 'memorize') {
      if (memoryTimeLeft > 0) {
        const timer = setTimeout(() => setMemoryTimeLeft(memoryTimeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setState('questions');
      }
    }
  }, [memoryTimeLeft, state]);

  const handleAnswer = (selectedIndex: number) => {
    if (!content) return;
    const questions = content.data.questions;
    const currentQ = questions[currentQuestionIndex];
    
    let newScore = score;
    let newCorrect = correctAnswers;
    
    if (selectedIndex === currentQ.correctAnswer) {
      newScore += 100;
      newCorrect += 1;
      setScore(newScore);
      setCorrectAnswers(newCorrect);
      onUpdateScore(newScore);
    }
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      const totalTime = performance.now() - startTimeRef.current;
      onComplete(newScore, totalTime);
    }
  };

  if (state === 'loading') {
    return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Accessing Secure Database...</div>;
  }

  if (state === 'error') {
    return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">Module Currently Unavailable</div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-5xl mx-auto relative">
      <AnimatePresence mode="wait">
        
        {state === 'ready' && (
          <motion.div key="ready" exit={{ opacity: 0 }} className="flex flex-col items-center text-center">
            <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">Study the Document</h2>
            <div className="text-[12rem] font-black leading-none text-lime-400">{countdown}</div>
          </motion.div>
        )}

        {state === 'memorize' && content && (
          <motion.div 
            key="memorize" 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center w-full h-full"
          >
            <div className="w-full flex justify-between items-center mb-6 border-b-2 border-zinc-800 pb-4">
               <h2 className="font-mono text-xl uppercase tracking-widest text-zinc-400">Remember This</h2>
               <div className="text-4xl font-black text-red-500 font-mono">0{memoryTimeLeft}.0</div>
            </div>
            <div className="flex-1 w-full bg-zinc-900 border-2 border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              {content.storage_path ? (
                <img 
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/game-documents/${content.storage_path}`} 
                  className="max-w-full max-h-full object-contain"
                  alt="Document to memorize"
                />
              ) : (
                <div className="text-zinc-600 font-mono">NO IMAGE DATA</div>
              )}
            </div>
          </motion.div>
        )}

        {state === 'questions' && content && (
          <motion.div 
            key="questions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-3xl flex flex-col items-center text-center"
          >
            <div className="text-lime-400 font-mono tracking-widest uppercase mb-4">
              Question {currentQuestionIndex + 1} of {content.data.questions.length}
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-12">
              {content.data.questions[currentQuestionIndex].question}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {content.data.questions[currentQuestionIndex].options.map((opt: string, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400 hover:bg-zinc-800 text-left p-6 font-bold text-xl uppercase tracking-wider transition-all"
                >
                  <span className="text-zinc-500 mr-4 font-mono">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
