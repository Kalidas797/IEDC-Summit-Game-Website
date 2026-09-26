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



  return (
    <div className="flex-1 flex flex-col p-4 w-full h-full max-w-5xl mx-auto overflow-hidden bg-black text-white">
      <AnimatePresence mode="wait">
        {state === 'ready' && (
          <motion.div key="ready" exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-5xl md:text-7xl font-black uppercase mb-6 tracking-tighter">
              Rock Paper Scissors
            </h2>
            <div className="mb-12">
              <p className="text-xl font-mono text-zinc-400 uppercase tracking-widest">
                Best of {mode} Rounds
              </p>
            </div>
            <div className="text-[12rem] font-black leading-none">{countdown}</div>
          </motion.div>
        )}

        {(state === 'playing' || state === 'thinking' || state === 'result') && (
          <motion.div 
            key={`round-${currentRound}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center w-full min-h-0 py-4 justify-between"
          >
            {/* Simple Header */}
            <div className="w-full text-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-widest mb-1">Rock Paper Scissors</h2>
              <div className="text-zinc-500 font-mono tracking-widest uppercase">
                Round {currentRound} / {mode}
              </div>
            </div>

            {/* Score */}
            <div className="font-mono text-xl tracking-widest text-zinc-400 mb-8">
              SCORE: <span className="text-white">{score}</span>
            </div>

            {/* Matchup Area (Ultra Flat) */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative">
              <div className="flex w-full justify-between items-center px-4 md:px-12 z-10">
                
                {/* Player Side */}
                <div className="flex flex-col items-center w-1/3">
                  <span className="font-mono uppercase tracking-widest text-zinc-500 mb-4 text-sm md:text-base">YOU</span>
                  <div className="text-7xl md:text-[8rem]">
                    {playerChoice ? getEmoji(playerChoice) : <span className="opacity-0">.</span>}
                  </div>
                </div>

                {/* VS */}
                <div className="w-1/3 flex justify-center text-2xl md:text-4xl font-black text-zinc-700 italic">
                  VS
                </div>

                {/* Computer Side */}
                <div className="flex flex-col items-center w-1/3">
                  <span className="font-mono uppercase tracking-widest text-zinc-500 mb-4 text-sm md:text-base">COMPUTER</span>
                  <div className="text-7xl md:text-[8rem]">
                    {state === 'result' ? getEmoji(computerChoice) : (state === 'thinking' ? <span className="text-zinc-500">?</span> : <span className="opacity-0">.</span>)}
                  </div>
                </div>
                
              </div>
              
              {/* Flat Result Text */}
              <div className="h-20 flex items-center justify-center mt-8 w-full z-30">
                {state === 'result' && (
                  <div className={`text-4xl md:text-5xl font-black uppercase tracking-widest text-center ${
                    roundResult === 'win' ? 'text-white' :
                    roundResult === 'loss' ? 'text-zinc-500' :
                    'text-zinc-400'
                  }`}>
                    {getResultText(roundResult)}
                    <div className="text-xl mt-2 font-mono text-zinc-400">
                      {roundResult === 'win' ? '+100' : roundResult === 'draw' ? '+25' : '+0'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Flat Buttons */}
            <div className="w-full max-w-3xl mt-8">
              <div className="flex gap-2 md:gap-4 justify-center">
                {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                  <button
                    key={choice}
                    disabled={state !== 'playing'}
                    onClick={() => handleChoice(choice)}
                    className={`flex-1 max-w-[220px] flex flex-col items-center justify-center gap-2 py-6 rounded-none transition-all outline-none border-4
                      ${state !== 'playing' ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800'}
                      ${playerChoice === choice ? 'bg-white text-black border-white' : 'bg-transparent border-zinc-800 text-zinc-300'}
                    `}
                  >
                    <span className="text-5xl md:text-6xl mb-2">{getEmoji(choice)}</span>
                    <span className={`font-black uppercase tracking-widest text-sm md:text-lg ${playerChoice === choice ? 'text-black' : 'text-zinc-400'}`}>{choice}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {state === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto text-center">
            <div className="font-mono text-zinc-500 uppercase tracking-widest mb-8">Match Complete</div>
            
            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-12 text-white">
              {roundsWon > roundsLost ? 'YOU WIN' : roundsWon < roundsLost ? 'YOU LOSE' : 'DRAW'}
            </h2>
            
            <div className="text-4xl font-black text-zinc-400 mb-12">
              <span className="text-white">{roundsWon}</span> — {roundsLost}
            </div>

            <div className="text-2xl font-mono text-zinc-500 uppercase tracking-widest mb-12">
              SCORE: <span className="text-white">{score}</span>
            </div>

            <button 
              onClick={() => {
                const totalTime = performance.now() - startTimeRef.current;
                onComplete(score, totalTime);
              }}
              className="bg-white text-black border-4 border-white font-black uppercase tracking-widest px-12 py-6 transition-colors hover:bg-zinc-200 outline-none"
            >
              CONTINUE
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
