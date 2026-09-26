import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function RockPaperScissorsEditor({ gameId }: Props) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<'3' | '5' | '7'>('5');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadSettings(); }, [gameId]);

  const loadSettings = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).eq('content_type', 'rps-settings').single();
    if (data) {
      setContent(data as GameContent);
      setMode(data.data?.mode || '5');
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const save = async () => {
    const payload = {
      game_id: gameId,
      title: 'Rock Paper Scissors Settings',
      is_active: isActive,
      content_type: 'rps-settings',
      data: { mode },
    };
    if (content) {
      await supabase.from('game_content').update(payload).eq('id', content.id);
    } else {
      await supabase.from('game_content').insert([payload]);
    }
    loadSettings();
    alert('Settings saved!');
  };

  if (loading) return <div className="text-zinc-500 font-mono animate-pulse p-8">Loading settings...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <h3 className="text-xl font-black uppercase tracking-wider">Rock Paper Scissors Settings</h3>
      <p className="text-zinc-500 font-mono text-sm">Configure the default game mode.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Default Mode</span>
          <div className="flex gap-4">
            <button onClick={() => setMode('3')} className={`flex-1 py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${mode === '3' ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>Best of 3</button>
            <button onClick={() => setMode('5')} className={`flex-1 py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${mode === '5' ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>Best of 5</button>
            <button onClick={() => setMode('7')} className={`flex-1 py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${mode === '7' ? 'bg-rose-400 text-black' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>Best of 7</button>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-lg">
        <label className="flex gap-2 items-center cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-cyan-400" />
          <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Game Active</span>
        </label>
      </div>

      <button onClick={save} className="btn-primary flex items-center gap-2 self-start"><Save size={16} /> Save Settings</button>
    </motion.div>
  );
}
