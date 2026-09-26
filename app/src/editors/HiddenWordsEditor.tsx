import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power, RefreshCw, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent, HiddenWordsContentData, HiddenWordPlacement } from '../../../shared/types';

interface Props { gameId: string; }

// Directions: [row_delta, col_delta]
const DIRECTION_MAP: Record<string, [number, number]> = {
  'horizontal': [0, 1],
  'vertical': [1, 0],
  'diagonal': [1, 1],
  'reverse-horizontal': [0, -1],
  'reverse-vertical': [-1, 0],
  'reverse-diagonal': [-1, -1]
};

function generateHiddenWordsGrid(words: string[], gridSize: number, allowedDirections: string[]) {
  const grid: string[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
  const placements: HiddenWordPlacement[] = [];
  
  // Sort words by length descending to place biggest first
  const sortedWords = [...words].sort((a, b) => b.length - a.length);

  for (const w of sortedWords) {
    const word = w.toUpperCase().replace(/[^A-Z]/g, '');
    if (!word) continue;
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 200) {
      attempts++;
      const dirName = allowedDirections[Math.floor(Math.random() * allowedDirections.length)] || 'horizontal';
      const [dr, dc] = DIRECTION_MAP[dirName];
      
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);
      
      const endRow = startRow + dr * (word.length - 1);
      const endCol = startCol + dc * (word.length - 1);
      
      if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
      
      let canPlace = true;
      for (let i = 0; i < word.length; i++) {
        const r = startRow + dr * i;
        const c = startCol + dc * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          canPlace = false;
          break;
        }
      }
      
      if (canPlace) {
        const positions = [];
        for (let i = 0; i < word.length; i++) {
          const r = startRow + dr * i;
          const c = startCol + dc * i;
          grid[r][c] = word[i];
          positions.push({ row: r, col: c });
        }
        placements.push({ word, startRow, startCol, direction: dirName, positions });
        placed = true;
      }
    }
    
    if (!placed) {
      alert(`Warning: Could not place word "${word}" in a ${gridSize}x${gridSize} grid. Please try regenerating or increase grid size.`);
    }
  }

  // Fill empty spaces with random letters
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placements };
}

