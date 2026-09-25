import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Save } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GameContent } from '../../../shared/types';

interface Props { gameId: string; }

export default function TicTacToeEditor({ gameId }: Props) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [loading, setLoading] = useState(true);

  const [defaultMode, setDefaultMode] = useState<'pvp' | 'pvc'>('pvc');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => { loadSettings(); }, [gameId]);

  const loadSettings = async () => {
    const { data } = await supabase.from('game_content').select('*').eq('game_id', gameId).eq('content_type', 'tictactoe-settings').single();
    if (data) {
      setContent(data as GameContent);
      setDefaultMode(data.data?.defaultMode || 'pvc');
      setDifficulty(data.data?.difficulty || 'medium');
      setIsActive(data.is_active);
    }
    setLoading(false);
  };

  const save = async () => {
    const payload = {
      game_id: gameId,
      title: 'Tic-Tac-Toe Settings',
      is_active: isActive,
      content_type: 'tictactoe-settings',
      data: { defaultMode, difficulty, mode: defaultMode },
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
      <h3 className="text-xl font-black uppercase tracking-wider">Tic-Tac-Toe Settings</h3>
      <p className="text-zinc-500 font-mono text-sm">Configure the default game mode and computer difficulty.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Default Mode</span>
          <div className="flex gap-4">
            <button onClick={() => setDefaultMode('pvc')} className={`flex-1 py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${defaultMode === 'pvc' ? 'bg-cyan-500 text-black' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>vs Computer</button>
            <button onClick={() => setDefaultMode('pvp')} className={`flex-1 py-3 font-bold uppercase tracking-widest rounded-lg transition-all ${defaultMode === 'pvp' ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-500 border border-white/10'}`}>vs Player</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Computer Difficulty</span>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as any)} className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none">
            <option value="easy">Easy (Random)</option>
            <option value="medium">Medium (Smart)</option>
            <option value="hard">Hard (Minimax / Unbeatable)</option>
          </select>
          <span className="text-zinc-600 text-[10px] font-mono">Hard uses optimal minimax strategy</span>
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
