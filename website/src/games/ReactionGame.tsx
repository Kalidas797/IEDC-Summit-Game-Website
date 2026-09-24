import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const MAX_ROUNDS = 5;

  const startRound = () => {
    setState('ready');
    setReactionTime(null);
    
    // Random wait between 2 to 6 seconds
    const randomWait = Math.floor(Math.random() * 4000) + 2000;
    
    timerRef.current = setTimeout(() => {
      setState('go');
      startTimeRef.current = performance.now();
    }, randomWait);
  };

  useEffect(() => {
    // Start first round automatically
    startRound();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = () => {
    if (state === 'ready') {
      // Clicked too early!
      if (timerRef.current) clearTimeout(timerRef.current);
      setState('too-early');
      setTimeout(() => {
        startRound();
      }, 2000);
    } else if (state === 'go') {
      // Success! Calculate time.
      const timeMs = performance.now() - startTimeRef.current;
      setReactionTime(timeMs);
      setState('success');
      
      // Calculate score based on speed (1000 base, minus time in ms. Minimum 100)
      const roundScore = Math.max(100, Math.floor(1000 - timeMs));
      const newTotal = totalScore + roundScore;
      setTotalScore(newTotal);
      onUpdateScore(newTotal);

      setTimeout(() => {
        if (round < MAX_ROUNDS) {
          setRound(round + 1);
          startRound();
        } else {
          onComplete(newTotal, 0); // End of game
        }
      }, 2000);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col items-center justify-center cursor-pointer w-full"
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()} // Prevent text selection
    >
      <div className="absolute top-24 text-zinc-500 font-mono tracking-widest uppercase">
        Round {round} / {MAX_ROUNDS}
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
