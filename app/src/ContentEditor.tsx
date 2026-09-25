import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Edit, Trash2, Upload, Box, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContentEditor() {
  const [activeGameSlug, setActiveGameSlug] = useState<'memory' | 'ai-or-human'>('memory');
  
  const [contents, setContents] = useState<any[]>([]);
  const [dbGameId, setDbGameId] = useState<string>('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Shared fields
  const [title, setTitle] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Memory specific
  const [displayDuration, setDisplayDuration] = useState(5000);
  const [questions, setQuestions] = useState<any[]>([]);

  // AI or Human specific
  const [correctAnswer, setCorrectAnswer] = useState<'AI' | 'HUMAN'>('AI');
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    init(activeGameSlug);
    
    const channel = supabase
      .channel('public:game_content')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_content' }, () => {
        if (dbGameId) {
          fetchContents(dbGameId);
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeGameSlug, dbGameId]);

  const init = async (slug: string) => {
    const { data: g } = await supabase.from('games').select('id').eq('slug', slug).single();
    if (g) {
      setDbGameId(g.id);
      fetchContents(g.id);
    }
  };

  const fetchContents = async (gId: string) => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gId);
    if (data) setContents(data);
  };

  const handleSave = async () => {
    let payloadData: any = {};
    if (activeGameSlug === 'memory') {
      payloadData = { displayDuration, questions };
    } else if (activeGameSlug === 'ai-or-human') {
      payloadData = { contentType: 'image', correctAnswer, explanation };
    }

    const payload = {
      game_id: dbGameId,
      title,
      storage_path: storagePath,
      is_active: isActive,
      data: payloadData
    };
    
    if (editId) {
      await supabase.from('game_content').update(payload).eq('id', editId);
    } else {
      await supabase.from('game_content').insert([payload]);
    }
    
    setIsEditing(false);
    fetchContents(dbGameId);
  };

  const handleEdit = (c: any) => {
    setEditId(c.id);
    setTitle(c.title);
    setStoragePath(c.storage_path || '');
    setIsActive(c.is_active);
    
    if (activeGameSlug === 'memory') {
      setDisplayDuration(c.data?.displayDuration || 5000);
      setQuestions(c.data?.questions || []);
    } else {
      setCorrectAnswer(c.data?.correctAnswer || 'AI');
      setExplanation(c.data?.explanation || '');
    }
    
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setEditId(null);
    setTitle(activeGameSlug === 'memory' ? 'New Paper Challenge' : 'New Image Challenge');
    setStoragePath('');
    setIsActive(true);
    
    if (activeGameSlug === 'memory') {
      setDisplayDuration(5000);
      setQuestions([{ question: 'What is this?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }]);
    } else {
      setCorrectAnswer('AI');
      setExplanation('');
    }
    
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this challenge?");
    if (!confirmed) return;
    await supabase.from('game_content').delete().eq('id', id);
    fetchContents(dbGameId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from('game-documents').upload(fileName, file);
    if (data) {
      setStoragePath(data.path);
      alert('Upload successful');
    } else {
      alert("Upload failed: " + error?.message);
    }
  };

  if (isEditing) {
    return (
      <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0}} className="flex flex-col gap-6 admin-card">
        <h2 className="text-2xl font-black uppercase text-secondary mb-2 glow-text tracking-widest">{editId ? 'Edit' : 'Create'} {activeGameSlug} Challenge</h2>
        
        <input className="p-4 bg-black/50 backdrop-blur-md border border-white/10 text-white font-mono w-full outline-none focus:border-secondary rounded-lg transition-colors" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Challenge Title" />
        
        <div className="flex gap-8 items-center mt-2 p-4 bg-black/30 rounded-lg border border-white/5">
          <label className="flex gap-2 items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Active Status</span>
          </label>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center mt-2 p-4 bg-black/30 rounded-lg border border-white/5">
          <input className="p-3 bg-black/50 border border-white/10 text-white font-mono flex-1 outline-none focus:border-secondary rounded-lg w-full" value={storagePath} onChange={e=>setStoragePath(e.target.value)} placeholder="Supabase Storage Path (e.g. 1234_file.png)" />
          <label className="btn-secondary cursor-pointer flex items-center justify-center gap-2 px-6 w-full md:w-auto h-full m-0 hover:bg-secondary/20">
            <Upload size={18} /> UPLOAD MEDIA
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        
        {/* Memory Game Specific Config */}
        {activeGameSlug === 'memory' && (
          <>
            <label className="flex gap-4 items-center mt-4 p-4 bg-black/30 rounded-lg border border-white/5">
              <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Display Duration (ms):</span>
              <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono w-32 outline-none focus:border-secondary rounded-lg" value={displayDuration} onChange={e=>setDisplayDuration(Number(e.target.value))} />
            </label>

            <h3 className="font-bold uppercase mt-6 border-b border-zinc-800 pb-2 text-zinc-400">Questions Array</h3>
            {questions.map((q, i) => (
              <div key={i} className="p-4 bg-black border border-zinc-800 mb-4 relative group">
                 <button onClick={() => {
                     const n = [...questions]; n.splice(i, 1); setQuestions(n);
                 }} className="absolute top-2 right-2 text-zinc-600 hover:text-red-400">
                   <Trash2 size={16} />
                 </button>
                 
                 <input className="w-full p-2 bg-zinc-900 border border-zinc-800 text-white font-mono mb-4 text-lg outline-none focus:border-cyan-400" value={q.question} onChange={e=>{
                   const n = [...questions]; n[i].question = e.target.value; setQuestions(n);
                 }} placeholder="Question Text" />
                 
                 <div className="grid grid-cols-2 gap-2">
                   {q.options.map((opt: string, j: number) => (
                      <div key={j} className="flex gap-3 items-center">
                        <input type="radio" name={`q-${i}`} className="w-4 h-4 accent-cyan-400" checked={q.correctAnswer === j} onChange={() => {
                           const n = [...questions]; n[i].correctAnswer = j; setQuestions(n);
                        }} />
                        <input className="p-2 bg-zinc-900 border border-zinc-800 text-white font-mono flex-1 text-sm outline-none focus:border-cyan-400" value={opt} onChange={e=>{
                           const n = [...questions]; n[i].options[j] = e.target.value; setQuestions(n);
                        }} placeholder={`Option ${j+1}`} />
                      </div>
                   ))}
                 </div>
              </div>
            ))}
            <button className="text-sm font-mono text-cyan-400 hover:text-white self-start" onClick={() => setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }])}>
              + ADD QUESTION
            </button>
          </>
        )}

        {/* AI or Human Specific Config */}
        {activeGameSlug === 'ai-or-human' && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest block mb-2">True Origin (Correct Answer)</span>
              <div className="flex gap-4">
                <button onClick={() => setCorrectAnswer('AI')} className={`px-6 py-2 font-bold uppercase ${correctAnswer === 'AI' ? 'bg-cyan-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>AI Generated</button>
                <button onClick={() => setCorrectAnswer('HUMAN')} className={`px-6 py-2 font-bold uppercase ${correctAnswer === 'HUMAN' ? 'bg-lime-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Human Created</button>
              </div>
            </div>
            <div>
              <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest block mb-2">Explanation / Post-Reveal Text</span>
              <textarea 
                className="w-full h-24 p-3 bg-black border border-zinc-800 text-white font-mono outline-none focus:border-cyan-400 resize-none" 
                value={explanation} 
                onChange={e => setExplanation(e.target.value)} 
                placeholder="e.g. Look at the distortion on the 6th finger of the right hand..." 
              />
            </div>
          </div>
        )}
        
        <div className="flex gap-4 mt-8 pt-6 border-t border-white/10 justify-end">
          <button className="btn-secondary px-8 hover:text-danger hover:border-danger hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]" onClick={()=>setIsEditing(false)}>CANCEL</button>
          <button className="btn-primary" onClick={handleSave}>SAVE TO CLOUD</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="flex flex-col gap-6">
       
       <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto">
          <button onClick={() => setActiveGameSlug('memory')} className={`flex items-center gap-2 font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeGameSlug === 'memory' ? 'bg-primary text-black shadow-[0_0_15px_rgba(163,230,53,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
            <Box size={18} /> Remember the Paper
          </button>
          <button onClick={() => setActiveGameSlug('ai-or-human')} className={`flex items-center gap-2 font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all ${activeGameSlug === 'ai-or-human' ? 'bg-secondary text-black shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
            <Box size={18} /> AI or Human
          </button>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <h2 className="text-2xl font-black uppercase tracking-wider glow-text text-white">Configure: {activeGameSlug}</h2>
         <button className="btn-primary flex gap-2 items-center" onClick={handleAddNew}>+ NEW CHALLENGE</button>
       </div>

       <div className="admin-card overflow-x-auto p-0 border-white/5">
         <table className="w-full text-left font-mono text-sm min-w-[600px]">
          <thead className="bg-black/30 border-b border-white/5 text-zinc-400">
            <tr>
              <th className="p-4 font-normal">TITLE</th>
              <th className="p-4 font-normal">IMAGE PATH</th>
              <th className="p-4 font-normal text-center">ACTIVE</th>
              <th className="p-4 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
            {contents.map(c => (
              <motion.tr initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, x:-20}} key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-4 font-bold text-white">{c.title}</td>
                <td className="p-4 text-xs text-zinc-500 truncate max-w-[200px]">{c.storage_path || 'No Image'}</td>
                <td className="p-4 text-center">
                   <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest shadow-lg ${c.is_active ? 'bg-primary/20 text-primary border border-primary/50' : 'bg-danger/20 text-danger border border-danger/50'}`}>
                     {c.is_active ? 'YES' : 'NO'}
                   </span>
                </td>
                <td className="p-4 flex justify-end gap-4 text-zinc-500">
                  <button className="hover:text-secondary hover:scale-110 transition-all p-2 bg-black/20 rounded-lg border border-white/5" onClick={()=>handleEdit(c)}><Edit size={16} /></button>
                  <button className="hover:text-danger hover:scale-110 transition-all p-2 bg-black/20 rounded-lg border border-white/5" onClick={()=>handleDelete(c.id)}><Trash2 size={16} /></button>
                </td>
              </motion.tr>
            ))}
            </AnimatePresence>
            {contents.length === 0 && (
              <tr><td colSpan={4} className="p-12 text-center text-zinc-600 font-mono text-lg animate-pulse">NO CONTENT FOUND IN DATABASE</td></tr>
            )}
          </tbody>
         </table>
       </div>
    </motion.div>
  );
}
