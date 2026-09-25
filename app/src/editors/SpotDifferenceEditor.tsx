import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import AssetUploader from '../components/AssetUploader';
import DifferenceMarkerEditor from '../components/DifferenceMarkerEditor';
import type { GameContent, DifferenceRegion } from '../../../shared/types';

interface Props { gameId: string; gameType: 'spot-difference' | 'what-changed'; }

export default function SpotDifferenceEditor({ gameId, gameType }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isActive, setIsActive] = useState(true);
  const [originalPath, setOriginalPath] = useState<string | null>(null);
  const [modifiedPath, setModifiedPath] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState(45);
  const [memoryTime, setMemoryTime] = useState(10);
  const [regions, setRegions] = useState<DifferenceRegion[]>([]);

  const isWhatChanged = gameType === 'what-changed';
  const label = isWhatChanged ? 'What Changed' : 'Spot the Difference';

  useEffect(() => { fetchContents(); }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const openNew = () => {
    setIsNew(true); setEditing(null);
    setTitle(`New ${label} Challenge`);
    setDifficulty('MEDIUM'); setIsActive(true);
    setOriginalPath(null); setModifiedPath(null);
    setTimeLimit(45); setMemoryTime(10); setRegions([]);
  };

  const openEdit = (c: GameContent) => {
    setIsNew(false); setEditing(c);
    setTitle(c.title); setDifficulty(c.difficulty); setIsActive(c.is_active);
    setOriginalPath(c.data?.originalImagePath || null);
    setModifiedPath(c.data?.modifiedImagePath || null);
    setTimeLimit(c.data?.timeLimit || 45);
    setMemoryTime(c.data?.memoryTime || 10);
    setRegions(c.data?.regions || []);
  };

  const save = async () => {
    const payload = {
      game_id: gameId, title, difficulty, is_active: isActive,
      storage_path: originalPath,
      content_type: `${gameType}-challenge`,
      data: { originalImagePath: originalPath, modifiedImagePath: modifiedPath, timeLimit, regions, ...(isWhatChanged ? { memoryTime } : {}) },
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
    if (!confirm('Delete this challenge?')) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents();
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const getImgUrl = (path: string | null) => path ? `${supabaseUrl}/storage/v1/object/public/game-documents/${path}` : '';

  if (editing || isNew) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} {label} Challenge</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-zinc-500 hover:text-white font-mono text-sm uppercase">[Cancel]</button>
        </div>

        <input className="p-4 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={title} onChange={e => setTitle(e.target.value)} placeholder="Challenge Title" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Difficulty</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">{isWhatChanged ? 'Guess Time (seconds)' : 'Time Limit (seconds)'}</span>
            <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={timeLimit} onChange={e => setTimeLimit(Number(e.target.value))} />
          </div>
          {isWhatChanged && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Memory Time (seconds)</span>
              <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={memoryTime} onChange={e => setMemoryTime(Number(e.target.value))} />
            </div>
          )}
        </div>

        <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-lg">
          <label className="flex gap-2 items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Active</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetUploader bucket="game-documents" currentPath={originalPath} onUpload={setOriginalPath} onRemove={() => setOriginalPath(null)} label="Original Image" />
          <AssetUploader bucket="game-documents" currentPath={modifiedPath} onUpload={setModifiedPath} onRemove={() => setModifiedPath(null)} label="Modified Image" />
        </div>

        {originalPath && modifiedPath && (
          <div className="mt-4 p-4 bg-black/30 border border-cyan-400/20 rounded-lg">
            <h4 className="font-black uppercase text-cyan-400 mb-4 tracking-wider">Mark Differences</h4>
            <DifferenceMarkerEditor
              originalImageUrl={getImgUrl(originalPath)}
              modifiedImageUrl={getImgUrl(modifiedPath)}
              regions={regions}
              onChange={setRegions}
            />
          </div>
        )}

        <div className="flex gap-4 mt-4 justify-end border-t border-white/10 pt-4">
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary px-8">Cancel</button>
          <button onClick={save} className="btn-primary px-8">Save Challenge</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-wider">{label} Challenges</h3>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Challenge</button>
      </div>
      {contents.length === 0 && <p className="text-zinc-600 font-mono text-center py-12 animate-pulse">No challenges created yet</p>}
      <div className="flex flex-col gap-3">
        {contents.map(c => (
          <div key={c.id} className="admin-card flex flex-col md:flex-row gap-4 items-start md:items-center p-4">
            <div className="flex gap-2">
              {c.data?.originalImagePath && <img src={getImgUrl(c.data.originalImagePath)} alt="" className="w-16 h-12 object-cover rounded border border-white/10 bg-zinc-900" />}
              {c.data?.modifiedImagePath && <img src={getImgUrl(c.data.modifiedImagePath)} alt="" className="w-16 h-12 object-cover rounded border border-red-500/30 bg-zinc-900" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white truncate">{c.title}</h4>
              <div className="flex gap-3 text-xs text-zinc-500 font-mono mt-1">
                <span>Differences: {c.data?.regions?.length || 0}</span><span>•</span><span>{c.difficulty}</span><span>•</span><span>{c.data?.timeLimit || 0}s</span>
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
