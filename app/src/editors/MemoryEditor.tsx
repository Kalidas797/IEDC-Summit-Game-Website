import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trash2, Edit, Plus, Power } from 'lucide-react';
import { motion } from 'framer-motion';
import AssetUploader from '../components/AssetUploader';
import type { GameContent, MCQuestion } from '../../../shared/types';

interface Props { gameId: string; }

export default function MemoryEditor({ gameId }: Props) {
  const [contents, setContents] = useState<GameContent[]>([]);
  const [editing, setEditing] = useState<GameContent | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isActive, setIsActive] = useState(true);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [displayDuration, setDisplayDuration] = useState(10000);
  const [questionTime, setQuestionTime] = useState(10000);
  const [questions, setQuestions] = useState<MCQuestion[]>([]);

  useEffect(() => { fetchContents(); }, [gameId]);

  const fetchContents = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).order('created_at', { ascending: false });
    if (data) setContents(data as GameContent[]);
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setTitle('Paper Memory Challenge');
    setDifficulty('MEDIUM');
    setIsActive(true);
    setStoragePath(null);
    setDisplayDuration(10000);
    setQuestionTime(10000);
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const openEdit = (c: GameContent) => {
    setIsNew(false);
    setEditing(c);
    setTitle(c.title);
    setDifficulty(c.difficulty);
    setIsActive(c.is_active);
    setStoragePath(c.storage_path);
    setDisplayDuration(c.data?.displayDuration || 10000);
    setQuestionTime(c.data?.questionTime || 10000);
    setQuestions(c.data?.questions || []);
  };

  const save = async () => {
    const payload = {
      game_id: gameId,
      title,
      difficulty,
      is_active: isActive,
      storage_path: storagePath,
      content_type: 'memory-challenge',
      data: { displayDuration, questionTime, questions },
    };
    if (editing) {
      await supabase.from('game_content').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('game_content').insert([payload]);
    }
    setEditing(null);
    setIsNew(false);
    fetchContents();
  };

  const toggleActive = async (c: GameContent) => {
    await supabase.from('game_content').update({ is_active: !c.is_active }).eq('id', c.id);
    fetchContents();
  };

  const deleteContent = async (id: string) => {
    if (!confirm('Delete this challenge permanently?')) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents();
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[idx] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[oIdx] = value;
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  // EDITING VIEW
  if (editing || isNew) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-black uppercase tracking-wider">{isNew ? 'Create' : 'Edit'} Memory Challenge</h3>
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-zinc-500 hover:text-white font-mono text-sm uppercase">[Cancel]</button>
        </div>

        <input className="p-4 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={title} onChange={e => setTitle(e.target.value)} placeholder="Challenge Title" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Difficulty</span>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Display Time (seconds)</span>
            <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={displayDuration / 1000} onChange={e => setDisplayDuration(Number(e.target.value) * 1000)} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Question Time (seconds)</span>
            <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none" value={questionTime / 1000} onChange={e => setQuestionTime(Number(e.target.value) * 1000)} />
          </div>
        </div>

        <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-lg">
          <label className="flex gap-2 items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Active</span>
          </label>
        </div>

        <AssetUploader
          bucket="game-documents"
          currentPath={storagePath}
          onUpload={setStoragePath}
          onRemove={() => setStoragePath(null)}
          label="Paper / Document Image"
        />

        <div className="flex flex-col gap-4 mt-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <h4 className="font-black uppercase text-zinc-300">Questions ({questions.length})</h4>
            <button onClick={addQuestion} className="text-cyan-400 hover:text-white font-mono text-sm flex items-center gap-1"><Plus size={14} /> Add Question</button>
          </div>
          
          {questions.map((q, qi) => (
            <div key={qi} className="p-4 bg-black/40 border border-white/5 rounded-lg relative">
              <div className="flex justify-between items-start mb-3">
                <span className="text-lime-400 font-mono text-sm font-bold">Q{qi + 1}</span>
                <button onClick={() => removeQuestion(qi)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
              <input className="w-full p-3 bg-black/50 border border-white/10 text-white font-mono rounded mb-3 outline-none focus:border-cyan-400" value={q.question} onChange={e => updateQuestion(qi, 'question', e.target.value)} placeholder="Question text" />
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt: string, oi: number) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <input type="radio" name={`q-${qi}`} checked={q.correctAnswer === oi} onChange={() => updateQuestion(qi, 'correctAnswer', oi)} className="accent-lime-400" />
                    <input className="flex-1 p-2 bg-black/50 border border-white/10 text-white font-mono text-sm rounded outline-none focus:border-cyan-400" value={opt} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4 justify-end border-t border-white/10 pt-4">
          <button onClick={() => { setEditing(null); setIsNew(false); }} className="btn-secondary px-8">Cancel</button>
          <button onClick={save} className="btn-primary px-8">Save Challenge</button>
        </div>
      </motion.div>
    );
  }

  // LIST VIEW
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black uppercase tracking-wider">Memory Challenges</h3>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Add Challenge</button>
      </div>

      {contents.length === 0 && <p className="text-zinc-600 font-mono text-center py-12 animate-pulse">No challenges created yet</p>}

      <div className="flex flex-col gap-3">
        {contents.map(c => {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const thumbUrl = c.storage_path ? `${supabaseUrl}/storage/v1/object/public/game-documents/${c.storage_path}` : null;
          return (
            <div key={c.id} className="admin-card flex flex-col md:flex-row gap-4 items-start md:items-center p-4">
              {thumbUrl ? (
                <img src={thumbUrl} alt="" className="w-20 h-14 object-cover rounded border border-white/10 bg-zinc-900" />
              ) : (
                <div className="w-20 h-14 bg-zinc-900 border border-white/10 rounded flex items-center justify-center text-zinc-700 text-[10px] font-mono">NO IMG</div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate">{c.title}</h4>
                <div className="flex gap-3 text-xs text-zinc-500 font-mono mt-1">
                  <span>Questions: {c.data?.questions?.length || 0}</span>
                  <span>•</span>
                  <span>{c.difficulty}</span>
                  <span>•</span>
                  <span>{(c.data?.displayDuration || 0) / 1000}s display</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest ${c.is_active ? 'bg-lime-400/20 text-lime-400 border border-lime-400/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
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