export default function HiddenWordsEditor({ gameId }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isActive, setIsActive] = useState(true);
  
  // Game specific state
  const [words, setWords] = useState<string[]>([]);
  const [newWord, setNewWord] = useState('');
  const [gridSize, setGridSize] = useState(10);
  const [timeLimit, setTimeLimit] = useState(60);
  const [showHints, setShowHints] = useState(true);
  const [allowedDirections, setAllowedDirections] = useState<string[]>(['horizontal', 'vertical']);
  
  const [previewGrid, setPreviewGrid] = useState<string[][] | null>(null);
  const [previewPlacements, setPreviewPlacements] = useState<HiddenWordPlacement[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchContents();
  }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const handleCreateNew = () => {
    setEditing(null); setIsNew(true);
    setTitle('New Hidden Words Puzzle'); setDifficulty('MEDIUM'); setIsActive(true);
    setWords([]); setGridSize(10); setTimeLimit(60); setShowHints(true);
    setAllowedDirections(['horizontal', 'vertical']);
    setPreviewGrid(null); setPreviewPlacements([]); setShowPreview(false);
  };

  const handleEdit = (c: GameContent) => {
    setEditing(c); setIsNew(false);
    setTitle(c.title); setDifficulty(c.difficulty); setIsActive(c.is_active);
    
    const data = c.data as unknown as HiddenWordsContentData;
    setWords(data.words || []);
    setGridSize(data.gridSize || 10);
    setTimeLimit(data.timeLimit || 60);
    setShowHints(data.showHints ?? true);
    setAllowedDirections(data.allowedDirections || ['horizontal', 'vertical']);
    setPreviewGrid(data.grid || null);
    setPreviewPlacements(data.placements || []);
    setShowPreview(false);
  };

  const addWord = () => {
    const w = newWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (w && !words.includes(w) && w.length <= gridSize) {
      setWords([...words, w]);
      setNewWord('');
    }
  };

  const removeWord = (idx: number) => {
    setWords(words.filter((_, i) => i !== idx));
  };

  const toggleDirection = (dir: string) => {
    if (allowedDirections.includes(dir)) {
      setAllowedDirections(allowedDirections.filter(d => d !== dir));
    } else {
      setAllowedDirections([...allowedDirections, dir]);
    }
  };

  const handleRegenerate = () => {
    if (words.length === 0) return alert("Add at least one word.");
    if (allowedDirections.length === 0) return alert("Select at least one allowed direction.");
    
    const { grid, placements } = generateHiddenWordsGrid(words, gridSize, allowedDirections);
    setPreviewGrid(grid);
    setPreviewPlacements(placements);
  };

  const handleSave = async () => {
    if (words.length === 0) return alert('Add at least one word');
    if (!previewGrid || previewPlacements.length === 0) return alert('Please generate the grid first');

    const dataPayload: HiddenWordsContentData = {
      words,
      gridSize,
      timeLimit,
      showHints,
      allowedDirections,
      grid: previewGrid,
      placements: previewPlacements
    };

    if (isNew) {
      await supabase.from('game_content').insert([{
        game_id: gameId,
        title,
        difficulty,
        is_active: isActive,
        content_type: 'hidden-words',
        data: dataPayload
      }]);
    } else if (editing) {
      await supabase.from('game_content').update({
        title,
        difficulty,
        is_active: isActive,
        data: dataPayload
      }).eq('id', editing.id);
    }
    setEditing(null); setIsNew(false);
    fetchContents();
  };

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('game_content').update({ is_active: !current }).eq('id', id);
    fetchContents();
  };
  const deleteContent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this puzzle?")) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents();
  };

  const isWordCell = (r: number, c: number) => {
    return previewPlacements.some(p => p.positions.some(pos => pos.row === r && pos.col === c));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Hidden Words</h2>
          <p className="text-zinc-400 mt-1">Create word-search puzzles by hiding admin-defined words inside a randomized letter grid.</p>
        </div>
        {!isNew && !editing && (
          <button onClick={handleCreateNew} className="bg-primary text-black px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-white transition-colors">
            <Plus size={20} /> Create Puzzle
          </button>
        )}
      </div>

      {(isNew || editing) ? (
        <div className="bg-zinc-900/80 p-8 rounded-2xl border border-white/10 space-y-8">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} Puzzle</h3>
            <button onClick={() => {setEditing(null); setIsNew(false)}} className="text-zinc-500 hover:text-white uppercase text-sm font-bold tracking-widest transition-colors">Cancel</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Puzzle Name</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary" placeholder="e.g. PaperLab Hidden Words #1" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Difficulty</label>
              <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary">
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Grid Size</label>
              <select value={gridSize} onChange={e => setGridSize(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary">
                <option value="8">8 x 8</option>
                <option value="10">10 x 10</option>
                <option value="12">12 x 12</option>
                <option value="15">15 x 15</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Time Limit (Seconds)</label>
              <select value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))} className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary">
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="90">90 seconds</option>
                <option value="999999">No Limit</option>
              </select>
            </div>

            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Allowed Directions</label>
              <div className="flex flex-wrap gap-4">
                {['horizontal', 'vertical', 'diagonal', 'reverse-horizontal', 'reverse-vertical', 'reverse-diagonal'].map(dir => (
                  <label key={dir} className="flex items-center gap-2 text-sm text-zinc-300">
                    <input 
                      type="checkbox" 
                      checked={allowedDirections.includes(dir)}
                      onChange={() => toggleDirection(dir)}
                      className="accent-primary"
                    />
                    {dir.replace('-', ' ').toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 col-span-1 md:col-span-2 border-t border-white/5 pt-6 mt-2">
              <div className="flex items-center justify-between bg-black/40 p-5 rounded-xl border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    Player Word Hints
                  </h4>
                  <p className="text-zinc-500 text-xs mt-1">If enabled, players will see the list of words to find.</p>
                </div>
                <button
                  onClick={() => setShowHints(!showHints)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${showHints ? 'bg-primary' : 'bg-zinc-700'}`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 ${showHints ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-white/5 pt-6">
            <h4 className="font-bold text-primary uppercase tracking-widest">Target Words</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter target word..."
                value={newWord}
                onChange={e => setNewWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && addWord()}
                className="flex-1 bg-black/50 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-primary"
              />
              <button onClick={addWord} className="bg-zinc-800 hover:bg-zinc-700 p-3 rounded-lg transition-colors"><Plus /></button>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              {words.map((w, idx) => (
                <div key={idx} className="bg-black/50 border border-white/10 px-4 py-2 rounded-full flex items-center gap-3">
                  <span className="font-mono font-bold tracking-widest">{w}</span>
                  <button onClick={() => removeWord(idx)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                </div>
              ))}
              {words.length === 0 && <span className="text-zinc-600 text-sm italic">No target words added.</span>}
            </div>
          </div>

          <div className="space-y-4 border-t border-white/5 pt-6">
             <div className="flex gap-4">
               <button onClick={handleRegenerate} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
                 <RefreshCw size={20} /> GENERATE GRID
               </button>
               {previewGrid && (
                 <button onClick={() => setShowPreview(!showPreview)} className="bg-zinc-800 text-white hover:bg-zinc-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors">
                   <Eye size={20} /> {showPreview ? 'HIDE PREVIEW' : 'SHOW PREVIEW'}
                 </button>
               )}
             </div>

             {showPreview && previewGrid && (
               <div className="bg-black/50 p-6 rounded-xl border border-white/10 mt-6 max-w-md">
                 <h4 className="text-primary font-bold uppercase tracking-widest mb-4 text-center">Admin Preview</h4>
                 <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                   {previewGrid.map((row, rIndex) => 
                     row.map((cell, cIndex) => {
                       const isTarget = isWordCell(rIndex, cIndex);
                       return (
                         <div 
                           key={`${rIndex}-${cIndex}`} 
                           className={`aspect-square flex items-center justify-center font-mono font-bold text-sm rounded ${isTarget ? 'bg-primary text-black' : 'text-zinc-600 bg-zinc-900/50'}`}
                         >
                           {cell}
                         </div>
                       );
                     })
                   )}
                 </div>
               </div>
             )}
          </div>

          <div className="flex justify-end pt-6 border-t border-white/10">
            <button onClick={handleSave} className="bg-primary text-black font-black uppercase tracking-widest text-lg px-12 py-4 rounded-xl hover:bg-white hover:scale-105 transition-all">
              {isNew ? 'Save & Publish' : 'Update Puzzle'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-xl font-black uppercase tracking-wider">Hidden Words Puzzles</h3>
          </div>
          <div className="p-4 space-y-2">
            {contents.length === 0 ? (
              <div className="text-center p-8 text-zinc-500">No puzzles found. Create one above.</div>
            ) : (
              contents.map(c => {
                const data = c.data as unknown as HiddenWordsContentData;
                return (
                  <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/40 p-4 rounded-xl border border-white/5 gap-4">
                    <div>
                      <h4 className="font-bold text-lg">{c.title}</h4>
                      <div className="flex flex-wrap gap-3 text-xs font-mono text-zinc-400 mt-2">
                        <span className={`px-2 py-1 rounded bg-white/5 ${c.difficulty === 'HARD' ? 'text-red-400' : c.difficulty === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'}`}>{c.difficulty}</span>
                        <span className="px-2 py-1 rounded bg-white/5">{data.gridSize} x {data.gridSize}</span>
                        <span className="px-2 py-1 rounded bg-white/5">{data.words?.length || 0} WORDS</span>
                        <span className="px-2 py-1 rounded bg-white/5">{data.timeLimit > 1000 ? 'NO LIMIT' : `${data.timeLimit}s`}</span>
                        <span className={`px-2 py-1 rounded ${data.showHints ? 'bg-cyan-500/20 text-cyan-400' : 'bg-red-500/20 text-red-400'}`}>HINTS: {data.showHints ? 'ON' : 'OFF'}</span>
                        <span className={`px-2 py-1 rounded ${c.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{c.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(c)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"><Edit size={18} /></button>
                      <button onClick={() => toggleStatus(c.id, c.is_active)} className={`p-3 rounded-lg transition-colors ${c.is_active ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                        <Power size={18} />
                      </button>
                      <button onClick={() => deleteContent(c.id)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
