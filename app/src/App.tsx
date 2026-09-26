import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, LogIn, Activity, Settings, Users, Database, Trash2, Power, Menu, X, Trophy, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabase';
import type { Game } from '../../shared/types';
import ContentEditor from './ContentEditor';

export default function App() {
  const [session, setSession] = useState<boolean>(false);
  const [activeTab, setActiveTabInternal] = useState<'dashboard' | 'modules' | 'content' | 'players' | 'participants'>('dashboard');
  
  const setActiveTab = (tab: typeof activeTab) => {
    window.history.pushState({ tab }, '', `#${tab}`);
    setActiveTabInternal(tab);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        setActiveTabInternal(event.state.tab);
      } else {
        setActiveTabInternal('dashboard');
      }
    };
    
    window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  
  // Real state for metrics and players
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [players, setPlayers] = useState<any[]>([]); // Leaderboard rows (all scores)
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [awardPointsPlayer, setAwardPointsPlayer] = useState<any>(null);
  const [awardPointsForm, setAwardPointsForm] = useState({ gameId: '', newGameName: '', score: 0 });
  const [activeLbTab, setActiveLbTab] = useState<string>('overall');

  useEffect(() => {
    if (session) {
      fetchGames();
      fetchLeaderboard();
      fetchMetrics();
      fetchParticipants();

      // Supabase Realtime Subscription for Live Updates
      const channel = supabase
        .channel('public:scores')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
          fetchLeaderboard();
          fetchMetrics();
          fetchParticipants();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
          fetchMetrics();
          fetchParticipants();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
          fetchGames();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  // Update mechanism reverted

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('display_order');
    if (data) setGames(data as Game[]);
  };

  const fetchMetrics = async () => {
    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
    if (count !== null) setTotalPlayers(count);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (data) setParticipants(data);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('scores')
      .select(`
        id,
        score,
        player_id,
        game_id,
        players ( nickname, is_hidden ),
        games ( id, name )
      `)
      .order('score', { ascending: false });
      
    if (data) {
      const formattedPlayers = data.map((row: any) => ({
        id: row.id,
        player_id: row.player_id,
        nickname: row.players?.nickname || 'Unknown Player',
        is_hidden: row.players?.is_hidden || false,
        score: row.score,
        game_id: row.game_id,
        game: row.games?.name || 'Unknown Game'
      }));
      setPlayers(formattedPlayers);
    }
  };

  const clearLeaderboard = async () => {
    const confirmed = window.confirm("Are you sure you want to nuke all scores? This cannot be undone.");
    if (!confirmed) return;
    await supabase.from('scores').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
    fetchLeaderboard();
  };

  const deletePlayerScores = async (playerId: string, gameId?: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete scores for this player${gameId ? ' for this game' : ''}?`);
    if (!confirmed) return;
    
    let query = supabase.from('scores').delete().eq('player_id', playerId);
    if (gameId) {
      query = query.eq('game_id', gameId);
    }
    await query;
    fetchLeaderboard();
  };

  const toggleGameStatus = async (gameId: string, currentStatus: boolean) => {
    await supabase.from('games').update({ enabled: !currentStatus }).eq('id', gameId);
    fetchGames();
  };

  const toggleHidePlayer = async (playerId: string, currentHidden: boolean) => {
    await supabase.from('players').update({ is_hidden: !currentHidden }).eq('id', playerId);
    fetchParticipants();
    fetchLeaderboard();
  };

  const deletePlayer = async (playerId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this player and ALL their scores? This cannot be undone.");
    if (!confirmed) return;
    await supabase.from('players').delete().eq('id', playerId);
    fetchParticipants();
    fetchLeaderboard();
  };

  const awardPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardPointsPlayer || !awardPointsForm.gameId || awardPointsForm.score === 0) return;
    
    let targetGameId = awardPointsForm.gameId;

    if (targetGameId === 'NEW') {
      if (!awardPointsForm.newGameName.trim()) {
        window.alert('Please enter a name for the new game.');
        return;
      }
      const slug = awardPointsForm.newGameName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { data: newGame, error } = await supabase.from('games').insert({
        slug,
        name: awardPointsForm.newGameName.trim(),
        description: 'Custom event game (Manual Points)',
        enabled: false,
        display_order: 99
      }).select().single();

      if (error || !newGame) {
        console.error("Error creating new game:", error);
        window.alert('Failed to create new game.');
        return;
      }
      targetGameId = newGame.id;
      // Refresh the games list so it shows up later
      fetchGames();
    }

    await supabase.from('scores').insert({
      player_id: awardPointsPlayer.id,
      game_id: targetGameId,
      score: awardPointsForm.score,
      time_ms: 0,
      metadata: { note: 'Manually awarded by Admin' }
    });
    
    setAwardPointsPlayer(null);
    setAwardPointsForm({ gameId: '', newGameName: '', score: 0 });
    fetchLeaderboard();
    window.alert('Points awarded successfully!');
  };

  const getOverallLeaderboard = () => {
    const playerTotals: Record<string, any> = {};
    players.forEach(s => {
      const pId = s.player_id;
      if (!playerTotals[pId]) {
        playerTotals[pId] = { player_id: pId, nickname: s.nickname, is_hidden: s.is_hidden, totalScore: 0, game: 'OVERALL' };
      }
      playerTotals[pId].totalScore += s.score;
    });
    return Object.values(playerTotals).sort((a, b) => b.totalScore - a.totalScore);
  };

  const getGameLeaderboard = (gameId: string) => {
    const playerBestScores: Record<string, any> = {};
    players.filter(s => s.game_id === gameId).forEach(s => {
      const pId = s.player_id;
      if (!playerBestScores[pId]) {
        playerBestScores[pId] = { player_id: pId, nickname: s.nickname, is_hidden: s.is_hidden, score: s.score, game: s.game };
      } else if (s.score > playerBestScores[pId].score) {
        playerBestScores[pId].score = s.score;
      }
    });
    return Object.values(playerBestScores).sort((a, b) => b.score - a.score);
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-background relative overflow-hidden">
        {/* Glow behind login box */}
        <div className="absolute w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="w-full max-w-md admin-card items-center text-center relative z-10 p-10">
          <div className="p-4 bg-secondary/10 rounded-full mb-6">
            <Lock size={40} className="text-secondary" />
          </div>
          <h1 className="text-3xl font-black tracking-widest uppercase mb-2 text-white glow-text">
            Admin Access
          </h1>
          <p className="text-secondary font-mono text-sm mb-10 tracking-widest uppercase">PAPERLAB GAMES ARENA</p>
          
          <input 
            type="email" 
            placeholder="Event Staff Email" 
            className="w-full p-4 bg-black/50 border border-white/10 text-white font-mono focus:border-secondary outline-none rounded-lg transition-colors mb-4 placeholder:text-zinc-600" 
          />
          <input 
            type="password" 
            placeholder="Passcode" 
            className="w-full p-4 bg-black/50 border border-white/10 text-white font-mono focus:border-secondary outline-none rounded-lg transition-colors mb-8 placeholder:text-zinc-600" 
          />
          
          <button 
            className="btn-primary w-full flex justify-center items-center gap-3 py-4 text-lg"
            onClick={() => setSession(true)}
          >
            <LogIn size={20} /> Authorize System
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-background text-text overflow-hidden relative">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-surface z-40">
        <div className="text-primary font-black text-xl tracking-tighter">PL//ADMIN</div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed md:relative inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 w-72 glass-panel p-8 flex flex-col gap-4 font-mono text-sm uppercase shadow-2xl`}>
        <div className="hidden md:flex items-center gap-3 text-primary font-black text-2xl mb-12 tracking-tighter glow-text">
          <Database size={28} /> PL//ADMIN
        </div>
        
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Activity size={18} /> Dashboard
        </button>
        <button 
          onClick={() => { setActiveTab('modules'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'modules' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Power size={18} /> Game Modules
        </button>
        <button 
          onClick={() => { setActiveTab('content'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'content' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Database size={18} /> Game Content
        </button>
        <button 
          onClick={() => { setActiveTab('players'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'players' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Trophy size={18} /> Leaderboards
        </button>
        <button 
          onClick={() => { setActiveTab('participants'); setIsSidebarOpen(false); }}
          className={`flex items-center gap-3 transition-colors ${activeTab === 'participants' ? 'text-primary font-bold' : 'text-muted hover:text-white'}`}
        >
          <Users size={18} /> Participants
        </button>
        <button className="flex items-center gap-3 text-muted hover:text-white hover:bg-white/5 p-3 rounded-xl transition-all">
          <Settings size={18} /> Settings
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full relative z-0">
        <header className="mb-8 md:mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold uppercase tracking-widest mb-1 md:mb-2">
              {activeTab === 'dashboard' ? 'Operations Dashboard' : 
               activeTab === 'modules' ? 'Module Control' : 
               activeTab === 'content' ? 'Content Manager' : 'Player Management'}
            </h1>
            <p className="text-secondary font-mono">
              {activeTab === 'dashboard' ? 'Live Telemetry Active' : 
               activeTab === 'modules' ? 'Enable / Disable Games on Kiosk' : 
               activeTab === 'content' ? 'Configure Dynamic Game Assets' : 'Moderate Leaderboards and Ranks'}
            </p>
          </div>
          <button className="btn-secondary text-sm px-4 py-2" onClick={() => setSession(false)}>
            Lock Terminal
          </button>
        </header>

        <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="admin-card">
              <span className="text-muted font-mono text-xs">TOTAL PLAYERS</span>
              <div className="text-4xl font-bold">{totalPlayers}</div>
            </div>
            <div className="admin-card border-secondary">
              <span className="text-muted font-mono text-xs">ACTIVE DEVICES</span>
              <div className="text-4xl font-bold text-secondary">LIVE</div>
            </div>
            <div className="admin-card border-primary">
              <span className="text-muted font-mono text-xs">TELEMETRY</span>
              <div className="text-4xl font-bold text-primary flex items-center gap-2">
                 <span className="w-3 h-3 bg-lime-400 rounded-full animate-pulse"></span> ONLINE
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'modules' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map(game => (
              <div key={game.id} className="admin-card">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold uppercase">{game.name}</h3>
                  <button 
                    onClick={() => toggleGameStatus(game.id, game.enabled)}
                    className={`px-4 py-2 font-mono text-xs font-bold uppercase ${game.enabled ? 'bg-lime-400 text-black' : 'bg-red-500 text-white'}`}
                  >
                    {game.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <p className="text-muted text-sm">{game.description}</p>
              </div>
            ))}
            {games.length === 0 && <p className="text-muted">No games found in database.</p>}
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}>
            <ContentEditor />
          </motion.div>
        )}

        {activeTab === 'players' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="flex flex-col gap-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider">Leaderboard Moderation</h2>
              <button 
                onClick={clearLeaderboard}
                className="btn-secondary text-danger border-danger hover:border-danger hover:bg-danger hover:text-white flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Trash2 size={16} /> CLEAR ALL LEADERBOARDS
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-800 pb-4">
              <button 
                onClick={() => setActiveLbTab('overall')}
                className={`px-6 py-3 font-bold uppercase tracking-widest text-sm transition-colors ${activeLbTab === 'overall' ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
              >
                Overall
              </button>
              {games.map(g => (
                <button 
                  key={g.id}
                  onClick={() => setActiveLbTab(g.id)}
                  className={`px-6 py-3 font-bold uppercase tracking-widest text-sm transition-colors ${activeLbTab === g.id ? 'bg-lime-400 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="admin-card bg-gray-900/50 overflow-x-auto w-full max-w-full">
              <table className="w-full text-left font-mono text-sm min-w-[600px]">
                <thead className="text-muted border-b border-gray-800">
                  <tr>
                    <th className="pb-4 font-normal">RANK</th>
                    <th className="pb-4 font-normal">PLAYER NICKNAME</th>
                    <th className="pb-4 font-normal">GAME MODULE</th>
                    <th className="pb-4 font-normal">SCORE</th>
                    <th className="pb-4 font-normal text-right">MODERATE</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeLbTab === 'overall' ? getOverallLeaderboard() : getGameLeaderboard(activeLbTab)).map((p, idx) => (
                    <tr key={p.player_id} className={`border-b border-gray-800/50 hover:bg-surface transition-colors ${p.is_hidden ? 'opacity-50' : ''}`}>
                      <td className="py-4 font-bold text-zinc-500">#{idx + 1}</td>
                      <td className="py-4 font-bold text-white flex items-center gap-2">
                        {p.nickname} {p.is_hidden && <span className="px-2 py-1 bg-zinc-800 text-xs rounded text-zinc-400">HIDDEN</span>}
                      </td>
                      <td className="py-4 text-muted">{p.game}</td>
                      <td className="py-4 text-primary text-xl font-black">{activeLbTab === 'overall' ? p.totalScore : p.score}</td>
                      <td className="py-4 flex justify-end gap-3 text-muted">
                        <button 
                          className="hover:text-cyan-400" 
                          title={p.is_hidden ? "Show Player" : "Hide Player"}
                          onClick={() => toggleHidePlayer(p.player_id, p.is_hidden)}
                        >
                          {p.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button 
                          className="hover:text-danger" 
                          title="Delete Scores"
                          onClick={() => deletePlayerScores(p.player_id, activeLbTab === 'overall' ? undefined : activeLbTab)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'participants' && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}} className="flex flex-col gap-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold uppercase tracking-wider">All Participants</h2>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none focus:border-cyan-400 w-64 text-sm"
              />
            </div>
            
            <div className="admin-card bg-gray-900/50 overflow-x-auto w-full max-w-full">
              <table className="w-full text-left font-mono text-sm min-w-[600px]">
                <thead className="text-muted border-b border-gray-800">
                  <tr>
                    <th className="pb-4 font-normal">NICKNAME</th>
                    <th className="pb-4 font-normal">EMAIL</th>
                    <th className="pb-4 font-normal">COLLEGE</th>
                    <th className="pb-4 font-normal text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.filter(p => 
                    p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).map(p => (
                    <tr key={p.id} className={`border-b border-gray-800/50 hover:bg-surface transition-colors ${p.is_hidden ? 'opacity-50' : ''}`}>
                      <td className="py-4 font-bold text-white flex items-center gap-2">
                        {p.nickname} {p.is_hidden && <span className="px-2 py-1 bg-zinc-800 text-xs rounded text-zinc-400">HIDDEN</span>}
                      </td>
                      <td className="py-4 text-muted">{p.email || 'N/A'}</td>
                      <td className="py-4 text-muted">{p.college_name || 'N/A'}</td>
                      <td className="py-4 flex justify-end gap-3 text-muted">
                        <button 
                          className="px-3 py-1 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 rounded font-bold text-xs uppercase"
                          onClick={() => setAwardPointsPlayer(p)}
                        >
                          + Award Pts
                        </button>
                        <button 
                          className="hover:text-cyan-400" 
                          title={p.is_hidden ? "Show Player on Leaderboards" : "Hide Player from Leaderboards"}
                          onClick={() => toggleHidePlayer(p.id, p.is_hidden)}
                        >
                          {p.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button 
                          className="hover:text-danger" 
                          title="Delete Player & All Scores"
                          onClick={() => deletePlayer(p.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Award Points Modal */}
        {awardPointsPlayer && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="admin-card max-w-md w-full relative">
              <button 
                onClick={() => setAwardPointsPlayer(null)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold uppercase mb-2">Award Points</h2>
              <p className="text-muted text-sm mb-6">Awarding points to <span className="text-white font-bold">{awardPointsPlayer.nickname}</span></p>
              
              <form onSubmit={awardPoints} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-zinc-400">Select Game</label>
                  <select 
                    required
                    value={awardPointsForm.gameId}
                    onChange={e => setAwardPointsForm({...awardPointsForm, gameId: e.target.value})}
                    className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none"
                  >
                    <option value="">-- Choose Game --</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    <option value="NEW" className="font-bold text-lime-400">+ Create New Game...</option>
                  </select>
                </div>
                
                {awardPointsForm.gameId === 'NEW' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-mono uppercase text-zinc-400 text-lime-400">New Game Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Treasure Hunt Bonus"
                      value={awardPointsForm.newGameName}
                      onChange={e => setAwardPointsForm({...awardPointsForm, newGameName: e.target.value})}
                      className="p-3 bg-black/50 border border-lime-400/50 text-white font-mono rounded-lg outline-none focus:border-lime-400"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-mono uppercase text-zinc-400">Points to Award</label>
                  <input 
                    type="number" 
                    required
                    value={awardPointsForm.score}
                    onChange={e => setAwardPointsForm({...awardPointsForm, score: Number(e.target.value)})}
                    className="p-3 bg-black/50 border border-white/10 text-white font-mono rounded-lg outline-none"
                  />
                </div>
                <button type="submit" className="btn-primary mt-4 py-3">Award Points</button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
