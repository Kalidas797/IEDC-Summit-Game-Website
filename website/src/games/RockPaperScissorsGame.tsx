import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';

interface GameProps {
  onUpdateScore: (score: number) => void;
  onComplete: (finalScore: number, timeMs: number) => void;
}

type Choice = 'rock' | 'paper' | 'scissors';
type RoundResult = 'win' | 'loss' | 'draw' | null;

export default function RockPaperScissorsGame({ onUpdateScore, onComplete }: GameProps) {
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'thinking' | 'result' | 'finished'>('loading');
  const [mode, setMode] = useState<number>(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [countdown, setCountdown] = useState(3);
  
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  
  const [score, setScore] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [roundsLost, setRoundsLost] = useState(0);

  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    async function loadSettings() {
      // First get the game id
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'rock-paper-scissors').single();
      if (gameData) {
        // Then get the settings from game_content
        const { data: contentData } = await supabase
          .from('game_content')
          .select('data')
          .eq('game_id', gameData.id)
          .eq('content_type', 'rps-settings')
          .eq('is_active', true)
          .single();
        
        if (contentData && contentData.data && contentData.data.mode) {
          setMode(parseInt(contentData.data.mode, 10));
        }
      }
      setState('ready');
    }
    loadSettings();
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

  const handleChoice = (choice: Choice) => {
    if (state !== 'playing') return;

    setPlayerChoice(choice);
    setState('thinking');
    
    // Generate computer choice
    const choices: Choice[] = ['rock', 'paper', 'scissors'];
    const compChoice = choices[Math.floor(Math.random() * choices.length)];
    
    setTimeout(() => {
      setComputerChoice(compChoice);

      // Determine result
      let result: RoundResult = 'draw';
      if (
        (choice === 'rock' && compChoice === 'scissors') ||
        (choice === 'paper' && compChoice === 'rock') ||
        (choice === 'scissors' && compChoice === 'paper')
      ) {
        result = 'win';
      } else if (choice !== compChoice) {
        result = 'loss';
      }

      setRoundResult(result);

      let roundScore = 0;
      if (result === 'win') {
        roundScore = 100;
        setRoundsWon(prev => prev + 1);
      } else if (result === 'draw') {
        roundScore = 25;
      } else {
        setRoundsLost(prev => prev + 1);
      }

      const newScore = score + roundScore;
      setScore(newScore);
      onUpdateScore(newScore);

      setState('result');

      setTimeout(() => {
        // Check if match is over
        if (currentRound < mode) {
          setCurrentRound(prev => prev + 1);
          setPlayerChoice(null);
          setComputerChoice(null);
          setRoundResult(null);
          setState('playing');
        } else {
          setState('finished');
        }
      }, 2500); // Wait to show result
    }, 800); // Thinking delay
  };

  const getEmoji = (c: Choice | null) => {
    if (c === 'rock') return '🪨';
    if (c === 'paper') return '📄';
    if (c === 'scissors') return '✂️';
    return '???';
  };

  const getResultText = (r: RoundResult) => {
    if (r === 'win') return 'YOU WIN!';
    if (r === 'loss') return 'YOU LOSE';
    if (r === 'draw') return 'DRAW';
    return '';
  };

  if (state === 'loading') return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400">Loading Game...</div>;

  if (state === 'finished') {
    const playerWonMatch = roundsWon > roundsLost;
    const matchResultText = playerWonMatch ? 'YOU WIN' : roundsWon < roundsLost ? 'YOU LOSE' : 'DRAW';
    const matchResultColor = playerWonMatch ? 'text-lime-400' : roundsWon < roundsLost ? 'text-red-500' : 'text-zinc-400';

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto text-center">
        <div className="font-mono text-zinc-400 uppercase tracking-widest mb-4">MATCH COMPLETE</div>
        
        <h2 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter mb-8 ${matchResultColor}`}>
          {matchResultText}
        </h2>
        
        <div className="text-5xl md:text-6xl font-black text-white italic mb-12">
          {roundsWon} <span className="text-zinc-600">—</span> {roundsLost}
        </div>

        <div className="text-2xl md:text-3xl font-mono text-zinc-400 uppercase tracking-widest mb-12">
          SCORE: <span className="text-white font-black">{score}</span>
        </div>

        <button 
          onClick={() => {
            const totalTime = performance.now() - startTimeRef.current;
            onComplete(score, totalTime);
          }}
          className="bg-zinc-900 border-2 border-zinc-700 border-b-8 active:border-b-2 active:translate-y-2 hover:-translate-y-1 hover:border-b-[10px] text-white font-black uppercase tracking-widest px-12 py-6 transition-all outline-none focus:ring-4 ring-orange-400"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 w-full max-w-5xl mx-auto overflow-hidden">
      <AnimatePresence mode="wait">
        {state === 'ready' && (
          <motion.div key="ready" exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-4 tracking-tighter text-orange-400">Rock Paper Scissors</h2>
            <p className="text-xl font-mono text-zinc-400 mb-8 uppercase tracking-widest max-w-2xl">
              Best of {mode} Rounds
            </p>
            <div className="text-[12rem] font-black leading-none text-lime-400">{countdown}</div>
          </motion.div>
        )}

        {(state === 'playing' || state === 'thinking' || state === 'result') && (
          <motion.div 
            key={`round-${currentRound}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center w-full min-h-0 py-4"
          >
            {/* Header */}
            <h2 className="text-3xl font-black uppercase text-orange-400 tracking-widest mb-2">Rock Paper Scissors</h2>
            <div className="text-zinc-400 font-mono tracking-widest uppercase mb-10">
              Round {currentRound} / {mode}
            </div>

            {/* Matchup Area */}
            <div className="flex w-full justify-center items-center gap-8 md:gap-16 mb-8">
              <div className="flex flex-col items-center min-w-[120px]">
                <span className="font-black uppercase tracking-widest mb-4 text-zinc-400 text-sm md:text-base">YOU</span>
                <div className="text-7xl md:text-9xl transition-all">
                  {playerChoice ? getEmoji(playerChoice) : <span className="text-zinc-800">?</span>}
                </div>
              </div>

              <div className="text-3xl md:text-5xl font-black text-zinc-600 italic">VS</div>

              <div className="flex flex-col items-center min-w-[120px]">
                <span className="font-black uppercase tracking-widest mb-4 text-zinc-400 text-sm md:text-base">COMPUTER</span>
                <div className="text-7xl md:text-9xl transition-all">
                  {state === 'result' ? getEmoji(computerChoice) : <span className="text-zinc-600 animate-pulse">?</span>}
                </div>
              </div>
            </div>

            {/* Result Banner */}
            <div className="h-24 flex flex-col items-center justify-center mb-8 w-full">
              {state === 'result' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-5xl md:text-6xl font-black uppercase tracking-widest ${
                    roundResult === 'win' ? 'text-lime-400' :
                    roundResult === 'loss' ? 'text-red-500' :
                    'text-zinc-400'
                  }`}
                >
                  {getResultText(roundResult)}
                  <div className="text-2xl mt-2 text-center text-white font-mono">
                    {roundResult === 'win' ? '+100' : roundResult === 'draw' ? '+25' : '+0'}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Choices */}
            <div className="flex gap-4 md:gap-8 w-full max-w-3xl px-4 mt-auto mb-4 justify-center">
              {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                <button
                  key={choice}
                  disabled={state !== 'playing'}
                  onClick={() => handleChoice(choice)}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 md:gap-4 p-4 md:p-8 rounded-none transition-all outline-none
                    ${state !== 'playing' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-800 focus:ring-4 ring-orange-400'}
                    ${playerChoice === choice ? 'bg-zinc-800 border-zinc-600 border-b-2 translate-y-2' : 'bg-zinc-900 border-zinc-700 border-b-8 active:border-b-2 active:translate-y-2 hover:-translate-y-1 hover:border-b-[10px]'}
                    border-2
                  `}
                >
                  <span className="text-4xl md:text-6xl mb-2">{getEmoji(choice)}</span>
                  <span className="font-black uppercase tracking-widest text-xs md:text-lg text-white">{choice}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
