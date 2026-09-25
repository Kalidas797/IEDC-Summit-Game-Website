import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Brain, User, Crosshair, PenTool, LayoutDashboard, Zap, Hash, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Game, GameSlug } from '../../shared/types';

import MemoryEditor from './editors/MemoryEditor';
import AIOrHumanEditor from './editors/AIOrHumanEditor';
import SpotDifferenceEditor from './editors/SpotDifferenceEditor';
import DoodleEditor from './editors/DoodleEditor';
import CrosswordEditor from './editors/CrosswordEditor';
import ReactionEditor from './editors/ReactionEditor';
import TicTacToeEditor from './editors/TicTacToeEditor';

const gameIcons: Record<string, React.ElementType> = {
  'memory': Brain,
  'ai-or-human': User,
  'spot-difference': Crosshair,
  'what-changed': Eye,
  'doodle': PenTool,
  'crossword': LayoutDashboard,
  'reaction': Zap,
  'tic-tac-toe': Hash,
};

const gameColors: Record<string, string> = {
  'memory': 'text-purple-400',
  'ai-or-human': 'text-blue-400',
  'spot-difference': 'text-red-400',
  'what-changed': 'text-orange-400',
  'doodle': 'text-pink-400',
  'crossword': 'text-emerald-400',
  'reaction': 'text-yellow-400',
  'tic-tac-toe': 'text-cyan-400',
};

export default function ContentEditor() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeSlug, setActiveSlug] = useState<GameSlug | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      const { data } = await supabase.from('games').select('*').order('display_order');
      if (data) setGames(data as Game[]);
    };
    fetchGames();
  }, []);

  const selectGame = (game: Game) => {
    setActiveSlug(game.slug as GameSlug);
    setActiveGameId(game.id);
  };

  const renderEditor = () => {
    if (!activeSlug || !activeGameId) return null;

    switch (activeSlug) {
      case 'memory':
        return <MemoryEditor gameId={activeGameId} />;
      case 'ai-or-human':
        return <AIOrHumanEditor gameId={activeGameId} />;
      case 'spot-difference':
        return <SpotDifferenceEditor gameId={activeGameId} gameType="spot-difference" />;
      case 'what-changed':
        return <SpotDifferenceEditor gameId={activeGameId} gameType="what-changed" />;
      case 'doodle':
        return <DoodleEditor gameId={activeGameId} />;
      case 'crossword':
        return <CrosswordEditor gameId={activeGameId} />;
      case 'reaction':
        return <ReactionEditor gameId={activeGameId} />;
      case 'tic-tac-toe':
        return <TicTacToeEditor gameId={activeGameId} />;
      default:
        return <p className="text-zinc-500 font-mono">Editor not available for this game</p>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Game selector tabs */}
      <div className="flex gap-2 flex-wrap border-b border-white/10 pb-4">
        {games.map(game => {
          const Icon = gameIcons[game.slug] || LayoutDashboard;
          const color = gameColors[game.slug] || 'text-zinc-400';
          const isActive = activeSlug === game.slug;
          return (
            <button
              key={game.id}
              onClick={() => selectGame(game)}
              className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest px-3 py-2 rounded-lg transition-all ${
                isActive
                  ? `bg-white/10 ${color} shadow-lg border border-white/10`
                  : 'text-zinc-600 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{game.name}</span>
            </button>
          );
        })}
      </div>

      {/* Editor content */}
      <AnimatePresence mode="wait">
        {activeSlug ? (
          <motion.div key={activeSlug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {renderEditor()}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
            <LayoutDashboard size={48} className="text-zinc-700 mb-4" />
            <h3 className="text-xl font-black uppercase tracking-wider text-zinc-500 mb-2">Select a Game</h3>
            <p className="text-zinc-600 font-mono text-sm">Choose a game module above to manage its content</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
