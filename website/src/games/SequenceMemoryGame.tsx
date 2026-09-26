import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface SequenceMemoryGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (score: number, timeMs: number) => void;
}

const SYMBOLS = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠'];
const SCORE_PER_CORRECT = 100;

type Phase = 'show' | 'recall' | 'feedback';

export default function SequenceMemoryGame({ onUpdateScore, onComplete }: SequenceMemoryGameProps) {
  const [totalRounds, setTotalRounds] = useState(5);
  const [baseLength, setBaseLength] = useState(3);
  const [displayTime, setDisplayTime] = useState(3000);
  const [loading, setLoading] = useState(true);

  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('show');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateSequence = (round: number) => {
    // Length increases by 1 each round
    const length = baseLength + (round - 1); 
    const newSeq = [];
    for (let i = 0; i < length; i++) {
      newSeq.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }
    setSequence(newSeq);
    setPlayerInput([]);
    setPhase('show');
    setFeedback(null);

    // Display time can decrease slightly per round, but start from base
    const time = Math.max(1000, displayTime - ((round - 1) * 300));
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPhase('recall');
    }, time);
  };

  useEffect(() => {
    async function loadSettings() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'sequence-memory').single();
      if (gameData) {
        const { data: settings } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('content_type', 'sequence-memory-settings').eq('is_active', true).single();
        if (settings) {
          setTotalRounds(settings.data?.rounds || 5);
          setBaseLength(settings.data?.baseLength || 3);
          setDisplayTime(settings.data?.displayTime || 3000);
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      startTimeRef.current = Date.now();
      generateSequence(1);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loading, baseLength, displayTime]);

  const handleSelect = (symbol: string) => {
    if (phase !== 'recall') return;
    
    const newInput = [...playerInput, symbol];
    setPlayerInput(newInput);

    // Check if player has selected the full sequence
    if (newInput.length === sequence.length) {
      setPhase('feedback');
      const isCorrect = newInput.every((sym, idx) => sym === sequence[idx]);
      
      if (isCorrect) {
        const newScore = score + SCORE_PER_CORRECT;
        setScore(newScore);
        onUpdateScore(newScore);
        setFeedback('correct');
      } else {
        setFeedback('wrong');
      }

      setTimeout(() => {
        if (currentRound >= totalRounds) {
          onComplete(score + (isCorrect ? SCORE_PER_CORRECT : 0), Date.now() - startTimeRef.current);
        } else {
          setCurrentRound(prev => prev + 1);
          generateSequence(currentRound + 1);
        }
      }, 1500);
    }
  };

  const undoLast = () => {
    if (phase !== 'recall' || playerInput.length === 0) return;
    setPlayerInput(prev => prev.slice(0, -1));
  };

  const resetInput = () => {
    if (phase !== 'recall') return;
    setPlayerInput([]);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-zinc-950 text-cyan-400 font-mono animate-pulse">Loading Module...</div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950">
      
      {/* HUD */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-zinc-400 font-mono uppercase tracking-widest text-sm md:text-xl pointer-events-none">
        <div>Round {currentRound} / {totalRounds}</div>
      </div>

      <div className="max-w-3xl w-full flex flex-col items-center gap-12">
        
        {/* Sequence Display Area */}
        <div className="w-full h-32 md:h-48 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-3xl p-4 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {phase === 'show' && (
              <motion.div 
                key="show"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="flex gap-4 md:gap-8 flex-wrap justify-center"
              >
                {sequence.map((sym, i) => (
                  <span key={i} className="text-4xl md:text-7xl">{sym}</span>
                ))}
              </motion.div>
            )}

            {phase === 'recall' && (
              <motion.div 
                key="recall"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center w-full"
              >
                <p className="text-zinc-500 font-mono uppercase tracking-widest mb-4">Your Sequence:</p>
                <div className="flex gap-2 md:gap-4 flex-wrap justify-center min-h-[4rem]">
                  {playerInput.map((sym, i) => (
                    <motion.span 
                      initial={{ scale: 0 }} animate={{ scale: 1 }} 
                      key={i} className="text-3xl md:text-5xl"
                    >
                      {sym}
                    </motion.span>
                  ))}
                  {Array.from({ length: sequence.length - playerInput.length }).map((_, i) => (
                    <span key={'empty-' + i} className="text-3xl md:text-5xl opacity-10">⚪</span>
                  ))}
                </div>
              </motion.div>
            )}
            
            {phase === 'feedback' && (
               <motion.div 
                 key="feedback"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex flex-col items-center gap-4"
               >
                 {feedback === 'correct' ? (
                    <div className="flex items-center gap-4 text-lime-400">
                      <CheckCircle2 size={60} />
                      <span className="text-3xl md:text-5xl font-black uppercase tracking-widest">PERFECT</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-red-500">
                      <XCircle size={60} />
                      <span className="text-3xl md:text-5xl font-black uppercase tracking-widest">INCORRECT</span>
                    </div>
                  )}
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Controls (Only visible during recall) */}
        <div className={'w-full transition-opacity duration-300 ' + (phase === 'recall' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')}>
          <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-md mx-auto mb-6">
            {SYMBOLS.map((sym, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(sym)}
                className="aspect-square flex items-center justify-center bg-zinc-900 border-2 border-zinc-800 rounded-2xl text-5xl md:text-7xl hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 transition-all"
              >
                {sym}
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button 
              onClick={undoLast}
              disabled={playerInput.length === 0}
              className="px-6 py-3 bg-zinc-900 text-zinc-400 font-mono uppercase tracking-widest rounded-xl hover:bg-zinc-800 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw size={18} /> Undo
            </button>
            <button 
              onClick={resetInput}
              disabled={playerInput.length === 0}
              className="px-6 py-3 bg-zinc-900 text-red-400 font-mono uppercase tracking-widest rounded-xl hover:bg-zinc-800 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
