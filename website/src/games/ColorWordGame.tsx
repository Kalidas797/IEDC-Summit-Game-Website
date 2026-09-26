import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ColorWordGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (score: number, timeMs: number) => void;
}

const COLORS = [
  { name: 'RED', hex: '#ef4444' },     // text-red-500
  { name: 'BLUE', hex: '#3b82f6' },    // text-blue-500
  { name: 'GREEN', hex: '#22c55e' },   // text-green-500
  { name: 'YELLOW', hex: '#eab308' },  // text-yellow-500
  { name: 'PURPLE', hex: '#a855f7' },  // text-purple-500
  { name: 'ORANGE', hex: '#f97316' }   // text-orange-500
];

// Constants removed in favor of state
const SCORE_PER_CORRECT = 100;

export default function ColorWordGame({ onUpdateScore, onComplete }: ColorWordGameProps) {
  const [totalRounds, setTotalRounds] = useState(10);
  const [timePerRound, setTimePerRound] = useState(3000);
  const [loading, setLoading] = useState(true);

  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [word, setWord] = useState(COLORS[0]);
  const [displayColor, setDisplayColor] = useState(COLORS[1]);
  const [options, setOptions] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(3000);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateRound = () => {
    // Pick a random word
    const wIndex = Math.floor(Math.random() * COLORS.length);
    const w = COLORS[wIndex];
    
    // Pick a random color, heavily weighted to be different from the word
    let cIndex = Math.floor(Math.random() * COLORS.length);
    if (cIndex === wIndex && Math.random() > 0.1) {
      cIndex = (cIndex + 1) % COLORS.length;
    }
    const c = COLORS[cIndex];

    setWord(w);
    setDisplayColor(c);

    // Generate 4 options
    const newOptions = new Set<string>();
    newOptions.add(c.name); // Correct answer (Display color)
    newOptions.add(w.name); // Trick answer (Word meaning)
    
    while (newOptions.size < 4) {
      const randColor = COLORS[Math.floor(Math.random() * COLORS.length)].name;
      newOptions.add(randColor);
    }
    
    setOptions(Array.from(newOptions).sort(() => Math.random() - 0.5));
    setTimeLeft(timePerRound);
    setFeedback(null);
  };

  useEffect(() => {
    async function loadSettings() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'color-word-challenge').single();
      if (gameData) {
        const { data: settings } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('content_type', 'color-word-settings').eq('is_active', true).single();
        if (settings) {
          setTotalRounds(settings.data?.rounds || 10);
          setTimePerRound(settings.data?.timePerRound || 3000);
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      startTimeRef.current = Date.now();
      generateRound();
    }
  }, [loading, timePerRound]);

  useEffect(() => {
    if (loading || feedback !== null) return; // Stop timer if round is over

    if (timeLeft <= 0) {
      handleAnswer('TIMEOUT');
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 100);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, feedback]);

  const handleAnswer = (selectedName: string) => {
    if (feedback !== null) return; // Prevent double clicks
    
    const isCorrect = selectedName === displayColor.name;
    
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
        generateRound();
      }
    }, 500);
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-zinc-950 text-rose-400 font-mono animate-pulse">Loading Module...</div>;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-zinc-950">
      
      {/* HUD */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-zinc-400 font-mono uppercase tracking-widest text-sm md:text-xl pointer-events-none">
        <div>Round {currentRound} / {totalRounds}</div>
      </div>

      <div className="max-w-2xl w-full flex flex-col items-center gap-12">
        {/* Timer Bar */}
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-rose-500"
            initial={{ width: '100%' }}
            animate={{ width: ((timeLeft / timePerRound) * 100) + '%' }}
            transition={{ ease: "linear", duration: 0.1 }}
          />
        </div>

        {/* The Word */}
        <div className="text-center">
          <p className="text-zinc-500 font-mono uppercase tracking-widest mb-4">What color is this text?</p>
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={currentRound}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-6xl md:text-9xl font-black uppercase tracking-tighter"
                style={{ color: displayColor.hex }}
              >
                {word.name}
              </motion.h1>
            </AnimatePresence>

            {/* Feedback Overlay */}
            <AnimatePresence>
              {feedback && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
                >
                  {feedback === 'correct' ? (
                    <CheckCircle2 size={100} className="text-lime-400" />
                  ) : (
                    <XCircle size={100} className="text-red-500" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
          {options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(opt)}
              disabled={feedback !== null}
              className="p-6 md:p-8 bg-zinc-900 border-2 border-zinc-800 rounded-2xl text-2xl md:text-4xl font-black uppercase tracking-widest text-white hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 transition-all"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
