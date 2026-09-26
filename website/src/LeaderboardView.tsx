import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronLeft } from 'lucide-react';
import { supabase } from './supabase';
import type { Game } from '../../shared/types';

interface LeaderboardViewProps {
  games: Game[];
  onBack: () => void;
}

interface ScoreEntry {
  player_id: string;
  game_id: string;
  score: number;
  players: { nickname: string };
}

export default function LeaderboardView({ games, onBack }: LeaderboardViewProps) {
  const [activeTab, setActiveTab] = useState<string>('overall');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      const { data } = await supabase
        .from('scores')
        .select(`
          player_id,
          game_id,
          score,
          players ( nickname )
        `);
      if (data) {
        setScores(data as any);
      }
      setLoading(false);
    }
    fetchScores();
  }, []);

  const getOverallLeaderboard = () => {
    const playerTotals: Record<string, { nickname: string; totalScore: number }> = {};
    
    scores.forEach(s => {
      const pId = s.player_id;
      if (!playerTotals[pId]) {
        playerTotals[pId] = { nickname: s.players?.nickname || 'Unknown', totalScore: 0 };
      }
      // Add/stack ALL scores for overall leaderboard
      playerTotals[pId].totalScore += s.score;
    });

    return Object.values(playerTotals)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 100); // Top 100
  };

  const getGameLeaderboard = (gameId: string) => {
    const playerBestScores: Record<string, { nickname: string; score: number }> = {};
    
    scores.filter(s => s.game_id === gameId).forEach(s => {
      const pId = s.player_id;
      if (!playerBestScores[pId]) {
        playerBestScores[pId] = { nickname: s.players?.nickname || 'Unknown', score: s.score };
      } else if (s.score > playerBestScores[pId].score) {
        playerBestScores[pId].score = s.score;
      }
    });

    return Object.values(playerBestScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  };

  const renderLeaderboardRows = () => {
    if (loading) {
      return <div className="text-center p-8 text-cyan-400 font-mono uppercase animate-pulse">Loading Rankings...</div>;
    }

    if (activeTab === 'overall') {
      const lb = getOverallLeaderboard();
      if (lb.length === 0) return <div className="text-center p-8 text-zinc-500 font-mono uppercase">No scores yet.</div>;
      
      return lb.map((p, idx) => (
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
          key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded mb-2"
        >
          <div className="flex items-center gap-4">
            <span className={`font-black text-2xl w-8 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>#{idx + 1}</span>
            <span className="font-bold text-xl uppercase tracking-wider text-zinc-100">{p.nickname}</span>
          </div>
          <span className="font-mono text-2xl text-lime-400">{p.totalScore}</span>
        </motion.div>
      ));
    } else {
      const lb = getGameLeaderboard(activeTab);
      if (lb.length === 0) return <div className="text-center p-8 text-zinc-500 font-mono uppercase">No scores yet.</div>;
      
      return lb.map((p, idx) => (
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
          key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-4 rounded mb-2"
        >
          <div className="flex items-center gap-4">
            <span className={`font-black text-2xl w-8 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-500'}`}>#{idx + 1}</span>
            <span className="font-bold text-xl uppercase tracking-wider text-zinc-100">{p.nickname}</span>
          </div>
          <span className="font-mono text-2xl text-cyan-400">{p.score}</span>
        </motion.div>
      ));
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto w-full p-4 md:p-8 relative z-10">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-zinc-500 hover:text-zinc-100 transition-colors uppercase font-mono tracking-widest flex items-center gap-2">
          <ChevronLeft size={20} /> Back
        </button>
        <h1 className="text-2xl md:text-5xl font-black uppercase text-lime-400 flex items-center gap-2 md:gap-4">
          <Trophy size={40} className="hidden md:block" /> Rankings
        </h1>
        <div className="w-16 md:w-24"></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        <button 
          onClick={() => setActiveTab('overall')}
          className={`shrink-0 px-6 py-3 font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === 'overall' ? 'border-lime-400 text-lime-400 bg-lime-400/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          Overall Hero
        </button>
        {games.filter(g => g.enabled).map(g => (
          <button 
            key={g.id}
            onClick={() => setActiveTab(g.id)}
            className={`shrink-0 px-6 py-3 font-bold uppercase tracking-widest transition-colors border-b-2 ${activeTab === g.id ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-12">
        {renderLeaderboardRows()}
      </div>
    </div>
  );
}
