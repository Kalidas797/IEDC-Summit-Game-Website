import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { GameContent, QuestionsPerGameSettingsData } from '../../../shared/types';
import { Settings } from 'lucide-react';

interface Props {
  gameId: string;
  settingsContentType: string; // e.g. 'ai-or-human-settings'
  activeContentCount: number;
  label?: string; // 'Questions per Game' or 'Challenges per Game'
}

export default function QuestionsPerGameEditor({ gameId, settingsContentType, activeContentCount, label = 'Questions per Game' }: Props) {
  const [settingsRecord, setSettingsRecord] = useState<GameContent | null>(null);
  const [questionsPerGame, setQuestionsPerGame] = useState<number>(5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [gameId, settingsContentType]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('game_content')
      .select('*')
      .eq('game_id', gameId)
      .eq('content_type', settingsContentType)
      .single();

    if (data) {
      setSettingsRecord(data as GameContent);
      const val = (data.data as QuestionsPerGameSettingsData)?.questionsPerGame;
      if (val !== undefined) {
        setQuestionsPerGame(val);
      }
    } else {
      setSettingsRecord(null);
      setQuestionsPerGame(5);
    }
  };

  const handleSave = async () => {
    if (questionsPerGame < 1) {
      alert("Must be at least 1.");
      return;
    }
    
    setIsSaving(true);
    const payload = {
      game_id: gameId,
      title: 'Game Settings',
      content_type: settingsContentType,
      difficulty: 'MEDIUM' as const,
      is_active: true,
      data: { questionsPerGame } as QuestionsPerGameSettingsData,
    };

    if (settingsRecord) {
      await supabase.from('game_content').update(payload).eq('id', settingsRecord.id);
    } else {
      const { data } = await supabase.from('game_content').insert([payload]).select().single();
      if (data) {
        setSettingsRecord(data as GameContent);
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="admin-card p-6 border-l-4 border-cyan-400">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-zinc-900 rounded-lg">
          <Settings className="text-cyan-400" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">Session Configuration</h3>
          <p className="text-sm text-zinc-400 mb-6 max-w-2xl font-mono">
            Configure how many challenges are shown in each game session. Content is randomly selected from the available active items independently for each user session.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
            
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Available Active</span>
              <span className="text-3xl font-black text-lime-400">{activeContentCount}</span>
            </div>

            <div className="h-12 w-px bg-white/10 hidden sm:block"></div>

            <div className="flex-1 w-full max-w-sm">
              <label className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">{label}</span>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    min="1"
                    value={questionsPerGame}
                    onChange={(e) => setQuestionsPerGame(parseInt(e.target.value) || 1)}
                    className="flex-1 min-w-0 p-3 bg-black border border-white/20 text-white font-mono rounded-lg outline-none focus:border-cyan-400 text-xl font-bold" 
                  />
                  <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="btn-primary px-6 shrink-0 whitespace-nowrap h-full"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </label>
            </div>

          </div>
          
          {questionsPerGame > activeContentCount && activeContentCount > 0 && (
            <div className="mt-4 text-xs font-bold font-mono text-red-400 bg-red-400/10 px-4 py-2 rounded border border-red-400/20">
              Warning: You requested {questionsPerGame} {label.toLowerCase()}, but only {activeContentCount} are active. Players will only see {activeContentCount} challenges per session.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
