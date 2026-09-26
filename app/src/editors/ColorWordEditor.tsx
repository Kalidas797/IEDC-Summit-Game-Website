import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function ColorWordEditor({ gameId }: Props) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [rounds, setRounds] = useState(10);
  const [timePerRound, setTimePerRound] = useState(3000);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadSettings(); }, [gameId]);

  const loadSettings = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).eq('content_type', 'color-word-settings').single();
    if (data) {
      setContent(data as GameContent);
      setRounds(data.data?.rounds || 10);
      setTimePerRound(data.data?.timePerRound || 3000);
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const save = async () => {
    const payload = {
      game_id: gameId,
      title: 'Color/Word Challenge Settings',
      is_active: isActive,
      content_type: 'color-word-settings',
      data: { rounds, timePerRound },
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
      <h3 className="text-xl font-black uppercase tracking-wider">Color/Word Challenge Settings</h3>
      <p className="text-zinc-500 font-mono text-sm">Configure the speed and length of the game.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Number of Rounds</span>
          <input type="number" min={1} max={50} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-rose-400" value={rounds} onChange={e => setRounds(Number(e.target.value))} />
          <span className="text-zinc-600 text-[10px] font-mono">How many words they have to answer</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Time Per Round (ms)</span>
          <input type="number" min={500} step={100} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-rose-400" value={timePerRound} onChange={e => setTimePerRound(Number(e.target.value))} />
          <span className="text-zinc-600 text-[10px] font-mono">Milliseconds given to answer before timeout (1000 = 1s)</span>
        </div>
      </div>

      <div className="flex gap-4 items-center p-3 bg-black/30 border border-white/5 rounded-lg">
        <label className="flex gap-2 items-center cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 accent-rose-400" />
          <span className="font-mono text-sm uppercase text-zinc-400 tracking-widest">Game Active</span>
        </label>
      </div>

      <button onClick={save} className="btn-primary flex items-center gap-2 self-start"><Save size={16} /> Save Settings</button>
    </motion.div>
  );
}
