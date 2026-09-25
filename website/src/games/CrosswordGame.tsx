import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent, CrosswordWord } from '../../../shared/types';

interface CrosswordGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CrosswordGame({ onComplete, onExit: _onExit }: CrosswordGameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<GameContent | null>(null);
  const [timeLeft, setTimeLeft] = useState(180);
  const [playerGrid, setPlayerGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const startTimeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase.from('games').select('id').eq('slug', 'crossword').single();
      if (!gameData) { setError(true); setLoading(false); return; }
      const { data: contentData } = await supabase.from('game_content').select('*').eq('game_id', gameData.id).eq('is_active', true);
      if (!contentData || contentData.length === 0) { setError(true); setLoading(false); return; }
      const chosen = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(chosen);
      setTimeLeft(chosen.data?.timeLimit || 180);

      // Initialize empty player grid
      const grid = chosen.data?.grid;
      if (grid) {
        setPlayerGrid(grid.map((row: any[]) => row.map((cell: any) => cell.isBlack ? '' : '')));
      }
      setLoading(false);
      startTimeRef.current = performance.now();
    }
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (loading || gameOver || error) return;
    if (timeLeft <= 0) { checkAndEnd(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, loading, gameOver, error]);

  const handleCellClick = (row: number, col: number) => {
    if (gameOver || !content?.data?.grid) return;
    const cell = content.data.grid[row][col];
    if (cell.isBlack) return;
    setSelectedCell({ row, col });
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInput = (value: string) => {
    if (!selectedCell || !content?.data?.grid) return;
    const letter = value.toUpperCase().slice(-1);
    const newGrid = [...playerGrid.map(r => [...r])];
    newGrid[selectedCell.row][selectedCell.col] = letter;
    setPlayerGrid(newGrid);

    // Auto-advance to next cell
    const gridSize = content.data.gridSize || 10;
    const grid = content.data.grid;
    for (let c = selectedCell.col + 1; c < gridSize; c++) {
      if (!grid[selectedCell.row][c].isBlack) {
        setSelectedCell({ row: selectedCell.row, col: c });
        return;
      }
    }
  };

  const checkAndEnd = () => {
    if (!content?.data?.grid) return;
    const grid = content.data.grid;
    let correct = 0;
    let total = 0;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!grid[r][c].isBlack && grid[r][c].letter) {
          total++;
          if (playerGrid[r]?.[c]?.toUpperCase() === grid[r][c].letter?.toUpperCase()) correct++;
        }
      }
    }
    const finalScore = total > 0 ? Math.round((correct / total) * 1000) : 0;
    setScore(finalScore);
    setGameOver(true);
    const totalTime = performance.now() - startTimeRef.current;
    setTimeout(() => onComplete(finalScore, totalTime), 3000);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">Loading Puzzle...</div>;
  if (error || !content?.data?.grid) return <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">Module Unavailable (No Puzzles)</div>;

  const grid = content.data.grid;
  const gridSize = content.data.gridSize || 10;
  const words: CrosswordWord[] = content.data.words || [];
  const acrossWords = words.filter(w => w.direction === 'across');
  const downWords = words.filter(w => w.direction === 'down');

  return (
    <div className="flex-1 flex flex-col md:flex-row items-start justify-center gap-6 p-4 md:p-8 relative z-10 w-full max-w-6xl mx-auto">
      {gameOver && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 bg-zinc-950/90 flex flex-col items-center justify-center">
          <h1 className="text-6xl font-black uppercase text-emerald-400 mb-4">Puzzle Complete!</h1>
          <p className="text-2xl font-mono text-zinc-400">Score: {score}</p>
        </motion.div>
      )}

      {/* Hidden input for mobile keyboard */}
      <input ref={inputRef} type="text" className="absolute opacity-0 w-0 h-0" value="" onChange={e => handleInput(e.target.value)} autoCapitalize="characters" />

      {/* Grid */}
      <div className="flex flex-col items-center">
        <div className="flex justify-between w-full items-center mb-3">
          <h2 className="text-lg font-black uppercase text-emerald-400 tracking-widest">{content.title}</h2>
          <span className={`text-xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
        <div className="inline-grid gap-[1px] bg-zinc-700 p-[1px] border-2 border-emerald-900/50" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {grid.map((row: any[], ri: number) =>
            row.map((cell: any, ci: number) => (
              <div
                key={`${ri}-${ci}`}
                onClick={() => handleCellClick(ri, ci)}
                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-lg font-black uppercase relative transition-colors ${
                  cell.isBlack
                    ? 'bg-zinc-900'
                    : selectedCell?.row === ri && selectedCell?.col === ci
                    ? 'bg-emerald-200 text-black cursor-pointer'
                    : 'bg-zinc-100 text-black cursor-pointer hover:bg-emerald-100'
                }`}
              >
                {cell.number && <span className="absolute top-0 left-0.5 text-[7px] font-mono leading-none text-zinc-500">{cell.number}</span>}
                {!cell.isBlack && (playerGrid[ri]?.[ci] || '')}
              </div>
            ))
          )}
        </div>
        <button onClick={checkAndEnd} className="mt-4 btn-primary bg-emerald-500 text-zinc-950 w-full py-3">Submit Puzzle</button>
      </div>

      {/* Clues */}
      <div className="w-full md:w-72 flex flex-col gap-4">
        {acrossWords.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
            <h3 className="text-emerald-400 font-mono font-bold text-xs tracking-widest uppercase border-b border-zinc-800 pb-2 mb-3">Across</h3>
            <ol className="text-zinc-300 font-mono text-xs space-y-2">
              {acrossWords.map((w, i) => (
                <li key={i}><span className="text-emerald-500 mr-2 font-bold">{i + 1}.</span>{w.clue}</li>
              ))}
            </ol>
          </div>
        )}
        {downWords.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
            <h3 className="text-emerald-400 font-mono font-bold text-xs tracking-widest uppercase border-b border-zinc-800 pb-2 mb-3">Down</h3>
            <ol className="text-zinc-300 font-mono text-xs space-y-2">
              {downWords.map((w, i) => (
                <li key={i}><span className="text-emerald-500 mr-2 font-bold">{i + 1}.</span>{w.clue}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
