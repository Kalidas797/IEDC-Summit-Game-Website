import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent, CrosswordWord } from '../../../shared/types';

interface Props { gameId: string; }

// Simple crossword grid generator
function generateCrosswordGrid(words: CrosswordWord[], gridSize: number) {
  const grid: (string | null)[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
  const placedWords: CrosswordWord[] = [];
  const sortedWords = [...words].sort((a, b) => b.word.length - a.word.length);
  let clueNumber = 1;

  for (let wi = 0; wi < sortedWords.length; wi++) {
    const word = sortedWords[wi].word.toUpperCase();
    if (word.length > gridSize) continue;

    let placed = false;

    if (placedWords.length === 0) {
      // Place first word horizontally in the middle
      const row = Math.floor(gridSize / 2);
      const col = Math.floor((gridSize - word.length) / 2);
      for (let i = 0; i < word.length; i++) grid[row][col + i] = word[i];
      placedWords.push({ ...sortedWords[wi], word, direction: 'across', startRow: row, startCol: col });
      placed = true;
    } else {
      // Try to intersect with already placed words
      for (const pw of placedWords) {
        if (placed) break;
        for (let pi = 0; pi < pw.word.length; pi++) {
          if (placed) break;
          for (let wi2 = 0; wi2 < word.length; wi2++) {
            if (pw.word[pi] !== word[wi2]) continue;

            const dir = pw.direction === 'across' ? 'down' : 'across';
            let startRow: number, startCol: number;

            if (dir === 'down') {
              startRow = (pw.startRow || 0) - wi2;
              startCol = (pw.startCol || 0) + pi;
            } else {
              startRow = (pw.startRow || 0) + pi;
              startCol = (pw.startCol || 0) - wi2;
            }

            // Check bounds
            if (startRow < 0 || startCol < 0) continue;
            if (dir === 'down' && startRow + word.length > gridSize) continue;
            if (dir === 'across' && startCol + word.length > gridSize) continue;

            // Check conflicts
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
              const r = dir === 'down' ? startRow + i : startRow;
              const c = dir === 'across' ? startCol + i : startCol;
              if (grid[r][c] !== null && grid[r][c] !== word[i]) { canPlace = false; break; }
            }
            if (!canPlace) continue;

            // Place it
            for (let i = 0; i < word.length; i++) {
              const r = dir === 'down' ? startRow + i : startRow;
              const c = dir === 'across' ? startCol + i : startCol;
              grid[r][c] = word[i];
            }
            placedWords.push({ ...sortedWords[wi], word, direction: dir, startRow, startCol });
            placed = true;
            break;
          }
        }
      }
    }
  }

  // Assign clue numbers
  const numberedGrid = grid.map(row => row.map(cell => ({ letter: cell, number: null as number | null, isBlack: cell === null })));
  clueNumber = 1;
  for (const pw of placedWords) {
    const r = pw.startRow || 0;
    const c = pw.startCol || 0;
    if (numberedGrid[r][c].number === null) {
      numberedGrid[r][c].number = clueNumber++;
    }
  }

  return { grid: numberedGrid, placedWords };
}

