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
  const [gameTimeLimit, setGameTimeLimit] = useState<number>(60);
  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(10);
  const [maxScorePerQuestion, setMaxScorePerQuestion] = useState<number>(100);
  const [timeBasedScoringEnabled, setTimeBasedScoringEnabled] = useState<boolean>(true);
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
      const typedData = data.data as QuestionsPerGameSettingsData;
      if (typedData) {
        if (typedData.questionsPerGame !== undefined) setQuestionsPerGame(typedData.questionsPerGame);
        if (typedData.gameTimeLimit !== undefined) setGameTimeLimit(typedData.gameTimeLimit);
        if (typedData.questionTimeLimit !== undefined) setQuestionTimeLimit(typedData.questionTimeLimit);
        if (typedData.maxScorePerQuestion !== undefined) setMaxScorePerQuestion(typedData.maxScorePerQuestion);
        if (typedData.timeBasedScoringEnabled !== undefined) setTimeBasedScoringEnabled(typedData.timeBasedScoringEnabled);
      }
    } else {
      setSettingsRecord(null);
      setQuestionsPerGame(5);
      setGameTimeLimit(60);
      setQuestionTimeLimit(10);
      setMaxScorePerQuestion(100);
      setTimeBasedScoringEnabled(true);
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
      data: { 
        questionsPerGame, 
        gameTimeLimit, 
        questionTimeLimit, 
        maxScorePerQuestion, 
        timeBasedScoringEnabled 
      } as QuestionsPerGameSettingsData,
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

          <div className="mt-8 pt-6 border-t border-white/5">
            <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-300 mb-4">Time & Scoring Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
              <label className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Game Time Limit (sec)</span>
                <input 
                  type="number" min="0"
                  value={gameTimeLimit} onChange={(e) => setGameTimeLimit(parseInt(e.target.value) || 0)}
                  className="p-3 bg-black border border-white/20 text-white font-mono rounded-lg outline-none focus:border-cyan-400" 
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Time per Question (sec)</span>
                <input 
                  type="number" min="1"
                  value={questionTimeLimit} onChange={(e) => setQuestionTimeLimit(parseInt(e.target.value) || 1)}
                  className="p-3 bg-black border border-white/20 text-white font-mono rounded-lg outline-none focus:border-cyan-400" 
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Max Score (per question)</span>
                <input 
                  type="number" min="0"
                  value={maxScorePerQuestion} onChange={(e) => setMaxScorePerQuestion(parseInt(e.target.value) || 0)}
                  className="p-3 bg-black border border-white/20 text-white font-mono rounded-lg outline-none focus:border-cyan-400" 
                />
              </label>
            </div>
            
            <label className="flex items-center gap-3 cursor-pointer group mb-2">
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={timeBasedScoringEnabled}
                  onChange={(e) => setTimeBasedScoringEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${timeBasedScoringEnabled ? 'bg-cyan-400' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${timeBasedScoringEnabled ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">Reward Faster Answers</span>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">When enabled, faster correct answers receive more points based on the remaining question time.</p>
              </div>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
}
