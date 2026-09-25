import React, { useState } from 'react';
import { Play, Sparkles, User, Crosshair, Zap, Brain, PenTool, LayoutDashboard, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GameEngine from './games/GameEngine';
import { supabase } from './supabase';

import type { Game } from '../../shared/types';
// Fallback local UI info mapped to game slug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gameInfoMap: Record<string, any> = {
  'reaction': { time: '30s', difficulty: 'EASY', icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  'memory': { time: '1m', difficulty: 'MEDIUM', icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  'ai-or-human': { time: '45s', difficulty: 'MEDIUM', icon: User, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  'spot-difference': { time: '1m', difficulty: 'HARD', icon: Crosshair, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  'doodle': { time: '2m', difficulty: 'EASY', icon: PenTool, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/30' },
  'what-changed': { time: '45s', difficulty: 'MEDIUM', icon: Crosshair, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  'crossword': { time: '3m', difficulty: 'MEDIUM', icon: LayoutDashboard, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  'tic-tac-toe': { time: '2m', difficulty: 'EASY', icon: LayoutDashboard, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' }
};

export default function App() {
  const [view, setView] = useState<'attract' | 'registration' | 'selection' | 'game'>('attract');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(localStorage.getItem('paperlab_player_id'));
  const [nicknameInput, setNicknameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [games, setGames] = React.useState<Game[]>([]);

  React.useEffect(() => {
    fetchGames();
    
    const channel = supabase
      .channel('public:games')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        fetchGames();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('display_order');
    if (data) setGames(data as Game[]);
  };
  const handlePlayNow = () => {
    if (playerId) {
      setView('selection');
    } else {
      setView('registration');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameInput.trim()) return;
    
    setIsRegistering(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{ nickname: nicknameInput.trim() }])
        .select()
        .single();
        
      if (data) {
        setPlayerId(data.id);
        localStorage.setItem('paperlab_player_id', data.id);
        setView('selection');
      } else if (error) {
        console.error("Supabase Error:", error);
        alert(`Database Error: ${error.message || JSON.stringify(error)}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Network/Unknown Error:", err);
      alert(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  const startGame = (id: string) => {
    setSelectedGameId(id);
    setView('game');
  };

  const handleGameComplete = (score: number, timeMs: number) => {
    console.log('Game completed:', { score, timeMs });
    // Handled by GameEngine now
    setView('selection');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-lime-400 selection:text-black overflow-hidden relative flex flex-col">
      {/* Background Noise/Grid for Arcade Feel */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #18181b 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.4 }} />

      <AnimatePresence mode="wait">
        {view === 'attract' && (
          <motion.div 
            key="attract"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lime-400 tracking-[0.3em] text-sm md:text-xl mb-6 font-mono font-bold uppercase">
                // PaperLab Games Arena
              </h2>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-12 uppercase leading-[0.9] tracking-tighter">
                Can you beat<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-cyan-400">
                  the leaderboard?
                </span>
              </h1>
            </motion.div>
            
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col md:flex-row gap-6 mb-16"
            >
              <button 
                onClick={handlePlayNow}
                className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black uppercase tracking-widest text-xl px-12 py-6 flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(163,230,53,0.3)]"
              >
                <Play size={28} fill="currentColor" /> Play Now
              </button>
              <button className="bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-400 hover:text-cyan-400 text-zinc-300 font-bold uppercase tracking-widest text-xl px-12 py-6 flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
                <Sparkles size={28} /> Random Game
              </button>
            </motion.div>

            <div className="absolute bottom-8 left-8 text-left font-mono text-zinc-500 text-xs md:text-sm border-l-2 border-lime-400 pl-4 tracking-wider uppercase">
              <p className="mb-1 text-zinc-400">STATION: #PL-892</p>
              <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" /> SYSTEM ONLINE</p>
            </div>
          </motion.div>
        )}

        {view === 'registration' && (
          <motion.div 
            key="registration"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-8 z-10"
          >
            <div className="w-full max-w-md">
              <h2 className="text-4xl font-black uppercase mb-2">Identify Yourself</h2>
              <p className="text-zinc-400 font-mono mb-8 uppercase text-sm tracking-widest">Enter a nickname for the leaderboard</p>
              
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <input 
                  type="text" 
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value.toUpperCase())}
                  placeholder="NICKNAME"
                  maxLength={15}
                  required
                  className="bg-zinc-900 border-2 border-zinc-800 focus:border-lime-400 focus:outline-none p-6 text-3xl font-black uppercase text-center tracking-widest transition-colors w-full"
                />
                
                <button 
                  type="submit" 
                  disabled={isRegistering || !nicknameInput.trim()}
                  className="bg-lime-400 hover:bg-lime-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-black uppercase tracking-widest text-xl px-12 py-6 flex justify-center items-center gap-3 transition-colors w-full"
                >
                  {isRegistering ? 'CONNECTING...' : 'INITIALIZE'} <ArrowRight size={24} />
                </button>
                <button 
                  type="button"
                  onClick={() => setView('attract')}
                  className="mt-4 text-zinc-500 hover:text-white font-mono uppercase tracking-widest text-sm"
                >
                  [ CANCEL ]
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {view === 'selection' && (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 p-8 md:p-12 lg:p-16 z-10 flex flex-col"
          >
            <header className="flex justify-between items-end mb-12 border-b-2 border-zinc-800 pb-6">
              <div>
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-2">Choose Challenge</h1>
                <p className="text-cyan-400 font-mono tracking-widest uppercase text-sm">Select a module to begin</p>
              </div>
              <button 
                onClick={() => setView('attract')} 
                className="text-zinc-500 hover:text-white uppercase font-bold text-sm tracking-widest transition-colors mb-2"
              >
                [ ESC / CANCEL ]
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 max-w-7xl mx-auto w-full">
              {games.filter(g => g.enabled).map((game, index) => {
                const info = gameInfoMap[game.slug] || gameInfoMap['reaction'];
                const Icon = info.icon || Play;
                const isAvailable = true; // since we filtered them
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    key={game.id} 
                    className={`relative overflow-hidden group transition-all duration-300 cursor-pointer hover:scale-[1.02]`}
                    onClick={() => startGame(game.slug)}
                  >
                    {/* Brutalist Card Background */}
                    <div className="absolute inset-0 bg-zinc-900 border-l-4 border-zinc-800 transition-colors group-hover:border-lime-400" />
                    
                    {/* Hover Slash Effect */}
                    <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-lime-400/10 to-transparent group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                    
                    <div className="relative p-6 md:p-8 flex items-center justify-between z-10">
                      <div className="flex items-center gap-6">
                        {/* Huge Index Number */}
                        <div className="text-4xl md:text-6xl font-black text-zinc-800 group-hover:text-lime-400 transition-colors w-16 text-center">
                          0{index + 1}
                        </div>
                        
                        <div>
                          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter mb-1 group-hover:text-white transition-colors">{game.name}</h3>
                          <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
                             <span className="flex items-center gap-1 text-cyan-400"><Icon size={14} /> {info.difficulty}</span>
                             <span>|</span>
                             <span>{info.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="hidden sm:flex flex-col items-end">
                        <div className="bg-lime-400 text-zinc-950 font-black uppercase text-xs px-3 py-1 animate-pulse">
                          Ready
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
        {view === 'game' && selectedGameId && playerId && (
          <GameEngine 
            key="game-engine"
            gameId={selectedGameId} 
            playerId={playerId}
            onExit={() => setView('selection')}
            onGameComplete={handleGameComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
