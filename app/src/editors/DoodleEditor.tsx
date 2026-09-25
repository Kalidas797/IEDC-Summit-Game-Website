import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function DoodleEditor({ gameId }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('EASY');
  const [isActive, setIsActive] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Random');
  const [drawingTime, setDrawingTime] = useState(30);
  const [rounds, setRounds] = useState(2);

  useEffect(() => { fetchContents(); }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const openNew = () => {
    setIsNew(true); setEditing(null);
    setTitle('New Doodle Prompt'); setDifficulty('EASY'); setIsActive(true);
    setPrompt(''); setCategory('Random'); setDrawingTime(30); setRounds(2);
  };

  const openEdit = (c: GameContent) => {
    setIsNew(false); setEditing(c);
    setTitle(c.title); setDifficulty(c.difficulty); setIsActive(c.is_active);
    setPrompt(c.data?.prompt || ''); setCategory(c.data?.category || 'Random');
    setDrawingTime(c.data?.drawingTime || 30); setRounds(c.data?.rounds || 2);
  };

  const save = async () => {
    const payload = {
      game_id: gameId, title, difficulty, is_active: isActive, storage_path: null,
      content_type: 'doodle-prompt',
      data: { prompt, category, drawingTime, rounds },
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
    if (!confirm('Delete this prompt?')) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents();
  };

  const categories = ['Random', 'Funny', 'Animals', 'College', 'Tech', 'Food', 'Movies', 'Sports'];

  if (editing || isNew) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} Doodle Prompt</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-zinc-500 hover:text-white font-mono text-sm uppercase">[Cancel]</button>
        </div>

        <input className="p-4 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={title} onChange={e => setTitle(e.target.value)} placeholder="Prompt Title" />

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Drawing Prompt</span>
          <input className="p-4 bg-black/50 border border-pink-400/30 text-pink-300 font-bold text-xl rounded-lg outline-none focus:border-pink-400 text-center uppercase tracking-wider" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Cat goes to the moon" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Difficulty</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Drawing Time (s)</span>
            <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={drawingTime} onChange={e => setDrawingTime(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Rounds</span>
            <input type="number" min={1} max={5} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={rounds} onChange={e => setRounds(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-lg">
          <label className="flex gap-2 items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Active</span>
          </label>
        </div>

        <div className="flex gap-4 mt-4 justify-end border-t border-white/10 pt-4">
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary px-8">Cancel</button>
          <button onClick={save} className="btn-primary px-8">Save Prompt</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-wider">Doodle Prompts</h3>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Prompt</button>
      </div>
      {contents.length === 0 && <p className="text-zinc-600 font-mono text-center py-12 animate-pulse">No prompts created yet</p>}
      <div className="flex flex-col gap-3">
        {contents.map(c => (
          <div key={c.id} className="admin-card flex flex-col md:flex-row gap-4 items-start md:items-center p-4">
            <div className="w-10 h-10 bg-pink-400/20 text-pink-400 rounded-lg flex items-center justify-center font-black text-lg">✏️</div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white">{c.data?.prompt || c.title}</h4>
              <div className="flex gap-3 text-xs text-zinc-500 font-mono mt-1">
                <span>{c.data?.category}</span><span>•</span><span>{c.difficulty}</span><span>•</span><span>{c.data?.drawingTime}s</span><span>•</span><span>{c.data?.rounds} rounds</span>
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
