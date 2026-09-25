import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function ReactionEditor({ gameId }: Props) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [minWait, setMinWait] = useState(2000);
  const [maxWait, setMaxWait] = useState(6000);
  const [rounds, setRounds] = useState(5);
  const [falseStartPenalty, setFalseStartPenalty] = useState(true);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadSettings(); }, [gameId]);

  const loadSettings = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).eq('content_type', 'reaction-settings').single();
    if (data) {
      setContent(data as GameContent);
      setMinWait(data.data?.minWait || 2000);
      setMaxWait(data.data?.maxWait || 6000);
      setRounds(data.data?.rounds || 5);
      setFalseStartPenalty(data.data?.falseStartPenalty ?? true);
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const save = async () => {
    const payload = {
      game_id: gameId,
      title: 'Reaction Challenge Settings',
      is_active: isActive,
      content_type: 'reaction-settings',
      data: { minWait, maxWait, rounds, falseStartPenalty },
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
      <h3 className="text-xl font-black uppercase tracking-wider">Reaction Challenge Settings</h3>
      <p className="text-zinc-500 font-mono text-sm">Configure the reaction time game. No uploaded content needed — just timing and rules.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Minimum Wait (ms)</span>
          <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={minWait} onChange={e => setMinWait(Number(e.target.value))} />
          <span className="text-zinc-600 text-[10px] font-mono">Shortest possible delay before GO signal</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Maximum Wait (ms)</span>
          <input type="number" className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={maxWait} onChange={e => setMaxWait(Number(e.target.value))} />
          <span className="text-zinc-600 text-[10px] font-mono">Longest possible delay before GO signal</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Number of Rounds</span>
          <input type="number" min={1} max={10} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400" value={rounds} onChange={e => setRounds(Number(e.target.value))} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">False Start Penalty</span>
          <label className="flex gap-2 items-center cursor-pointer p-3 bg-black/50 border border-white/10 rounded-lg">
            <input type="checkbox" checked={falseStartPenalty} onChange={e => setFalseStartPenalty(e.target.checked)} className="w-5 h-5 accent-yellow-400" />
            <span className="font-mono text-sm text-zinc-400">{falseStartPenalty ? 'Restart round on early tap' : 'No penalty'}</span>
          </label>
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
