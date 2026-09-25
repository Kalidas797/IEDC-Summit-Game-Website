import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import AssetUploader from '../components/AssetUploader';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function AIOrHumanEditor({ gameId }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isActive, setIsActive] = useState(true);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<'AI' | 'HUMAN'>('AI');
  const [explanation, setExplanation] = useState('');

  useEffect(() => { fetchContents(); }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const openNew = () => {
    setIsNew(true); setEditing(null);
    setTitle('New AI or Human Challenge');
    setDifficulty('MEDIUM'); setIsActive(true); setStoragePath(null);
    setCorrectAnswer('AI'); setExplanation('');
  };

  const openEdit = (c: GameContent) => {
    setIsNew(false); setEditing(c);
    setTitle(c.title); setDifficulty(c.difficulty); setIsActive(c.is_active);
    setStoragePath(c.storage_path);
    setCorrectAnswer(c.data?.correctAnswer || 'AI');
    setExplanation(c.data?.explanation || '');
  };

  const save = async () => {
    const payload = {
      game_id: gameId, title, difficulty, is_active: isActive, storage_path: storagePath,
      content_type: 'ai-or-human-challenge',
      data: { contentType: 'image', correctAnswer, explanation },
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

  if (editing || isNew) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} AI/Human Challenge</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-zinc-500 hover:text-white font-mono text-sm uppercase">[Cancel]</button>
        </div>

        <input className="p-4 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={title} onChange={e => setTitle(e.target.value)} placeholder="Challenge Title" />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Difficulty</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Status</span>
            <label className="flex gap-2 items-center cursor-pointer p-3 bg-black/50 border border-white/10 rounded-lg">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
              <span className="font-mono text-sm text-zinc-400">{isActive ? 'Active' : 'Inactive'}</span>
            </label>
          </div>
        </div>

        <AssetUploader bucket="game-documents" currentPath={storagePath} onUpload={setStoragePath} onRemove={() => setStoragePath(null)} label="Image / Artwork" />

        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Correct Answer</span>
          <div className="flex gap-4">
            <button onClick={() => setCorrectAnswer('AI')} className={`flex-1 py-4 font-black uppercase tracking-widest rounded-lg transition-all ${correctAnswer === 'AI' ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>AI Generated</button>
            <button onClick={() => setCorrectAnswer('HUMAN')} className={`flex-1 py-4 font-black uppercase tracking-widest rounded-lg transition-all ${correctAnswer === 'HUMAN' ? 'bg-lime-400 text-black shadow-[0_0_20px_rgba(163,230,53,0.3)]' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>Human Created</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Explanation (shown after reveal)</span>
          <textarea className="w-full h-24 p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400 resize-none" value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="e.g. The distorted fingers and warped background are telltale AI artifacts..." />
        </div>

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
        <h3 className="text-xl font-black uppercase tracking-wider">AI or Human Challenges</h3>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Challenge</button>
      </div>
      {contents.length === 0 && <p className="text-zinc-600 font-mono text-center py-12 animate-pulse">No challenges created yet</p>}
      <div className="flex flex-col gap-3">
        {contents.map(c => {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const thumbUrl = c.storage_path ? `${supabaseUrl}/storage/v1/object/public/game-documents/${c.storage_path}` : null;
          return (
            <div key={c.id} className="admin-card flex flex-col md:flex-row gap-4 items-start md:items-center p-4">
              {thumbUrl ? <img src={thumbUrl} alt="" className="w-20 h-14 object-cover rounded border border-white/10 bg-zinc-900" /> : <div className="w-20 h-14 bg-zinc-900 border border-white/10 rounded flex items-center justify-center text-zinc-700 text-[10px] font-mono">NO IMG</div>}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{c.title}</h4>
                <div className="flex gap-3 text-xs text-zinc-500 font-mono mt-1">
                  <span>Answer: {c.data?.correctAnswer}</span><span>•</span><span>{c.difficulty}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${c.is_active ? 'bg-lime-400/20 text-lime-400 border border-lime-400/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(c)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-cyan-400"><Power size={14} /></button>
                <button onClick={() => openEdit(c)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-cyan-400"><Edit size={14} /></button>
                <button onClick={() => deleteContent(c.id)} className="p-2 bg-black/20 rounded border border-white/5 text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
