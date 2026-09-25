import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent } from '../../../shared/types';

interface SpotDifferenceGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

interface Region { id: string; x: number; y: number; width: number; height: number; label: string; }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SpotDifferenceGame({ onComplete, onExit: _onExit }: SpotDifferenceGameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<GameContent | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [foundRegions, setFoundRegions] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [showWrong, setShowWrong] = useState<{ x: number; y: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);

  const imgRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'spot-difference').single();
      if (!gameData) { setError(true); setLoading(false); return; }
      const { data: contentData } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('is_active', true);
      if (!contentData || contentData.length === 0) { setError(true); setLoading(false); return; }
      const chosen = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(chosen);
      setTimeLeft(chosen.data?.timeLimit || 45);
      setLoading(false);
      startTimeRef.current = performance.now();
    }
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || gameOver || error) return;
    if (timeLeft <= 0) { endGame(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, loading, gameOver, error]);

  const endGame = () => {
    setGameOver(true);
    const totalTime = performance.now() - startTimeRef.current;
    setTimeout(() => onComplete(score, totalTime), 2500);
  };

  const handleTap = (e: React.MouseEvent, _side: 'original' | 'modified') => {
    if (gameOver || !content || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    const regions: Region[] = content.data?.regions || [];
    let found = false;

    for (const region of regions) {
      if (foundRegions.has(region.id)) continue;
      if (normX >= region.x && normX <= region.x + region.width && normY >= region.y && normY <= region.y + region.height) {
        const newFound = new Set(foundRegions);
        newFound.add(region.id);
        setFoundRegions(newFound);
        const newScore = score + 200;
        setScore(newScore);
        found = true;

        if (newFound.size === regions.length) {
          setScore(newScore);
          setGameOver(true);
          const totalTime = performance.now() - startTimeRef.current;
          setTimeout(() => onComplete(newScore, totalTime), 2500);
        }
        break;
      }
    }

    if (!found) {
      setShowWrong({ x: normX, y: normY });
      setTimeout(() => setShowWrong(null), 500);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading Challenge...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">Module Unavailable (No Content)</div>;
  if (!content) return null;

  const regions: Region[] = content.data?.regions || [];
  const origUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.originalImagePath}`;
  const modUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.modifiedImagePath}`;

  const renderOverlay = () => (
    <>
      {regions.map(r => foundRegions.has(r.id) && (
        <div key={r.id} className="absolute border-2 border-lime-400 bg-lime-400/20 pointer-events-none z-10 animate-pulse" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}>
          <span className="absolute -bottom-5 left-0 bg-lime-400 text-black text-[8px] font-bold px-1 whitespace-nowrap">{r.label}</span>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 relative z-10 w-full max-w-7xl mx-auto">
      <header className="flex justify-between w-full items-center mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black uppercase text-red-400 tracking-widest">Spot the Difference</h2>
          <p className="text-zinc-500 font-mono text-xs uppercase mt-1">Found: {foundRegions.size} / {regions.length}</p>
        </div>
        <div className={`text-3xl font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </header>

      {gameOver && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 bg-zinc-950/90 flex flex-col items-center justify-center">
          <h1 className="text-6xl font-black uppercase text-lime-400 mb-4">{foundRegions.size === regions.length ? 'ALL FOUND!' : 'TIME UP!'}</h1>
          <p className="text-2xl font-mono text-zinc-400">Score: {score}</p>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row gap-4 flex-1">
        {/* Original */}
        <div className="flex-1 relative bg-zinc-900 border-2 border-zinc-800 rounded-lg overflow-hidden cursor-crosshair" onClick={(e) => handleTap(e, 'original')}>
          <img src={origUrl} alt="Original" className="w-full h-full object-contain pointer-events-none" />
          {renderOverlay()}
          <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 text-zinc-400 font-mono text-[10px] uppercase tracking-widest border border-zinc-800">Original</div>
        </div>

        {/* Modified */}
        <div ref={imgRef} className="flex-1 relative bg-zinc-900 border-2 border-red-900/50 rounded-lg overflow-hidden cursor-crosshair" onClick={(e) => handleTap(e, 'modified')}>
          <img src={modUrl} alt="Modified" className="w-full h-full object-contain pointer-events-none" />
          {renderOverlay()}
          {showWrong && (
            <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} className="absolute w-6 h-6 border-2 border-red-500 rounded-full pointer-events-none z-20" style={{ left: `${showWrong.x * 100}%`, top: `${showWrong.y * 100}%`, transform: 'translate(-50%, -50%)' }} />
          )}
          <div className="absolute top-2 left-2 bg-red-950/80 px-2 py-1 text-red-400 font-mono text-[10px] uppercase tracking-widest border border-red-900">Modified</div>
        </div>
      </div>

      <p className="mt-4 text-zinc-500 font-mono text-xs tracking-widest uppercase text-center">
        Tap the differences you spot on either image
      </p>
    </div>
  );
}
