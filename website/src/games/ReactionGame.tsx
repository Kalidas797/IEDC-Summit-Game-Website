import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';

interface ReactionGameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type LightState = 'waiting' | 'ready' | 'go' | 'too-early' | 'success';

export default function ReactionGame({ onUpdateScore, onComplete }: ReactionGameProps) {
  const [state, setState] = useState<LightState>('waiting');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // Admin-configurable settings
  const [minWait, setMinWait] = useState(2000);
  const [maxWait, setMaxWait] = useState(6000);
  const [maxRounds, setMaxRounds] = useState(5);
  const [falseStartPenalty, setFalseStartPenalty] = useState(true);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load settings from Supabase
  useEffect(() => {
    async function loadSettings() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'reaction').single();
      if (gameData) {
        const { data: settings } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('content_type', 'reaction-settings').eq('is_active', true).single();
        if (settings) {
          setMinWait(settings.data?.minWait || 2000);
          setMaxWait(settings.data?.maxWait || 6000);
          setMaxRounds(settings.data?.rounds || 5);
          setFalseStartPenalty(settings.data?.falseStartPenalty ?? true);
        }
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!loading) {
      startRound();
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [loading]);

  const startRound = () => {
    setState('ready');
    setReactionTime(null);
    const randomWait = Math.floor(Math.random() * (maxWait - minWait)) + minWait;
    timerRef.current = setTimeout(() => {
      setState('go');
      startTimeRef.current = performance.now();
    }, randomWait);
  };

  const handleClick = () => {
    if (state === 'ready') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setState('too-early');
      if (falseStartPenalty) {
        setTimeout(() => startRound(), 2000);
      }
    } else if (state === 'go') {
      const timeMs = performance.now() - startTimeRef.current;
      setReactionTime(timeMs);
      setState('success');
      const roundScore = Math.max(100, Math.floor(1000 - timeMs));
      const newTotal = totalScore + roundScore;
      setTotalScore(newTotal);
      onUpdateScore(newTotal);
      setTimeout(() => {
        if (round < maxRounds) {
          setRound(round + 1);
          startRound();
        } else {
          onComplete(newTotal, 0);
        }
      }, 2000);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading Config...</div>;

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center cursor-pointer w-full touch-none select-none"
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => { e.preventDefault(); handleClick(); }}
    >
      <div className="absolute top-24 text-zinc-500 font-mono tracking-widest uppercase">
        Round {round} / {maxRounds}
      </div>

      <motion.div 
        animate={{ 
          scale: state === 'go' ? 1.1 : 1,
          backgroundColor: state === 'ready' ? '#ef4444' : state === 'go' ? '#a3e635' : state === 'too-early' ? '#000000' : '#27272a'
        }}
        className={`w-64 h-64 md:w-96 md:h-96 rounded-full flex items-center justify-center transition-colors shadow-2xl ${
          state === 'go' ? 'shadow-[0_0_100px_rgba(163,230,53,0.5)]' : 
          state === 'ready' ? 'shadow-[0_0_100px_rgba(239,68,68,0.5)]' : ''
        }`}
      >
        <span className="text-2xl md:text-4xl font-black uppercase tracking-widest text-zinc-950">
          {state === 'ready' && "WAIT"}
          {state === 'go' && "TAP NOW!"}
          {state === 'too-early' && <span className="text-red-500">TOO EARLY</span>}
          {state === 'success' && <span className="text-lime-400">{Math.floor(reactionTime || 0)}ms</span>}
        </span>
      </motion.div>
      
      <p className="mt-12 text-zinc-400 font-mono text-center max-w-md px-4 uppercase text-sm">
        {state === 'ready' ? "Wait for the light to turn green." : 
         state === 'go' ? "Tap as fast as you can!" : 
         "Prepare for next sequence..."}
      </p>
    </div>
  );
}
