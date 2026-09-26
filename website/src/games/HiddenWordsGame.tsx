import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import type { HiddenWordsContentData, HiddenWordPlacement } from '../../../shared/types';

interface HiddenWordsGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

interface Pos { row: number, col: number }

export default function HiddenWordsGame({ onComplete, onExit }: HiddenWordsGameProps) {
  const [content, setContent] = useState<HiddenWordsContentData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Pos[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  const [startTime, setStartTime] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPuzzle();
  }, []);

  const fetchPuzzle = async () => {
    try {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'crossword').single();
      if (!gameData) return onExit();

      const { data: contentData } = await supabase.from('game_content')
        .select('*')
        .eq('game_id', gameData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!contentData) {
        alert("No active Hidden Words puzzle available.");
        return onExit();
      }

      const data = contentData.data as unknown as HiddenWordsContentData;
      setContent(data);
      setTimeLeft(data.timeLimit || 60);
      setStartTime(Date.now());
      setLoading(false);
    } catch (err) {
      console.error(err);
      onExit();
    }
  };

  useEffect(() => {
    if (loading || !content || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading, content, timeLeft]);

  const handleTimeUp = () => {
    const elapsed = Date.now() - startTime;
    onComplete(score, elapsed);
  };

  const handlePointerDown = (row: number, col: number, e: React.PointerEvent) => {
    if (e.target instanceof HTMLElement) e.target.releasePointerCapture(e.pointerId);
    setIsDragging(true);
    setSelection([{ row, col }]);
  };

  const handlePointerEnter = (row: number, col: number) => {
    if (!isDragging) return;
    const start = selection[0];
    const path = calculatePath(start, { row, col });
    setSelection(path);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    validateSelection();
  };

  const calculatePath = (start: Pos, end: Pos): Pos[] => {
    const dr = end.row - start.row;
    const dc = end.col - start.col;
    if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [start];

    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    if (steps === 0) return [start];

    const rStep = dr / steps;
    const cStep = dc / steps;

    const path: Pos[] = [];
    for (let i = 0; i <= steps; i++) {
      path.push({ row: start.row + (rStep * i), col: start.col + (cStep * i) });
    }
    return path;
  };

  const validateSelection = () => {
    if (!content || selection.length < 2) {
      setSelection([]);
      return;
    }
    
    const wordStr = selection.map(p => content.grid[p.row][p.col]).join('');
    const reverseStr = wordStr.split('').reverse().join('');

    let matchedPlacement: HiddenWordPlacement | null = null;
    
    for (const p of content.placements) {
      if (foundWords.has(p.word)) continue;
      if (p.word === wordStr || p.word === reverseStr) {
        const p1 = selection[0];
        const p2 = selection[selection.length - 1];
        const targetP1 = p.positions[0];
        const targetP2 = p.positions[p.positions.length - 1];
        
        const matchFwd = (p1.row === targetP1.row && p1.col === targetP1.col && p2.row === targetP2.row && p2.col === targetP2.col);
        const matchRev = (p1.row === targetP2.row && p1.col === targetP2.col && p2.row === targetP1.row && p2.col === targetP1.col);
        
        if (matchFwd || matchRev) {
          matchedPlacement = p;
          break;
        }
      }
    }

    if (matchedPlacement) {
      const newFound = new Set(foundWords);
      newFound.add(matchedPlacement.word);
      setFoundWords(newFound);
      
      const newScore = score + 100;
      setScore(newScore);

      if (newFound.size === content.words.length) {
        setTimeout(() => onComplete(newScore, Date.now() - startTime), 1500);
      }
    }
    setSelection([]);
  };

  const isSelected = (r: number, c: number) => selection.some(p => p.row === r && p.col === c);
  const isFound = (r: number, c: number) => {
    if (!content) return false;
    for (const p of content.placements) {
      if (foundWords.has(p.word)) {
        if (p.positions.some(pos => pos.row === r && pos.col === c)) return true;
      }
    }
    return false;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full"
        />
      </div>
    );
  }

  if (!content) return null;

  const progress = foundWords.size / content.words.length;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-white p-2 sm:p-4 md:p-8 lg:p-12 z-50">
      
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-cyan-600/20 rounded-full blur-[80px] md:blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-1/4 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-indigo-600/20 rounded-full blur-[60px] md:blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header Panel */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-end mb-4 md:mb-8 gap-4 md:gap-6 glass-panel rounded-2xl md:rounded-3xl p-4 md:p-8 border border-white/10 shadow-2xl shrink-0"
      >
        <div className="text-center md:text-left w-full md:w-auto">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            Hidden Words
          </h2>
          <div className="mt-4 w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-zinc-400 text-xs md:text-sm mt-2 md:mt-3 uppercase tracking-widest font-bold">
            {foundWords.size} / {content.words.length} Words Found
          </p>
        </div>
        
        <div className="flex gap-4 md:gap-8 items-center bg-black/40 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl border border-white/5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex flex-col items-start md:items-end">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Time Remaining</span>
            <div className="text-2xl md:text-3xl font-black font-mono flex items-center gap-1 md:gap-2">
              <Clock size={18} className={timeLeft < 15 ? 'text-red-400 animate-pulse' : 'text-cyan-400'} /> 
              <span className={timeLeft < 15 ? 'text-red-400' : 'text-white'}>
                {content.timeLimit > 1000 ? '∞' : `${timeLeft}s`}
              </span>
            </div>
          </div>
          <div className="w-px h-8 md:h-12 bg-white/10" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Score</span>
            <motion.div 
              key={score}
              initial={{ scale: 1.5, color: '#22d3ee' }}
              animate={{ scale: 1, color: '#ffffff' }}
              className="text-2xl md:text-3xl font-black font-mono text-primary drop-shadow-[0_0_15px_rgba(163,230,53,0.3)]"
            >
              {score}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-4 md:gap-10 min-h-0 z-10 relative">
        
        {/* Game Grid Container */}
        <div 
          className="flex-shrink-0 md:flex-1 relative touch-none select-none flex items-center justify-center p-2 sm:p-4 md:p-8 rounded-2xl md:rounded-[40px] bg-white/[0.02] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-3xl overflow-hidden aspect-square md:aspect-auto max-h-[50vh] md:max-h-none"
          ref={gridRef}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Subtle grid background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.05)_0%,_transparent_70%)]" />

          <div 
            className="grid gap-[2px] sm:gap-1 md:gap-2 mx-auto w-full h-full max-w-md md:max-w-3xl aspect-square relative z-10"
            style={{ gridTemplateColumns: `repeat(${content.gridSize}, minmax(0, 1fr))` }}
          >
            {content.grid.map((row, rIndex) => 
              row.map((cell, cIndex) => {
                const selected = isSelected(rIndex, cIndex);
                const found = isFound(rIndex, cIndex);
                
                return (
                  <motion.div
                    key={`${rIndex}-${cIndex}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (rIndex * 0.02) + (cIndex * 0.02), duration: 0.4 }}
                    onPointerDown={(e) => handlePointerDown(rIndex, cIndex, e)}
                    onPointerEnter={() => handlePointerEnter(rIndex, cIndex)}
                    className={`
                      relative flex items-center justify-center font-bold text-sm sm:text-lg md:text-2xl 
                      rounded sm:rounded-lg md:rounded-2xl cursor-crosshair select-none touch-none
                      transition-all duration-200
                      ${selected ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-[0_0_15px_rgba(34,211,238,0.6)] md:shadow-[0_0_25px_rgba(34,211,238,0.6)] z-20 scale-110 border-none font-black' : ''}
                      ${found && !selected ? 'bg-white/10 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.15)] font-black' : ''}
                      ${!selected && !found ? 'bg-black/40 text-zinc-400 border border-white/5 hover:bg-white/5 hover:border-white/20 hover:text-white hover:scale-105' : ''}
                    `}
                  >
                    {cell}
                    {found && !selected && (
                      <div className="absolute inset-0 rounded-2xl bg-cyan-400/10 animate-pulse" />
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar / Hints */}
        <div className="w-full md:w-80 flex flex-col gap-4 md:gap-6 flex-1 min-h-[200px] md:min-h-0 overflow-hidden shrink-0">
          <div className="bg-white/[0.03] border border-white/10 p-4 md:p-8 rounded-2xl md:rounded-[40px] flex-1 flex flex-col shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            {/* Sidebar flare */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />

            {content.showHints ? (
              <>
                <h3 className="font-black text-lg md:text-2xl uppercase tracking-widest mb-4 md:mb-8 flex items-center gap-2 md:gap-3 text-white shrink-0">
                  <Sparkles size={20} className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" /> Targets
                </h3>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 md:space-y-3 custom-scrollbar relative z-10">
                  <AnimatePresence>
                    {content.words.map((w, idx) => {
                      const isWFound = foundWords.has(w);
                      return (
                        <motion.div 
                          key={idx} 
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`
                            group relative overflow-hidden font-bold text-sm md:text-lg tracking-widest flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 border
                            ${isWFound 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                              : 'bg-black/40 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white'}
                          `}
                        >
                          <span className={`relative z-10 ${isWFound ? 'opacity-50' : ''}`}>
                            {w}
                            {isWFound && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="absolute top-1/2 left-0 h-[2px] bg-emerald-400 origin-left"
                              />
                            )}
                          </span>
                          <div className="relative z-10">
                            {isWFound ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 200 }}
                              >
                                <CheckCircle2 size={24} className="text-emerald-400" />
                              </motion.div>
                            ) : (
                              <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </div>
                          
                          {/* Success gradient background fill */}
                          {isWFound && (
                            <motion.div 
                              initial={{ x: '-100%' }}
                              animate={{ x: '0%' }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center relative z-10 p-6">
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles size={64} className="text-cyan-500/30 mb-6 drop-shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
                </motion.div>
                <h3 className="font-black text-2xl uppercase tracking-widest text-white mb-3">Find the Words</h3>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">Hints are disabled by the administrator. Can you discover them all?</p>
                
                <div className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 shadow-inner">
                  <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Progress</div>
                  <div className="font-black text-5xl bg-clip-text text-transparent bg-gradient-to-b from-cyan-400 to-blue-500">
                    {foundWords.size} <span className="text-2xl text-zinc-600">/ {content.words.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