export default function CrosswordEditor({ gameId }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isActive, setIsActive] = useState(true);
  const [timeLimit, setTimeLimit] = useState(180);
  const [gridSize, setGridSize] = useState(10);
  const [words, setWords] = useState<CrosswordWord[]>([]);
  const [previewGrid, setPreviewGrid] = useState<any>(null);

  useEffect(() => { fetchContents(); }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const openNew = () => {
    setIsNew(true); setEditing(null);
    setTitle('New Crossword Puzzle'); setDifficulty('MEDIUM'); setIsActive(true);
    setTimeLimit(180); setGridSize(10);
    setWords([{ word: '', clue: '' }]);
    setPreviewGrid(null);
  };

  const openEdit = (c: GameContent) => {
    setIsNew(false); setEditing(c);
    setTitle(c.title); setDifficulty(c.difficulty); setIsActive(c.is_active);
    setTimeLimit(c.data?.timeLimit || 180); setGridSize(c.data?.gridSize || 10);
    setWords(c.data?.words || []); setPreviewGrid(c.data?.grid || null);
  };

  const generatePreview = () => {
    const validWords = words.filter(w => w.word.trim().length > 0);
    if (validWords.length === 0) return;
    const result = generateCrosswordGrid(validWords, gridSize);
    setPreviewGrid(result.grid);
    // Update words with placement info
    setWords(result.placedWords.map(pw => ({
      word: pw.word,
      clue: words.find(w => w.word.toUpperCase() === pw.word)?.clue || pw.clue || '',
      direction: pw.direction,
      startRow: pw.startRow,
      startCol: pw.startCol,
    })));
  };

  const save = async () => {
    const payload = {
      game_id: gameId, title, difficulty, is_active: isActive, storage_path: null,
      content_type: 'crossword-puzzle',
      data: { words, timeLimit, gridSize, grid: previewGrid },
    };
    if (editing) {
      await supabase.from('game_content').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('game_content').insert([payload]);
    }
    setEditing(null); setIsNew(false); fetchContents();
  };

  const toggleActive = async (c: GameContent) => {
    await supabase.from('game_content').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchContents();
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Delete this puzzle?')) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents();
  };

  const addWord = () => setWords([...words, { word: '', clue: '' }]);
  const removeWord = (i: number) => setWords(words.filter((_, idx) => idx !== i));
  const updateWord = (i: number, field: 'word' | 'clue', val: string) => {
    const updated = [...words]; updated[i] = { ...updated[i], [field]: val }; setWords(updated);
  };

  if (editing || isNew) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} Crossword Puzzle</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-zinc-500 hover:text-white font-mono text-sm uppercase">[Cancel]</button>
        </div>

        <input className="p-4 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={title} onChange={e => setTitle(e.target.value)} placeholder="Puzzle Title" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Difficulty</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Time Limit (s)</span>
            <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Grid Size</span>
            <input type="number" min={5} max={15} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={gridSize} onChange={e => setGridSize(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Status</span>
            <label className="flex gap-2 items-center cursor-pointer p-3 bg-black/50 border border-white/10 rounded-lg">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              <span className="font-mono text-sm text-zinc-400">{isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <h4 className="font-black uppercase text-zinc-300">Words & Clues ({words.length})</h4>
            <button onClick={addWord} className="text-cyan-400 hover:text-white font-mono text-sm flex items-center gap-1"><Plus size={14} /> Add Word</button>
          </div>
          {words.map((w, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input className="w-32 p-2 bg-black/50 border border-white/10 text-white font-mono font-bold uppercase rounded outline-none focus:border-emerald-400" value={w.word} onChange={e => updateWord(i, 'word', e.target.value)} placeholder="WORD" />
              <input className="flex-1 p-2 bg-black/50 border border-white/10 text-white font-mono text-sm rounded outline-none focus:border-cyan-400" value={w.clue} onChange={e => updateWord(i, 'clue', e.target.value)} placeholder="Clue for this word" />
              {w.direction && <span className="text-emerald-400 text-[10px] font-mono uppercase">{w.direction}</span>}
              <button onClick={() => removeWord(i)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <button onClick={generatePreview} className="btn-secondary flex items-center gap-2 self-start"><RefreshCw size={16} /> Generate Grid Preview</button>

        {previewGrid && (
          <div className="p-4 bg-black/30 border border-emerald-400/20 rounded-lg">
            <h4 className="font-black uppercase text-emerald-400 mb-3">Grid Preview</h4>
            <div className="inline-grid gap-[1px] bg-zinc-700 p-[1px]" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
              {previewGrid.flat().map((cell: any, i: number) => (
                <div key={i} className={`w-7 h-7 flex items-center justify-center text-xs font-bold relative ${cell.isBlack ? 'bg-zinc-900' : 'bg-zinc-100 text-black'}`}>
                  {cell.number && <span className="absolute top-0 left-0.5 text-[7px] text-zinc-500">{cell.number}</span>}
                  {!cell.isBlack && <span className="text-[10px]">{cell.letter}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-4 justify-end border-t border-white/10 pt-4">
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary px-8">Cancel</button>
          <button onClick={save} className="btn-primary px-8">Save Puzzle</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-wider">Crossword Puzzles</h3>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Puzzle</button>
      </div>
      {contents.length === 0 && <p className="text-zinc-600 font-mono text-center py-12 animate-pulse">No puzzles created yet</p>}
      <div className="flex flex-col gap-3">
        {contents.map(c => (
          <div key={c.id} className="admin-card flex flex-col md:flex-row gap-4 items-start md:items-center p-4">
            <div className="w-10 h-10 bg-emerald-400/20 text-emerald-400 rounded-lg flex items-center justify-center font-black text-lg">⊞</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{c.title}</h4>
              <div className="flex gap-3 text-xs text-zinc-500 font-mono mt-1">
                <span>Words: {c.data?.words?.length || 0}</span><span>•</span><span>{c.difficulty}</span><span>•</span><span>{c.data?.timeLimit}s</span>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${c.is_active ? 'bg-lime-400/20 text-lime-400 border border-lime-400/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(c)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-cyan-400"><Power size={14} /></button>
              <button onClick={() => openEdit(c)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-cyan-400"><Edit size={14} /></button>
              <button onClick={() => deleteContent(c.id)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
