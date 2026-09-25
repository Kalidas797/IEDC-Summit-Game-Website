import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent } from '../../../shared/types';

interface DoodleGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

type Phase = 'loading' | 'error' | 'draw' | 'guess' | 'reveal';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DoodleGame({ onComplete, onExit: _onExit }: DoodleGameProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [content, setContent] = useState<GameContent | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [guess, setGuess] = useState('');
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'doodle').single();
      if (!gameData) return setPhase('error');
      const { data: contentData } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('is_active', true);
      if (!contentData || contentData.length === 0) return setPhase('error');
      const chosen = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(chosen);
      setTimeLeft(chosen.data?.drawingTime || 30);
      setPhase('draw');
      startTimeRef.current = performance.now();
    }
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== 'draw') return;
    if (timeLeft <= 0) { finishDrawing(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase]);

  // Setup canvas
  useEffect(() => {
    if (phase !== 'draw' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [phase]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e);
  };

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPosRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, []);

  const endDraw = () => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
  };

  const finishDrawing = () => {
    if (canvasRef.current) {
      setDrawingDataUrl(canvasRef.current.toDataURL());
    }
    setPhase('guess');
  };

  const submitGuess = () => {
    setPhase('reveal');
    const totalTime = performance.now() - startTimeRef.current;
    // Score based on whether guess matches prompt (simple similarity)
    const promptLower = (content?.data?.prompt || '').toLowerCase();
    const guessLower = guess.toLowerCase();
    const words = promptLower.split(/\s+/);
    const matchedWords = words.filter((w: string) => guessLower.includes(w));
    const similarity = words.length > 0 ? matchedWords.length / words.length : 0;
    const finalScore = Math.round(similarity * 1000);

    setTimeout(() => onComplete(finalScore, totalTime), 4000);
  };

  if (phase === 'loading') return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading Prompt...</div>;
  if (phase === 'error') return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">Module Unavailable (No Prompts)</div>;
  if (!content) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10 w-full max-w-4xl mx-auto">
      <AnimatePresence mode="wait">

        {phase === 'draw' && (
          <motion.div key="draw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full h-full">
            <div className="text-center mb-4">
              <p className="text-zinc-500 font-mono mb-1 uppercase tracking-widest text-xs">Draw This</p>
              <h2 className="text-2xl md:text-4xl font-black text-pink-400 uppercase tracking-wider bg-pink-400/10 inline-block px-6 py-3 border border-pink-400/30 rounded-lg">
                {content.data?.prompt}
              </h2>
            </div>
            <div className="w-full flex justify-between items-center mb-2">
              <span className="text-zinc-500 font-mono text-xs uppercase">Draw here ↓</span>
              <span className={`text-xl font-mono font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
            </div>
            <div className="w-full flex-1 min-h-[300px] bg-white rounded-xl overflow-hidden border-4 border-zinc-800 hover:border-pink-500 transition-colors cursor-crosshair touch-none">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            <button onClick={finishDrawing} className="mt-4 btn-primary bg-pink-500 text-white text-lg px-12 py-4 w-full max-w-md shadow-[0_0_30px_rgba(236,72,153,0.3)]">
              Done Drawing
            </button>
          </motion.div>
        )}

        {phase === 'guess' && (
          <motion.div key="guess" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full">
            <h2 className="text-2xl font-black uppercase tracking-wider mb-4 text-cyan-400">What Was Drawn?</h2>
            <p className="text-zinc-500 font-mono text-sm mb-6 uppercase">Pass the device to another player. They must guess from the drawing!</p>
            {drawingDataUrl && (
              <div className="w-full max-w-lg mb-6 bg-white rounded-xl overflow-hidden border-4 border-zinc-800">
                <img src={drawingDataUrl} alt="Drawing" className="w-full object-contain" />
              </div>
            )}
            <input
              type="text"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              placeholder="Type your guess..."
              className="w-full max-w-lg p-4 bg-zinc-900 border-2 border-zinc-800 focus:border-cyan-400 text-white font-bold text-xl text-center uppercase tracking-wider outline-none rounded-lg mb-4"
            />
            <button onClick={submitGuess} disabled={!guess.trim()} className="btn-primary bg-cyan-500 text-black text-lg px-12 py-4 w-full max-w-lg disabled:opacity-50">
              Submit Guess
            </button>
          </motion.div>
        )}

        {phase === 'reveal' && (
          <motion.div key="reveal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full text-center">
            <h2 className="text-3xl font-black uppercase tracking-wider mb-8 text-lime-400">Reveal!</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-8">
              <div className="flex flex-col gap-2">
                <span className="text-zinc-500 font-mono text-xs uppercase">Original Prompt</span>
                <div className="bg-pink-400/10 border border-pink-400/30 p-4 rounded-lg">
                  <p className="text-pink-400 font-black text-xl uppercase">{content.data?.prompt}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-zinc-500 font-mono text-xs uppercase">The Guess</span>
                <div className="bg-cyan-400/10 border border-cyan-400/30 p-4 rounded-lg">
                  <p className="text-cyan-400 font-black text-xl uppercase">{guess}</p>
                </div>
              </div>
            </div>
            {drawingDataUrl && (
              <div className="w-full max-w-sm mx-auto bg-white rounded-xl overflow-hidden border-4 border-zinc-800">
                <img src={drawingDataUrl} alt="Drawing" className="w-full object-contain" />
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
