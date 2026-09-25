import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Edit, Trash2, Upload, Box } from 'lucide-react';

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
  }, [activeGameSlug]);

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
      <div className="flex flex-col gap-4 bg-zinc-900/50 p-6 border border-zinc-800">
        <h2 className="text-xl font-bold uppercase text-cyan-400 mb-4">{editId ? 'Edit' : 'Create'} {activeGameSlug} Challenge</h2>
        
        <input className="p-3 bg-black border border-zinc-800 text-white font-mono w-full outline-none focus:border-cyan-400" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Challenge Title" />
        
        <div className="flex gap-8 items-center mt-2">
          <label className="flex gap-2 items-center cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e=>setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
            <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Active Status</span>
          </label>
        </div>

        <div className="flex gap-4 items-center mt-2">
          <input className="p-3 bg-black border border-zinc-800 text-white font-mono flex-1 outline-none focus:border-cyan-400" value={storagePath} onChange={e=>setStoragePath(e.target.value)} placeholder="Supabase Storage Path (e.g. 1234_file.png)" />
          <label className="btn-secondary cursor-pointer flex items-center gap-2 px-6">
            <Upload size={16} /> UPLOAD
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
        
        {/* Memory Game Specific Config */}
        {activeGameSlug === 'memory' && (
          <>
            <label className="flex gap-2 items-center mt-4">
              <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Display Duration (ms):</span>
              <input type="number" className="p-2 bg-black border border-zinc-800 text-white font-mono w-32 outline-none focus:border-cyan-400" value={displayDuration} onChange={e=>setDisplayDuration(Number(e.target.value))} />
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
        
        <div className="flex gap-4 mt-8 pt-4 border-t border-zinc-800">
          <button className="btn-primary bg-cyan-500 hover:bg-cyan-400 text-black px-8" onClick={handleSave}>SAVE TO SUPABASE</button>
          <button className="btn-secondary px-8" onClick={()=>setIsEditing(false)}>CANCEL</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       
       <div className="flex gap-4 border-b border-zinc-800 pb-4">
          <button onClick={() => setActiveGameSlug('memory')} className={`flex items-center gap-2 font-bold uppercase tracking-widest ${activeGameSlug === 'memory' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Box size={16} /> Remember the Paper
          </button>
          <button onClick={() => setActiveGameSlug('ai-or-human')} className={`flex items-center gap-2 font-bold uppercase tracking-widest ${activeGameSlug === 'ai-or-human' ? 'text-lime-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Box size={16} /> AI or Human
          </button>
       </div>

       <div className="flex justify-between items-center">
         <h2 className="text-xl font-bold uppercase tracking-wider">Configure: {activeGameSlug}</h2>
         <button className="btn-primary bg-lime-400 hover:bg-lime-300 text-black" onClick={handleAddNew}>+ NEW CHALLENGE</button>
       </div>

       <div className="admin-card bg-gray-900/50 overflow-x-auto">
         <table className="w-full text-left font-mono text-sm min-w-[600px]">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="pb-4 font-normal">TITLE</th>
              <th className="pb-4 font-normal">IMAGE PATH</th>
              <th className="pb-4 font-normal">ACTIVE</th>
              <th className="pb-4 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {contents.map(c => (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-4 font-bold text-white">{c.title}</td>
                <td className="py-4 text-xs text-zinc-500 truncate max-w-[200px]">{c.storage_path || 'No Image'}</td>
                <td className="py-4">
                   <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest ${c.is_active ? 'bg-lime-400 text-black' : 'bg-red-500 text-white'}`}>
                     {c.is_active ? 'YES' : 'NO'}
                   </span>
                </td>
                <td className="py-4 flex justify-end gap-4 text-zinc-500">
                  <button className="hover:text-cyan-400 transition-colors" onClick={()=>handleEdit(c)}><Edit size={16} /></button>
                  <button className="hover:text-red-400 transition-colors" onClick={()=>handleDelete(c.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {contents.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-zinc-500 font-mono">NO CONTENT FOUND IN DATABASE</td></tr>
            )}
          </tbody>
         </table>
       </div>
    </div>
  );
}
