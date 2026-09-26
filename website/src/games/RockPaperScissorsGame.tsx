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
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'result' | 'finished'>('loading');
  const [mode, setMode] = useState<number>(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [countdown, setCountdown] = useState(3);
  
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult>(null);
  
  const [score, setScore] = useState(0);
  const [roundsWon, setRoundsWon] = useState(0);
  const [roundsLost, setRoundsLost] = useState(0);
  const [draws, setDraws] = useState(0);

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
    
    // Generate computer choice
    const choices: Choice[] = ['rock', 'paper', 'scissors'];
    const compChoice = choices[Math.floor(Math.random() * choices.length)];
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
      setDraws(prev => prev + 1);
    } else {
      setRoundsLost(prev => prev + 1);
    }

    const newScore = score + roundScore;
    setScore(newScore);
    onUpdateScore(newScore);

    setState('result');

    setTimeout(() => {
      // Check if match is over
      // A player wins if they reach majority of rounds (e.g., 3 wins in BO5), 
      // but the rules state: ends when reaching required score OR all rounds completed.
      // Easiest is just playing all rounds.
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 tracking-tighter text-lime-400">Match Complete</h2>
        <div className="text-2xl font-mono text-white mb-4">Final Score: {score}</div>
        <div className="text-xl font-mono text-zinc-400 mb-8">
          Won: {roundsWon} | Lost: {roundsLost} | Draws: {draws}
        </div>
        <button 
          onClick={() => {
            const totalTime = performance.now() - startTimeRef.current;
            onComplete(score, totalTime);
          }}
          className="bg-cyan-500 text-black font-black uppercase tracking-widest px-8 py-4 rounded hover:bg-cyan-400 transition-colors"
        >
          CONTINUE
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 w-full max-w-5xl mx-auto relative overflow-hidden">
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

        {(state === 'playing' || state === 'result') && (
          <motion.div 
            key={`round-${currentRound}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center w-full min-h-0"
          >
            <div className="text-orange-400 font-mono tracking-widest uppercase mb-8">
              Round {currentRound} / {mode}
            </div>

            {/* Arena View */}
            <div className="flex w-full justify-around items-center mb-12">
              <div className="flex flex-col items-center">
                <span className="font-black uppercase tracking-widest mb-4 text-zinc-400">YOU</span>
                <div className="text-8xl md:text-[10rem] drop-shadow-2xl transition-all">
                  {getEmoji(playerChoice)}
                </div>
              </div>

              <div className="text-4xl md:text-6xl font-black text-zinc-700 italic">VS</div>

              <div className="flex flex-col items-center">
                <span className="font-black uppercase tracking-widest mb-4 text-zinc-400">COMPUTER</span>
                <div className="text-8xl md:text-[10rem] drop-shadow-2xl transition-all">
                  {getEmoji(computerChoice)}
                </div>
              </div>
            </div>

            {/* Result Banner */}
            <div className="h-24 flex items-center justify-center mb-8 w-full">
              {state === 'result' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-4xl md:text-6xl font-black uppercase tracking-widest ${
                    roundResult === 'win' ? 'text-lime-400' :
                    roundResult === 'loss' ? 'text-red-500' :
                    'text-zinc-400'
                  }`}
                >
                  {getResultText(roundResult)}
                  <div className="text-xl mt-2 text-center text-white">
                    {roundResult === 'win' ? '+100' : roundResult === 'draw' ? '+25' : '+0'}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Choices */}
            {state === 'playing' && (
              <div className="flex gap-4 md:gap-8 w-full max-w-3xl px-4 mt-auto mb-8">
                {(['rock', 'paper', 'scissors'] as Choice[]).map(choice => (
                  <button
                    key={choice}
                    onClick={() => handleChoice(choice)}
                    className="flex-1 flex flex-col items-center justify-center gap-4 bg-zinc-900 border-2 border-zinc-800 hover:border-orange-400 rounded-xl p-4 md:p-8 transition-colors"
                  >
                    <span className="text-5xl md:text-7xl">{getEmoji(choice)}</span>
                    <span className="font-black uppercase tracking-widest text-sm md:text-xl text-zinc-300">{choice}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
