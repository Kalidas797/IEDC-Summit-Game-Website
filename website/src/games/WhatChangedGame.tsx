import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent } from '../../../shared/types';

interface WhatChangedGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

interface Region { id: string; x: number; y: number; width: number; height: number; label: string; }

type Phase = 'loading' | 'error' | 'memorize' | 'recall' | 'gameover';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function WhatChangedGame({ onComplete, onExit: _onExit }: WhatChangedGameProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [content, setContent] = useState<GameContent | null>(null);
  const [memoryTimeLeft, setMemoryTimeLeft] = useState(10);
  const [recallTimeLeft, setRecallTimeLeft] = useState(45);
  const [foundRegions, setFoundRegions] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [showWrong, setShowWrong] = useState<{ x: number; y: number } | null>(null);

  const imgRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(0);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'what-changed').single();
      if (!gameData) return setPhase('error');
      const { data: contentData } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('is_active', true);
      if (!contentData || contentData.length === 0) return setPhase('error');
      const chosen = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(chosen);
      setMemoryTimeLeft(chosen.data?.memoryTime || 10);
      setRecallTimeLeft(chosen.data?.timeLimit || 45);
      setPhase('memorize');
      startTimeRef.current = performance.now();
    }
    load();
  }, []);

  // Memory phase timer
  useEffect(() => {
    if (phase !== 'memorize') return;
    if (memoryTimeLeft <= 0) { setPhase('recall'); return; }
    const timer = setTimeout(() => setMemoryTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [memoryTimeLeft, phase]);

  // Recall phase timer
  useEffect(() => {
    if (phase !== 'recall') return;
    if (recallTimeLeft <= 0) { endGame(); return; }
    const timer = setTimeout(() => setRecallTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [recallTimeLeft, phase]);

  const endGame = () => {
    setPhase('gameover');
    const totalTime = performance.now() - startTimeRef.current;
    setTimeout(() => onComplete(score, totalTime), 2500);
  };

  const handleTap = (e: React.MouseEvent) => {
    if (phase !== 'recall' || !content || !imgRef.current) return;
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
          setPhase('gameover');
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

  if (phase === 'loading') return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading Challenge...</div>;
  if (phase === 'error') return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">Module Unavailable (No Content)</div>;
  if (!content) return null;

  const regions: Region[] = content.data?.regions || [];
  const origUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.originalImagePath}`;
  const modUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.modifiedImagePath}`;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10 w-full max-w-5xl mx-auto">
      <AnimatePresence mode="wait">

        {phase === 'memorize' && (
          <motion.div key="memorize" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="flex flex-col items-center w-full h-full">
            <div className="w-full flex justify-between items-center mb-4 border-b-2 border-zinc-800 pb-3">
              <h2 className="font-mono text-lg uppercase tracking-widest text-orange-400">Memorize This Document</h2>
              <div className={`text-3xl font-black font-mono ${memoryTimeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{memoryTimeLeft}s</div>
            </div>
            <div className="flex-1 w-full bg-zinc-900 border-2 border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center">
              <img src={origUrl} alt="Original" className="max-w-full max-h-[60vh] object-contain" />
            </div>
            <p className="mt-4 text-zinc-500 font-mono text-xs uppercase tracking-widest">Study carefully — it will disappear!</p>
          </motion.div>
        )}

        {phase === 'recall' && (
          <motion.div key="recall" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center w-full h-full">
            <div className="w-full flex justify-between items-center mb-4 border-b-2 border-zinc-800 pb-3">
              <div>
                <h2 className="font-mono text-lg uppercase tracking-widest text-orange-400">What Changed?</h2>
                <p className="text-zinc-500 font-mono text-xs mt-1">Found: {foundRegions.size} / {regions.length}</p>
              </div>
              <div className={`text-3xl font-mono font-bold ${recallTimeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{recallTimeLeft}s</div>
            </div>
            <div ref={imgRef} className="flex-1 w-full bg-zinc-900 border-2 border-orange-500/30 rounded-lg overflow-hidden relative cursor-crosshair" onClick={handleTap}>
              <img src={modUrl} alt="Modified" className="w-full h-full object-contain pointer-events-none" />
              {regions.map(r => foundRegions.has(r.id) && (
                <div key={r.id} className="absolute border-2 border-lime-400 bg-lime-400/20 pointer-events-none z-10 animate-pulse" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}>
                  <span className="absolute -bottom-5 left-0 bg-lime-400 text-black text-[8px] font-bold px-1 whitespace-nowrap">{r.label}</span>
                </div>
              ))}
              {showWrong && (
                <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 2, opacity: 0 }} className="absolute w-6 h-6 border-2 border-red-500 rounded-full pointer-events-none z-20" style={{ left: `${showWrong.x * 100}%`, top: `${showWrong.y * 100}%`, transform: 'translate(-50%, -50%)' }} />
              )}
            </div>
            <p className="mt-4 text-zinc-500 font-mono text-xs tracking-widest uppercase text-center">Tap the areas you think changed</p>
          </motion.div>
        )}

        {phase === 'gameover' && (
          <motion.div key="gameover" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center">
            <h1 className="text-6xl font-black uppercase text-orange-400 mb-4">{foundRegions.size === regions.length ? 'ALL FOUND!' : 'TIME UP!'}</h1>
            <p className="text-2xl font-mono text-zinc-400">Score: {score}</p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
